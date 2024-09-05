// app/indexes/[id]/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

type Index = {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  createdAt: string;
};

type Document = {
  id: string;
  content: string;
  metadata: string;
};

const IndexDetailsPage = () => {
  const [indexDetails, setIndexDetails] = useState<Index | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const { id } = router.query; // Obtener el ID del índice desde la URL

  useEffect(() => {
    if (id) {
      fetchIndexDetails(id as string);
    }
  }, [id]);

  const fetchIndexDetails = async (indexId: string) => {
    try {
      const res = await fetch(`/api/indexes/${indexId}`);
      if (!res.ok) {
        throw new Error("Error al obtener los detalles del índice.");
      }
      const data = await res.json();
      setIndexDetails(data.index);
      setDocuments(data.documents); // Suponiendo que los documentos vienen en la misma respuesta
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Cargando detalles del índice...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!indexDetails) {
    return <div>No se encontró el índice.</div>;
  }

  return (
    <div className="index-details-page">
      <h1 className="text-2xl font-bold mb-4">{indexDetails.name}</h1>
      <p className="text-gray-700 mb-4">{indexDetails.description}</p>
      <p className="mb-4">Documentos: {indexDetails.documentCount}</p>
      <p className="mb-4">
        Creado el: {new Date(indexDetails.createdAt).toLocaleDateString()}
      </p>

      <Link href={`/indexes/${indexDetails.id}/query`}>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 mb-6 rounded">
          Consultar Índice
        </button>
      </Link>

      <h2 className="text-xl font-bold mb-4">Documentos en este Índice</h2>
      {documents.length > 0 ? (
        <table className="min-w-full border-collapse block md:table">
          <thead>
            <tr className="border-b">
              <th className="p-4 text-left">ID</th>
              <th className="p-4 text-left">Contenido</th>
              <th className="p-4 text-left">Metadatos</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-b">
                <td className="p-4">{doc.id}</td>
                <td className="p-4">{doc.content}</td>
                <td className="p-4">{doc.metadata}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div>No hay documentos en este índice.</div>
      )}
    </div>
  );
};

export default IndexDetailsPage;
