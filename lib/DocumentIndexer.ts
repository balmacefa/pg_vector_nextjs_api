import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import {
    DistanceStrategy,
    PGVectorStore
} from "@langchain/community/vectorstores/pgvector";
import { OpenAIEmbeddings } from "@langchain/openai";
import fs from 'fs/promises';
import { Document } from "langchain/document";
import { TokenTextSplitter } from "langchain/text_splitter";
import mammoth from 'mammoth';
import os from 'os';
import path from 'path';
import { Pool } from "pg";
import prettier from 'prettier';
import stringSimilarity from 'string-similarity';



export const pg_indexName: string = "search_index_documents_vector_index";
export const pg_user_my_documents_indexName: string = "search_index_user_my_documents_vector_index";
export const pg_youtube_indexName: string = "search_index_youtube_vector_index";


export const pg_pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT as string),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
});

export class DocumentIndexer {
    private _clientStore: PGVectorStore | undefined;
    private indexName: string;
    embeddingFunction: OpenAIEmbeddings;
    private refIdKey = 'ref_id' as const;

    splitter = new TokenTextSplitter({ chunkSize: 800, chunkOverlap: 400 });

    constructor(private pgPool: Pool, indexName: string) {
        this.indexName = indexName;
        this.embeddingFunction = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY as string,
            model: "text-embedding-3-small"
        })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async loadAndIndexText(ref_id: string, pageContent: string, metadata: any): Promise<boolean> {
        try {
            if (!metadata[this.refIdKey]) {
                metadata[this.refIdKey] = ref_id
            }
            const docs = [new Document({ pageContent, metadata })];
            await this.indexDocuments(docs);


            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async loadAndIndexPDF(ref_id: string, fileUrl: string, metadata: any): Promise<boolean> {

        const tmpFilePath = await this.downLoadFile(fileUrl);
        try {
            const loader = new PDFLoader(tmpFilePath);
            const docs = (await loader.load());

            if (metadata) {
                docs.forEach(e => e.metadata = {
                    ...e.metadata,
                    ...metadata,
                    [this.refIdKey]: ref_id
                })
            }
            await this.indexDocuments(docs);
            return true;
        } catch (error) {

            return false;
        }
        finally {
            await fs.unlink(tmpFilePath);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async loadAndIndexDocX(ref_id: string, fileUrl: string, metadata: any): Promise<boolean> {

        const tmpFilePath = await this.downLoadFile(fileUrl);
        try {


            // Convert DOCX to HTML using the temporary file path
            const html_text: string = (await mammoth.convertToHtml({ path: tmpFilePath })).value;

            const formattedHtml: string = await prettier.format(html_text, { parser: "html" });

            const docs = [new Document({
                pageContent: formattedHtml,
                metadata: {
                    [this.refIdKey]: ref_id,
                    ...metadata
                }
            })];



            const mini_docs = await this.splitter.splitDocuments(docs);

            for (let j = 0; j < mini_docs.length; j++) {

                mini_docs[j].metadata.char_at_loc = this.findChatLocation(formattedHtml, mini_docs[j].pageContent);
            }


            await this.indexDocuments(docs);
            return true;
        } catch (error) {

            return false;
        }
        finally {
            await fs.unlink(tmpFilePath);
        }
    }

    async removeDocumentById(refId: string): Promise<number> {
        try {
            const store = await this.getCollection();
            await store.delete({ filter: { [this.refIdKey]: refId } });
            return 0;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }



    // Función para hacer merge del metadato actual con el nuevo metadato
    async updateMetadataMerge(documentId: string, newMetadata: object) {
        const query = `
            UPDATE public.${this.indexName}
            SET metadata = metadata || $1::jsonb
            WHERE metadata->>'${this.refIdKey}' = '${documentId}';
        `;

        try {
            const result = await this.pgPool.query(query, [JSON.stringify(newMetadata)]);

            if (result.rowCount !== 1) {
                throw new Error(`Expected to update 1 record, but updated ${result.rowCount} records for ${this.refIdKey} and documentId = ${documentId}`);
            }

            console.log(`Metadata merged for ${this.refIdKey} and documentId = ${documentId}`);
        } catch (err) {
            console.error('Error merging metadata:', err);
            throw err;
        }
    }

    // Función para reemplazar completamente los metadatos
    async replaceMetadata(documentId: string, newMetadata: object) {
        const query = `
            UPDATE public.${this.indexName}
            SET metadata = $1::jsonb
            WHERE metadata->>'${this.refIdKey}' = '${documentId}';
        `;

        try {
            const result = await this.pgPool.query(query, [JSON.stringify(newMetadata)]);

            if (result.rowCount !== 1) {
                throw new Error(`Expected to update 1 record, but updated ${result.rowCount} records for ${this.refIdKey} and documentId = ${documentId}`);
            }

            console.log(`Metadata replaced for ${this.refIdKey} and documentId = ${documentId}`);
        } catch (err) {
            console.error('Error replacing metadata:', err);
            throw err;
        }
    }








    async getCollection(): Promise<PGVectorStore> {
        if (!this._clientStore) {
            this._clientStore = await PGVectorStore.initialize(this.embeddingFunction, {
                pool: this.pgPool,
                tableName: this.indexName,
                columns: {
                    idColumnName: "id",
                    vectorColumnName: "vector",
                    contentColumnName: "content",
                    metadataColumnName: "metadata",
                },
                distanceStrategy: "cosine" as DistanceStrategy,
            });

            await this._clientStore.createHnswIndex({
                dimensions: 1536,
                efConstruction: 64,
                m: 16,
            });
        }
        return this._clientStore;
    }


    private async indexDocuments(docs: Document[]) {
        const miniDocs = await this.splitter.splitDocuments(docs);
        await (await this.getCollection()).addDocuments(miniDocs);
    }


    private async downLoadFile(fileUrl: string) {

        const buffer = await (await fetch(fileUrl)).arrayBuffer();
        const tmpFilePath = await this.createTemporaryFile(buffer, fileUrl);

        return tmpFilePath;
    }

    private async createTemporaryFile(buffer: ArrayBuffer, fileUrl: string): Promise<string> {
        const tmpDir = os.tmpdir();
        const tmpFilePath = path.join(tmpDir, `${Date.now()}-${path.basename(fileUrl)}`);
        await fs.writeFile(tmpFilePath, Buffer.from(buffer));
        return tmpFilePath;
    }





    findChatLocation(originalText: string, content: string) {
        const charAt_from = originalText.indexOf(content);
        const charAt_to = charAt_from + content.length;
        let char_at_loc = { from: charAt_from, to: charAt_to, aproximated: false };

        if (charAt_from === -1) {
            char_at_loc = this.findBestMatch(originalText, content);
            char_at_loc.aproximated = true;
        }


        return char_at_loc;
    }

    // Importar la librería

    findBestMatch(originalText: string, content: string, overlapWords: number = 10): { from: number, to: number, aproximated: boolean } {
        let bestMatch = {
            score: 0,
            index: -1,
        };

        // Convertir el número de palabras de overlap a un número de caracteres aproximado
        const words = originalText.split(/\s+/);
        const averageWordLength = originalText.length / words.length;
        const overlap = Math.floor(overlapWords * averageWordLength);

        const step = Math.max(1, content.length - overlap);

        for (let i = 0; i <= originalText.length - content.length; i += step) {
            const candidate = originalText.substring(i, i + content.length);
            const similarity = stringSimilarity.compareTwoStrings(candidate, content);

            if (similarity > bestMatch.score) {
                bestMatch = {
                    score: similarity,
                    index: i,
                };
            }
        }

        if (bestMatch.index === -1) {
            throw new Error("No similar content found in original text.");
        }

        const charAt_from = bestMatch.index;
        const charAt_to = charAt_from + content.length;

        // Imprimir los resultados
        const bestMatchSubstring = originalText.substring(charAt_from, charAt_to);
        console.log("Original Text Substring: ", bestMatchSubstring);
        console.log("Content: ", content);

        return { from: charAt_from, to: charAt_to, aproximated: true };
    }


}
