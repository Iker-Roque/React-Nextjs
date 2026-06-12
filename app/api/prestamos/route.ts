import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// GET: Obtener todos los préstamos (Para que tu tabla del Admin se llene)
export async function GET() {
    const { data, error } = await supabase
        .from('prestamos')
        .select(`
            *,
            libro:libros (*)
        `)
        .order('fecha_prestamo', { ascending: false }); // <-- Nombre corregido aquí

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
}
// POST: Solicitar un nuevo préstamo
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. Verificar stock disponible primero
        const { data: libroInfo, error: errorLibro } = await supabase
            .from("libros")
            .select("disponibles")
            .eq("id", body.libroId)
            .single();

        if (errorLibro || !libroInfo || libroInfo.disponibles <= 0) {
            return NextResponse.json(
                { error: "No hay stock disponible para este libro" },
                { status: 400 },
            );
        }

        // 2. Insertar el préstamo en estado 'solicitado'
        // 2. Insertar el préstamo en estado 'solicitado'
        const { error: errorPrestamo } = await supabase
            .from('prestamos')
            .insert([{
                libro_id: body.libroId,       // Columna BD : Dato del Frontend
                dni_usuario: body.dniUsuario,
                usuario_id: body.usuarioId,   // Columna BD : Dato del Frontend
                estado: 'solicitado'
            }]);

        if (errorPrestamo) throw errorPrestamo;

        // 3. Descontar el stock (restar 1)
        const { error: errorUpdate } = await supabase
            .from("libros")
            .update({ disponibles: libroInfo.disponibles - 1 })
            .eq("id", body.libroId);

        if (errorUpdate) throw errorUpdate;

        return NextResponse.json(
            { message: "Préstamo solicitado exitosamente" },
            { status: 201 },
        );
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Aprobar o Rechazar un préstamo
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, accion } = body; // accion puede ser 'aprobar' o 'rechazar'

        if (accion === "aprobar") {
            // Cambiar estado a 'prestado'
            const { error } = await supabase
                .from("prestamos")
                .update({ estado: "prestado" })
                .eq("id", id);

            if (error) throw error;
            return NextResponse.json({ message: "Préstamo aprobado" });
        }

        if (accion === "rechazar") {
            // 1. Obtener el ID del libro vinculado a este préstamo
            const { data: prestamo, error: errorPrestamo } = await supabase
                .from("prestamos")
                .select("libroId")
                .eq("id", id)
                .single();

            if (errorPrestamo) throw errorPrestamo;

            // 2. Cambiar estado a 'rechazado'
            const { error: errorUpdate } = await supabase
                .from("prestamos")
                .update({ estado: "rechazado" })
                .eq("id", id);

            if (errorUpdate) throw errorUpdate;

            // 3. Devolver el stock (sumar 1 a disponibles en la tabla libros)
            // (Asume que tienes un procedimiento almacenado en Supabase o haces una lectura/escritura)
            const { data: libroInfo } = await supabase
                .from("libros")
                .select("disponibles")
                .eq("id", prestamo.libroId)
                .single();

            if (libroInfo) {
                await supabase
                    .from("libros")
                    .update({ disponibles: libroInfo.disponibles + 1 })
                    .eq("id", prestamo.libroId);
            }

            return NextResponse.json({
                message: "Préstamo rechazado y stock devuelto",
            });
        }

        return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
