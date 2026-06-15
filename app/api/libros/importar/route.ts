import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 });

    const text = await file.text();
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    const libros = [];
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      const values = lines[i].split(',').map(v => v.trim());
      libros.push({
        titulo: values[headers.indexOf('titulo')],
        autor: values[headers.indexOf('autor')],
        isbn: values[headers.indexOf('isbn')],
        cantidad: Number(values[headers.indexOf('cantidad')]),
        disponibles: Number(values[headers.indexOf('cantidad')]),
        categoria: values[headers.indexOf('categoria')]
      });
    }

    // Obtener libros actuales de la base de datos
    const { data: librosActuales, error: errFetch } = await supabase.from('libros').select('*');
    if (errFetch) throw errFetch;

    // Procesar sumando cantidades si el ISBN ya existe
    const librosProcesados = libros.map((libroCsv) => {
      const libroExistente = librosActuales?.find(l => l.isbn === libroCsv.isbn);

      if (libroExistente) {
        return {
          id: libroExistente.id, // El ID hace que Supabase actualice en lugar de crear uno nuevo
          titulo: libroExistente.titulo, 
          autor: libroExistente.autor,
          isbn: libroCsv.isbn,
          categoria: libroExistente.categoria,
          cantidad: libroExistente.cantidad + libroCsv.cantidad,
          disponibles: libroExistente.disponibles + libroCsv.cantidad
        };
      } else {
        return libroCsv;
      }
    });

    // Insertar nuevos y actualizar existentes
    const { error } = await supabase.from('libros').upsert(librosProcesados);
    if (error) throw error;

    return NextResponse.json({ message: `Importados/Actualizados ${librosProcesados.length} libros` }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}