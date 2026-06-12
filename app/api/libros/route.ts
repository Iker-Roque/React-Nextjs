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

        const { error } = await supabase.from('libros').insert([{
            titulo: body.titulo,
            autor: body.autor,
            isbn: body.isbn,
            cantidad: Number(body.cantidad),
            disponibles: Number(body.cantidad), 
            categoria: body.categoria
        }]);

        if (error) throw error;
        
        return NextResponse.json({ message: 'Libro registrado exitosamente' }, { status: 201 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}