import {
    DistanceStrategy,
    PGVectorStore,
} from "@langchain/community/vectorstores/pgvector";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pool } from "pg";

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

const embeddingFunction = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY as string,
    model: "text-embedding-3-small"
})


let _clientStore: PGVectorStore | undefined = undefined;
export async function get_coll(): Promise<PGVectorStore> {

    try {
        if (!_clientStore) {

            _clientStore = await PGVectorStore.initialize(embeddingFunction, {
                pool: pg_pool,
                tableName: pg_indexName,
                columns: {
                    idColumnName: "id",
                    vectorColumnName: "vector",
                    contentColumnName: "content",
                    metadataColumnName: "metadata",
                },
                // supported distance strategies: cosine (default), innerProduct, or euclidean
                distanceStrategy: "cosine" as DistanceStrategy,
            });

            // create the index
            await _clientStore.createHnswIndex({
                dimensions: 1536,
                efConstruction: 64,
                m: 16,
            });

        }
        return _clientStore;

    } catch (error) {
        console.error(error);
        throw error;
    }

}


export const removeDocumentsByQuery = async (doc_id: string): Promise<number> => {
    try {

        await (await get_coll()).delete({
            filter: {
                'doc_id': doc_id
            }
        });

        return 0;
    } catch (error) {
        console.error(error);
        throw error;
    }
}
export const documento_loader_and_indexer = async (incoming_doc: ArchivoDocumento, payload: BasePayload) => {
    try {

        if (!payload) {
            payload = await getPayload({
                config: configs,
            });
        }

        const splitter = new TokenTextSplitter({
            chunkSize: 800,
            chunkOverlap: 400,
        });

        if (incoming_doc.document_type === 'pdf' && incoming_doc.media_file) {

            let media_file: ArchivoDocumentosMediaFile;
            if (typeof incoming_doc.media_file === 'string') {

                media_file = await payload.findByID({
                    collection: SLUGS.archivo_documentos_media_files,
                    id: (incoming_doc.media_file as string),
                });

            } else {
                media_file = incoming_doc.media_file
            }

            if (media_file.mimeType === MediaCollection_pdf_type) {

                const file_url = (process.env.Logto_baseUrl as string) + media_file.url as string;
                // Fetch the file from a remote server
                const response = await fetch(file_url);
                const buffer = Buffer.from(await response.arrayBuffer());

                // Generate a temporary file path
                const tmpDir = os.tmpdir();
                const tmpFilePath = path.join(tmpDir, `${Date.now()}-${path.basename(file_url)}`);

                let loader: PDFLoader;

                try {
                    // Save the buffer to the temporary file
                    await fs.writeFile(tmpFilePath, buffer);
                    loader = new PDFLoader(tmpFilePath);



                    const docs = await loader.load();
                    const mini_docs: Document[] = await splitter.splitDocuments(docs);

                    for (let j = 0; j < mini_docs.length; j++) {
                        const mini_metadata = {
                            ...mini_docs[j].metadata,
                            ...omit(incoming_doc, ['html_text', 'media_file', 'updatedAt', 'createdAt']),
                            doc_id: incoming_doc.id,
                            target_collection: SLUGS.archivo_documentos
                        }
                        //set metadata
                        mini_docs[j].metadata = mini_metadata;
                        mini_docs[j].id = `doc:${pg_indexName}:${incoming_doc.id}:${j}`
                    }

                    const r = await (await get_coll()).addDocuments(mini_docs);

                    console.log('doc Splitted', r);

                } catch (error) {
                    throw error
                }
                finally {
                    // Clean up: Remove the temporary file
                    await fs.unlink(tmpFilePath);
                    console.log(`Temporary file ${tmpFilePath} removed`);
                }

            }
        }

        if ((incoming_doc.document_type === 'html_text' || incoming_doc.document_type === 'html_docx') && incoming_doc.html_text) {
            const pageContent = incoming_doc.html_text;
            const docs = [new Document({
                pageContent: pageContent,
                metadata: {
                    ...omit(incoming_doc, ['html_text', 'media_file', 'updatedAt', 'createdAt']),
                    doc_id: incoming_doc.id,
                    target_collection: SLUGS.archivo_documentos
                }
            })];

            const mini_docs = await splitter.splitDocuments(docs);

            for (let j = 0; j < mini_docs.length; j++) {
                const { charAt_from: from, charAt_to: to } = findChatLocation(incoming_doc.html_text, mini_docs[j].pageContent);

                mini_docs[j].metadata.char_at_loc = {
                    from,
                    to
                };

                mini_docs[j].id = `doc:${pg_indexName}:${incoming_doc.id}:${j}`;
            }

            const r = await (await get_coll()).addDocuments(mini_docs);

            console.log('doc Splitted', r);
        }

        return true;
    } catch (error) {
        payload.logger.error('save_collection_property_indexer_pair', { error });
        return false;
    }
}

