// app/indexes/[id]/query.tsx
"use client";

import { useRouter } from "next/router";
import React, { useState } from "react";

// Tipos para los datos de un índice y los resultados de la consulta
type QueryResult = {
  id: string;
  content: string;
  metadata: Record<string, any>;
};

const IndexQueryPage = () => {
  const [queryText, setQueryText] = useState<string>(""); // Texto del input de consulta
  const [whereClause, setWhereClause] = useState<string>(""); // Filtro WHERE SQL
  const [results, setResults] = useState<QueryResult[]>([]); // Resultados de la consulta
  const [page, setPage] = useState<number>(1); // Número de página para la paginación
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState<number>(0); // Total de resultados

  const router = useRouter();
  const { id } = router.query; // Obtener el ID del índice desde la URL

  // Función para realizar la consulta en el índice
  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/indexes/${id}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: queryText,
          where: whereClause,
          page,
          limit: 100,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results);
        setTotalResults(data.total);
      } else {
        setError(data.message || "Error al realizar la consulta.");
      }
    } catch (err) {
      setError("Error al conectar con la API.");
    } finally {
      setLoading(false);
    }
  };

  // Función para cambiar la página en la paginación
  const handlePageChange = (newPage: number) => {
    // setPage(newPage);
    // handleQuery(newPage); // Realizar la consulta nuevamente con la nueva página
  };

  return (
    <div className="index-query-page">
      <h1 className="text-2xl font-bold mb-4">Consultar Índice {id}</h1>

      <form onSubmit={handleQuery} className="mb-4">
        <div className="mb-4">
          <label htmlFor="queryText" className="block text-sm font-medium">
            Consulta de Texto
          </label>
          <input
            type="text"
            id="queryText"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded"
            placeholder="Introduce el texto de la consulta"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="whereClause" className="block text-sm font-medium">
            Filtro (SQL WHERE)
          </label>
          <input
            type="text"
            id="whereClause"
            value={whereClause}
            onChange={(e) => setWhereClause(e.target.value)}
            className="mt-1 block w-full p-2 border border-gray-300 rounded"
            placeholder="Ejemplo: category = 'science'"
          />
        </div>

        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Buscar
        </button>
      </form>

      {loading && <div>Cargando resultados...</div>}
      {error && <div className="text-red-500">{error}</div>}

      {results.length > 0 ? (
        <>
          <table className="min-w-full border-collapse block md:table mt-4">
            <thead>
              <tr className="border-b">
                <th className="p-4 text-left">ID</th>
                <th className="p-4 text-left">Contenido</th>
                <th className="p-4 text-left">Metadatos</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.id} className="border-b">
                  <td className="p-4">{result.id}</td>
                  <td className="p-4">{result.content}</td>
                  <td className="p-4">{JSON.stringify(result.metadata)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between mt-4">
            <button
              className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              Anterior
            </button>

            <div>Página {page}</div>

            <button
              className="bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded"
              onClick={() => handlePageChange(page + 1)}
              disabled={results.length < 100}
            >
              Siguiente
            </button>
          </div>
        </>
      ) : (
        !loading && <div>No se encontraron resultados.</div>
      )}
    </div>
  );
};

export default IndexQueryPage;
