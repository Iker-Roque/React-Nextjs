import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params; 

        console.log(">>> API Carrito: Buscando préstamos para el UID:", id);

        const { data, error } = await supabase
            .from('prestamos')
            .select(`
                *,
                libro:libros (titulo)
            `)
            .eq('usuario_id', id)
            .order('fecha_prestamo', { ascending: false });

        if (error) {
            console.error(">>> API Carrito Error:", error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log(">>> API Carrito Datos Encontrados:", data);
        return NextResponse.json(data || []);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}