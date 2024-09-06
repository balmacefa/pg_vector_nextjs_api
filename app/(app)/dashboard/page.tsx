// app/dashboard/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { delete_index_by_id } from "../api/v1/index/db";

// Tipo para los datos de un índice
type Index = {
  id: string;
  name: string;
  description: string;
  documentCount: number;
  createdAt: string;
};

// Componente principal de la página del dashboard
const DashboardPage = () => {
  const [indexes, setIndexes] = useState<Index[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteIndex, setDeleteIndex] = useState<Index | null>(null);
  const [confirmName, setConfirmName] = useState<string>("");

  // Función para obtener los índices desde la API
  useEffect(() => {
    const fetchIndexes = async () => {
      try {
        const response = await fetch("/api/v1/index");
        const data = await response.json();

        if (response.ok) {
          setIndexes(data);
        } else {
          setError(data.message || "Error al obtener los índices.");
        }
      } catch (error) {
        setError("Error al conectar con la API.");
      } finally {
        setLoading(false);
      }
    };

    fetchIndexes();
  }, []);

  if (loading) {
    return <div>Cargando índices...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="dashboard-page">
      <h1 className="text-2xl font-bold mb-4">Lista de Índices</h1>

      <div className="flex justify-end mb-4">
        <Link href="/indexes/create">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Crear Nuevo Índice
          </button>
        </Link>
      </div>

      {indexes.length > 0 ? (
        <table className="min-w-full border-collapse block md:table">
          <thead>
            <tr className="border-b">
              <th className="p-4 text-left">Nombre</th>
              <th className="p-4 text-left">Descripción</th>
              <th className="p-4 text-left">Documentos</th>
              <th className="p-4 text-left">Fecha de Creación</th>
              <th className="p-4 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {indexes.map((index) => (
              <tr key={index.id} className="border-b">
                <td className="p-4">{index.name}</td>
                <td className="p-4">{index.description}</td>
                <td className="p-4">{index.documentCount}</td>
                <td className="p-4">
                  {new Date(index.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4">
                  <Link href={`/index/${index.id}`}>
                    <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded">
                      Ver
                    </button>
                  </Link>
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 ml-2 rounded"
                    onClick={() => setDeleteIndex(index)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div>No hay índices creados.</div>
      )}

      {/* Modal para confirmar eliminación */}
      {deleteIndex && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold mb-4">
                Eliminar Índice:{" "}
                <span className="text-gray-600">{deleteIndex.name}</span>
              </h2>
              <p className="mb-4">
                Para confirmar la eliminación, escribe el nombre del índice:
                <strong className="my-2"> {deleteIndex.name}</strong>
              </p>
              <input
                type="text"
                className="border p-2 w-full mb-4"
                placeholder={`Escribe "${deleteIndex.name}" para confirmar`}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded mr-2"
                  onClick={() => closeModal()}
                >
                  Cancelar
                </button>
                <button
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                  onClick={() => handleDelete(deleteIndex.id, deleteIndex.name)}
                  disabled={confirmName !== deleteIndex.name}
                >
                  Confirmar eliminación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Función para cerrar el modal
  function closeModal() {
    setDeleteIndex(null);
    setConfirmName("");
  }

  // Función para eliminar un índice
  async function handleDelete(id: string, name: string) {
    if (confirmName === name) {
      try {
        const response = await delete_index_by_id(id);
        if (response) {
          setIndexes((prev) => prev.filter((index) => index.id !== id));
          closeModal(); // Cerrar el modal después de eliminar
        } else {
          setError("No se pudo eliminar el índice.");
        }
      } catch (error) {
        setError("Error al conectar con la API.");
      }
    }
  }
};

export default DashboardPage;
