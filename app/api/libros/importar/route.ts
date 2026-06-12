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

    const { error } = await supabase.from('libros').insert(libros);
    if (error) throw error;

    return NextResponse.json({ message: `Importados ${libros.length} libros` }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}