// Utility function to find from and to

function findChatLocation(originalText: string, content: string) {
    const charAt_from = originalText.indexOf(content);
    const charAt_to = charAt_from + content.length;

    if (charAt_from === -1) {
        return findBestMatch(originalText, content);
    }

    return { charAt_from, charAt_to };
}

// Importar la librería

function findBestMatch(originalText: string, content: string, overlapWords: number = 10): { charAt_from: number, charAt_to: number } {
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

    return { charAt_from, charAt_to };
}


type libros_buscador_PDF_json_type = {
    document_type: 'pdf';
    href: string;
    book_title: string;
    book_id: string;
    content: string;
    href_label: string;
}

type libros_buscador_HTML_json_type = {
    document_type: 'html';
    href_label: string;
    href: string;
    html_title: string;
    html_id: string;
    content: string;
}

type libros_buscador_json_type = libros_buscador_PDF_json_type | libros_buscador_HTML_json_type;

export const libros_buscador_json = async (query_data: {
    query: string
},
    where?: any, ReRankingDocuments?: boolean) => {
    const {
        query
    } = query_data;

    const k = 50;


    let results: Document[] = await (await get_coll()).similaritySearch(query, k, where);



    if (ReRankingDocuments) {

        results = await ReRankingDocumentsFN({
            docs: results,
            query: query
        });
    }

    const host = process.env.Logto_baseUrl;
    const docs: libros_buscador_json_type[] = [];

    for (let i = 0; i < results.length; i++) {
        const hit = results[i];

        if (hit.metadata.document_type === 'pdf') {
            docs.push({
                document_type: 'pdf',
                book_id: hit.metadata.id,
                href_label: `${hit.metadata.title} - Página ${hit.metadata.loc.pageNumber}`,
                href: `${host}/ArchivoDocumento/pdf/${hit.metadata.id}?page=${hit.metadata.loc.pageNumber}`,
                book_title: `${hit.metadata.title}`,
                content: hit.pageContent,
            });
        } else {
            docs.push({
                document_type: 'html',
                html_id: hit.metadata.id,
                href_label: `${hit.metadata.title} - Posición ${hit.metadata.char_at_loc.from}:${hit.metadata.char_at_loc.to}`,
                href: `${host}/ArchivoDocumento/html/${hit.metadata.id}?pos_from=${hit.metadata.char_at_loc.from}&pos_to=${hit.metadata.char_at_loc.to}`,
                html_title: `${hit.metadata.title}`,
                content: hit.pageContent,
            });
        }
    }


    return docs;
}


let _cohere: CohereClient | undefined = undefined;
async function InitReRankingSystem() {
    if (!_cohere) {
        if (!process.env.COHERE_API_KEY) {
            throw new Error("COHERE_API_KEY is not defined")
        }

        _cohere = new CohereClient({
            token: process.env.COHERE_API_KEY
        });
    }

    return _cohere;
}
export async function ReRankingDocumentsFN(args:
    {
        docs: Document[],
        query: string,
    }
): Promise<Document[]> {


    const cohere: CohereClient = await InitReRankingSystem();


    const docs = args.docs.map((doc) => {
        return {
            text: doc.pageContent,
        }
    });



    const rerank = await cohere.rerank({
        documents: docs,
        query: args.query,
        returnDocuments: false,
    });
    const docs_reranked: Document[] = [];
    rerank.results.forEach((result) => {
        /** The index of the input document */
        // console.log(result);
        // { index: 6, relevanceScore: 0.9984269 }
        // { index: 8, relevanceScore: 0.9984269 }
        // { index: 18, relevanceScore: 0.9984269 }
        // { index: 23, relevanceScore: 0.9984269 }
        // { index: 24, relevanceScore: 0.9984269 }
        const index = result.index;
        docs_reranked.push(args.docs[index]);
    });

    return docs_reranked;
}



