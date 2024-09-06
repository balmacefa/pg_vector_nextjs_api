import { NextResponse } from "next/server";
import { delete_index_by_id } from "../../db";

// Función para manejar el request DELETE
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const { id } = params;

    // Buscar el índice por id
    const index_removed: boolean = await delete_index_by_id(id);



    if (index_removed) {

        return NextResponse.json(
            { message: `Índice con id ${id} eliminado con éxito.` },
            { status: 200 }
        );
    } else {
        return NextResponse.json(
            { message: `Índice con id ${id} no encontrado.` },
            { status: 404 }
        );

    }

}