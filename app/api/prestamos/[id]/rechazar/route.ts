import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Obtener el libro asociado al préstamo
        const { data: prestamo, error: errPrestamo } = await supabase
            .from('prestamos')
            .select('libro_id')
            .eq('id', id)
            .single();

        if (errPrestamo) throw errPrestamo;

        // Actualizar el estado a rechazado
        const { error: errUpdate } = await supabase
            .from('prestamos')
            .update({ estado: 'rechazado' })
            .eq('id', id);

        if (errUpdate) throw errUpdate;

        // Obtener stock actual del libro
        const { data: libro, error: errLibro } = await supabase
            .from('libros')
            .select('disponibles')
            .eq('id', prestamo.libro_id)
            .single();

        if (errLibro) throw errLibro;

        // Devolver el stock (+1)
        const { error: errStock } = await supabase
            .from('libros')
            .update({ disponibles: libro.disponibles + 1 })
            .eq('id', prestamo.libro_id);

        if (errStock) throw errStock;

        return NextResponse.json({ message: "Préstamo rechazado y stock devuelto" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}