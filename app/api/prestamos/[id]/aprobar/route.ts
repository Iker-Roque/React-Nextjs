import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Suma N días HÁBILES (lunes a viernes) a partir de hoy, saltándose sábados y domingos
function sumarDiasHabiles(diasHabiles: number): Date {
    const fecha = new Date();
    let sumados = 0;

    while (sumados < diasHabiles) {
        fecha.setDate(fecha.getDate() + 1);
        const diaSemana = fecha.getDay(); // 0 = domingo, 6 = sábado
        if (diaSemana !== 0 && diaSemana !== 6) {
            sumados++;
        }
    }

    return fecha;
}

// PUT /api/prestamos/[id]/aprobar
// Confirma la entrega en el mostrador: pasa el préstamo a 'prestado' y recién
// aquí se calcula la fecha de vencimiento (15 días hábiles desde la entrega).
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        const fechaVencimiento = sumarDiasHabiles(15);

        const { error } = await supabase
            .from('prestamos')
            .update({
                estado: 'prestado',
                fecha_vencimiento: fechaVencimiento.toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ message: "Préstamo aprobado" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}