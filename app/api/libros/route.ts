import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET: Obtiene todo el catálogo de libros
export async function GET() {
    const { data, error } = await supabase
        .from('libros')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
}

// POST: Registra un nuevo libro en la base de datos

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. Buscar si el libro ya existe por su ISBN
        const { data: libroExistente, error: errBusqueda } = await supabase
            .from('libros')
            .select('*')
            .eq('isbn', body.isbn)
            .single();

        // El código PGRST116 significa que la fila no existe, lo cual es normal aquí.
        if (errBusqueda && errBusqueda.code !== 'PGRST116') {
            throw errBusqueda;
        }

        if (libroExistente) {
            // 2. Si ya existe, sumar la cantidad ingresada al stock actual y a los disponibles
            const nuevaCantidad = libroExistente.cantidad + body.cantidad;
            const nuevosDisponibles = libroExistente.disponibles + body.cantidad;

            const { error: errUpdate } = await supabase
                .from('libros')
                .update({
                    cantidad: nuevaCantidad,
                    disponibles: nuevosDisponibles
                })
                .eq('id', libroExistente.id);

            if (errUpdate) throw errUpdate;

            return NextResponse.json({ message: "Stock actualizado correctamente" });

        } else {
            // 3. Si no existe, insertarlo como un libro completamente nuevo
            const { error: errInsert } = await supabase
                .from('libros')
                .insert([{
                    titulo: body.titulo,
                    autor: body.autor,
                    isbn: body.isbn,
                    cantidad: body.cantidad,
                    categoria: body.categoria,
                    disponibles: body.cantidad 
                }]);

            if (errInsert) throw errInsert;

            return NextResponse.json({ message: "Libro registrado exitosamente" });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}