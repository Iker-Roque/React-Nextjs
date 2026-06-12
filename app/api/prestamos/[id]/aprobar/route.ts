import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const { error } = await supabase
            .from('prestamos')
            .update({ estado: 'prestado' })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ message: "Préstamo aprobado" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}