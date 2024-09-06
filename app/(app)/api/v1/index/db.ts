

export type IndexResponseData = {
    id: string;
    name: string;
    description: string;
    documentCount: number;
    createdAt: string;
}


export const sample_db_index: IndexResponseData[] =
    [
        {
            "id": "b6d5d9e6-7d22-4a3b-bf48-9d203ef7c8b5",
            "name": "Document-45",
            "description": "Sample description for document 88",
            "documentCount": 18,
            "createdAt": "2023-03-15T12:34:56"
        },
        {
            "id": "c4f7c567-e1bd-41e8-b8b1-d1d9c1d48e42",
            "name": "Document-12",
            "description": "Sample description for document 25",
            "documentCount": 9,
            "createdAt": "2024-01-05T09:20:11"
        },
        {
            "id": "b0fa35d6-c75a-4ab5-8dbe-9dc33ebf5dc2",
            "name": "Document-76",
            "description": "Sample description for document 64",
            "documentCount": 11,
            "createdAt": "2022-11-22T17:46:29"
        },
        {
            "id": "db1b5931-5660-4b89-b8c2-e17d7b1c33fe",
            "name": "Document-34",
            "description": "Sample description for document 56",
            "documentCount": 3,
            "createdAt": "2024-08-30T11:30:12"
        },
        {
            "id": "e95cda38-8f58-4d33-b917-1f9dd98f51a9",
            "name": "Document-87",
            "description": "Sample description for document 41",
            "documentCount": 16,
            "createdAt": "2023-06-14T08:45:36"
        },
        {
            "id": "bdac9057-5360-4a2f-b084-605db8164569",
            "name": "Document-21",
            "description": "Sample description for document 13",
            "documentCount": 7,
            "createdAt": "2023-09-12T15:02:48"
        },
        {
            "id": "d7a9f317-d8bb-4d69-9cf6-05e5227d9f0c",
            "name": "Document-59",
            "description": "Sample description for document 34",
            "documentCount": 4,
            "createdAt": "2023-07-20T14:18:25"
        },
        {
            "id": "37a1dafe-f1a1-4ac3-800d-03cb4a892cdb",
            "name": "Document-94",
            "description": "Sample description for document 72",
            "documentCount": 10,
            "createdAt": "2023-11-03T10:50:12"
        },
        {
            "id": "8b7b8916-b715-4c41-b635-d61b7f9ea768",
            "name": "Document-53",
            "description": "Sample description for document 5",
            "documentCount": 6,
            "createdAt": "2023-10-08T19:05:27"
        },
        {
            "id": "7f81f0a1-4c26-4d1b-8b9b-e1987081d037",
            "name": "Document-68",
            "description": "Sample description for document 49",
            "documentCount": 15,
            "createdAt": "2024-02-25T13:59:01"
        }
    ]


export const add_new_index = (args: {
    name: string;
    description: string;
}) => {
    const { name, description } = args;

    // Crear un nuevo objeto IndexResponseData
    const data: IndexResponseData = {
        id: crypto.randomUUID(), // Generar un UUID
        name: name,
        description: description,
        documentCount: 0, // Inicialmente sin documentos
        createdAt: new Date().toISOString() // Fecha actual
    };

    // Simular la inserción en la "base de datos" (agregar al array)
    sample_db_index.push(data);

    // Retornar el nuevo objeto agregado
    return data;
};


export const delete_index_by_id = (id: string): boolean => {
    const index = sample_db_index.findIndex((item) => item.id === id);

    if (index !== -1) {
        // Si el id es encontrado, eliminar el índice del array
        sample_db_index.splice(index, 1);
        return true; // Retornar true si fue eliminado con éxito
    } else {
        return false; // Retornar false si no se encontró el id
    }
};



export const get_index_by_id = (id: string): IndexResponseData | null => {
    const index = sample_db_index.find((item) => item.id === id);

    if (index) {
        return index; // Retornar el índice si es encontrado
    } else {
        return null; // Retornar null si no se encuentra
    }
};
