// app/dashboard/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

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

  const router = useRouter();

  // Función para obtener los índices desde la API
  useEffect(() => {
    const fetchIndexes = async () => {
      try {
        const response = await fetch("/api/indexes");
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
                  <Link href={`/indexes/${index.id}`}>
                    <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded">
                      Ver
                    </button>
                  </Link>
                  <button
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 ml-2 rounded"
                    onClick={() => handleDelete(index.id)}
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
    </div>
  );

  // Función para eliminar un índice
  async function handleDelete(id: string) {
    if (confirm("¿Estás seguro de que quieres eliminar este índice?")) {
      try {
        const response = await fetch(`/api/indexes/${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          setIndexes((prev) => prev.filter((index) => index.id !== id));
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
