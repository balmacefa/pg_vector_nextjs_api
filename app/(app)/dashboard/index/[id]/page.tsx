import { get_index_by_id } from "@/app/(app)/api/v1/index/db";
import { notFound } from "next/navigation";

// Componente de la página del índice
export default async function IndexDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  // Obtener el índice del servidor
  const index = await get_index_by_id(id);

  if (!index) {
    notFound(); // Redirige a una página de 404 si no se encuentra el índice
  }

  return (
    <div className="index-detail-page">
      <h1 className="text-2xl font-bold mb-4">Detalles del Índice</h1>
      <div className="border p-4 rounded shadow-md">
        <p>
          <strong>Nombre: </strong> {index.name}
        </p>
        <p>
          <strong>Descripción: </strong> {index.description}
        </p>
        <p>
          <strong>Número de Documentos: </strong> {index.documentCount}
        </p>
        <p>
          <strong>Fecha de Creación: </strong>{" "}
          {new Date(index.createdAt).toLocaleDateString()}
        </p>
      </div>
      <a
        href="/dashboard"
        className="mt-4 inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Volver al Dashboard
      </a>
    </div>
  );
}