export async function getPDFContentByPageRanges(args: {
    page_ranges: string[],
    book_id: string
}) {

    const { book_id, page_ranges } = args;

    const payload = await getPayload({ config: configs });

    const book_info = await payload.findByID({
        collection: SLUGS.archivo_documentos,
        id: book_id as string,
        depth: 2
    });

    if (book_info.document_type !== 'pdf') {
        throw new Error('Esta Herramienta solo funciona con documentos PDF, y este documento es del tipo:' + book_info.document_type);
    }






    const file_url: string = (process.env.Logto_baseUrl as string) + (book_info.media_file as ArchivoDocumentosMediaFile).url as string;
    // Fetch the file from a remote server
    const response = await fetch(file_url);
    const buffer = Buffer.from(await response.arrayBuffer());

    // Generate a temporary file path
    const tmpDir = os.tmpdir();
    const tmpFilePath = path.join(tmpDir, `${Date.now()}-${path.basename(file_url)}`);


    try {
        // Save the buffer to the temporary file
        await ffs.writeFile(tmpFilePath, buffer);



        const loader = new PDFLoader(tmpFilePath);
        const docs = await loader.load();


        // Transformar los rangos de páginas a un array de números
        const pages: number[] = page_ranges.flatMap(range => {
            if (range.includes('-')) {
                const [start, end] = range.split('-').map(Number);
                // Devolvemos un array con todas las páginas en el rango
                return start < end ?
                    Array.from({ length: end - start + 1 }, (_, i) => start + i) :
                    Array.from({ length: start - end + 1 }, (_, i) => start - i);
            }
            return [parseInt(range)];
        });

        const respoonse: libros_buscador_PDF_json_type[] = [];

        const host = process.env.Logto_baseUrl;

        // Extraer el contenido de las páginas
        docs.forEach((hit) => {
            if (pages.includes(hit.metadata.loc.pageNumber)) {
                respoonse.push({
                    book_id: book_info.id,
                    href_label: `${book_info.title} - Página ${hit.metadata.loc.pageNumber}`,
                    href: `${host}/ArchivoDocumento/${book_info.id}?page=${hit.metadata.loc.pageNumber}`,
                    book_title: `${book_info.title}`,
                    content: `${hit.pageContent}`,
                    document_type: "pdf"
                });
            }
        });




        return respoonse;
        // do stuff




    } catch (error) {
        throw error
    }
    finally {
        // Clean up: Remove the temporary file
        await ffs.unlink(tmpFilePath);
        console.log(`Temporary file ${tmpFilePath} removed`);
    }
}


export async function getHTMLContentByPosition_fn(args: {
    html_id: string,
    pos_from: number,
    pos_to: number
}) {

    const { html_id, pos_from, pos_to } = args;

    // Obtén el payload, si es necesario en tu contexto
    const payload = await getPayload({ config: configs });

    // Busca el contenido HTML por ID
    const html_info = await payload.findByID({
        collection: SLUGS.archivo_documentos,
        id: html_id as string,
        depth: 2
    });

    // Verifica que el documento sea de tipo HTML
    if (!['html_docx', 'html_text'].includes(html_info.document_type)) {
        throw new Error('Esta herramienta solo funciona con documentos HTML, y este documento es del tipo: ' + html_info.document_type);
    }

    // Asumimos que el contenido del archivo HTML está disponible como una cadena de texto en html_info.content
    const htmlContent = html_info.html_text as string;

    // Asegura que pos_from sea mayor o igual a 0
    if (pos_from < 0) {
        throw new Error('La posición "from" no puede ser negativa.');
    }

    // Si pos_to es mayor que la longitud del contenido, lo ajustamos al final del contenido
    const clampedPosTo = Math.min(pos_to, htmlContent.length);

    // Verifica que pos_from sea menor que clampedPosTo
    if (pos_from >= clampedPosTo) {
        throw new Error('La posición "from" debe ser menor que "to" después de clamping.');
    }

    // Extrae el subscript entre las posiciones dadas
    const extractedContent = htmlContent.substring(pos_from, clampedPosTo);
    const host = process.env.Logto_baseUrl;

    // Prepara la respuesta
    const response = {
        html_id: html_info.id,
        href_label: `${html_info.title} - Posición ${pos_from}:${clampedPosTo}`,
        href: `${host}/ArchivoDocumento/html/${html_info.id}?pos_from=${pos_from}&pos_to=${clampedPosTo}`,
        html_title: `${html_info.title}`,
        content: extractedContent,
        document_type: "html"
    };

    return response;
}



async function fetchDocumentDataByDocId(doc_id: string) {
    const query = `
        SELECT id, content, metadata
        FROM public.${indexName}
        WHERE metadata->>'doc_id' = '${doc_id}';
    `;

    try {
        const result = await pg_pool.query(query);
        return result.rows;
    } catch (err) {
        console.error('Error fetching document data:', err);
        throw err;
    }
}

async function updateMetadataWithChatLocation(doc_id: string, documentId: string, charAt_from: number, charAt_to: number) {
    const query = `
        UPDATE public.${indexName}
        SET metadata = jsonb_set(
            metadata,
            '{char_at_loc}',
            jsonb_build_object('from', ${charAt_from}, 'to', ${charAt_to}),
            true
        )
        WHERE metadata->>'doc_id' = '${doc_id}' AND id = '${documentId}';
    `;

    try {
        const result = await pg_pool.query(query);

        if (result.rowCount !== 1) {
            throw new Error(`Expected to update 1 record, but updated ${result.rowCount} records for doc_id = ${doc_id} and documentId = ${documentId}`);
        }

        console.log(`Metadata chat_at_loc updated for doc_id = ${doc_id} and documentId = ${documentId}`);
    } catch (err) {
        console.error('Error updating metadata chat_at_loc:', err);
        throw err;
    }
}

