import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// GET: Obtener todos los préstamos
export async function GET() {
    const { data, error } = await supabase
        .from('prestamos')
        .select(`*, libro:libros (*)`)
        .order('fecha_prestamo', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
}

// POST: Solicitar un nuevo préstamo con aprobación automática
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const { data: libroInfo, error: errorLibro } = await supabase
            .from("libros")
            .select("disponibles")
            .eq("id", body.libroId)
            .single();

        if (errorLibro || !libroInfo || libroInfo.disponibles <= 0) {
            return NextResponse.json({ error: "No hay stock disponible para este libro" }, { status: 400 });
        }

        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 12);
       
        //Insertar y capturar el ID generado
        const { data: prestamoNuevo, error: errorPrestamo } = await supabase
            .from('prestamos')
            .insert([{
                libro_id: body.libroId,       
                dni_usuario: body.dniUsuario,
                usuario_id: body.usuarioId,   
                estado: 'solicitado',
                fecha_prestamo: new Date().toISOString(),
                fecha_vencimiento:  fechaVencimiento.toISOString()
            }])
            .select()
            .single();

        if (errorPrestamo) throw errorPrestamo;

        const { error: errorUpdate } = await supabase
            .from("libros")
            .update({ disponibles: libroInfo.disponibles - 1 })
            .eq("id", body.libroId);

        if (errorUpdate) throw errorUpdate;

        // Temporizador automático de 10 segundos
        setTimeout(async () => {
            try {
                await supabase
                    .from('prestamos')
                    .update({ estado: 'prestado' })
                    .eq('id', prestamoNuevo.id);
            } catch (err) {
                // Silenciado
            }
        }, 10000);

        return NextResponse.json({ message: "Préstamo solicitado exitosamente" }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Aprobar o Rechazar un préstamo
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, accion } = body;

        if (accion === "aprobar") {
            const { error } = await supabase
                .from("prestamos")
                .update({ estado: "prestado" })
                .eq("id", id);

            if (error) throw error;
            return NextResponse.json({ message: "Préstamo aprobado" });
        }

        if (accion === "rechazar") {
            const { data: prestamo, error: errorPrestamo } = await supabase
                .from("prestamos")
                .select("libroId")
                .eq("id", id)
                .single();

            if (errorPrestamo) throw errorPrestamo;

            const { error: errorUpdate } = await supabase
                .from("prestamos")
                .update({ estado: "rechazado" })
                .eq("id", id);

            if (errorUpdate) throw errorUpdate;

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

            return NextResponse.json({ message: "Préstamo rechazado y stock devuelto" });
        }

        return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    } catch (error: any) {
        
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}