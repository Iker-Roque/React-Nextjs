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

// POST: Solicitar un nuevo préstamo.
// Queda en estado 'solicitado' hasta que el bibliotecario confirme la entrega
// en el mostrador (ver /api/prestamos/[id]/aprobar) o lo rechace
// (ver /api/prestamos/[id]/rechazar). Ya NO se auto-aprueba con un timer:
// ese paso debe ser una acción real del bibliotecario, como indica el diagrama.
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

        const { error: errorPrestamo } = await supabase
            .from('prestamos')
            .insert([{
                libro_id: body.libroId,
                dni_usuario: body.dniUsuario,
                usuario_id: body.usuarioId,
                estado: 'solicitado',
                fecha_prestamo: new Date().toISOString(),
                fecha_vencimiento: null // se calcula recién cuando se confirma la entrega (15 días hábiles desde ese momento)
            }]);

        if (errorPrestamo) throw errorPrestamo;

        const { error: errorUpdate } = await supabase
            .from("libros")
            .update({ disponibles: libroInfo.disponibles - 1 })
            .eq("id", body.libroId);

        if (errorUpdate) throw errorUpdate;

        return NextResponse.json({ message: "Préstamo solicitado exitosamente" }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}