import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// POST /api/prestamos/verificar-vencidos
// Busca préstamos con estado 'prestado' cuya fecha_vencimiento ya pasó y que
// todavía no generaron una infracción (columna infraccion_aplicada = false).
// Por cada uno, suma 1 infracción al perfil dueño del préstamo (buscado por DNI)
// y suspende la cuenta (estado_cuenta = 'inactivo') de inmediato. El contador de
// infracciones queda solo como historial, ya no funciona como umbral.
export async function POST() {
  try {
    const hoy = new Date().toISOString();

    const { data: vencidos, error: errorVencidos } = await supabase
      .from('prestamos')
      .select('*, libro:libros(titulo)')
      .eq('estado', 'prestado')
      .eq('infraccion_aplicada', false)
      .lt('fecha_vencimiento', hoy);

    if (errorVencidos) throw errorVencidos;

    if (!vencidos || vencidos.length === 0) {
      return NextResponse.json({ sanciones: 0, revisados: 0 });
    }

    let sancionesAplicadas = 0;

    for (const prestamo of vencidos) {
      // Buscar el perfil dueño del préstamo por su DNI
      const { data: perfil, error: errorPerfil } = await supabase
        .from('perfiles')
        .select('*')
        .eq('dni', prestamo.dni_usuario)
        .single();

      if (errorPerfil || !perfil) {
        // No se encontró el perfil: marcamos el préstamo igual para no
        // reintentarlo en cada corrida y quedarnos en un bucle infinito.
        await supabase.from('prestamos').update({ infraccion_aplicada: true }).eq('id', prestamo.id);
        continue;
      }

      const nuevasInfracciones = (perfil.infracciones || 0) + 1;
      const motivo = `No entregó "${prestamo.libro?.titulo || 'el libro'}" a tiempo (venció el ${new Date(prestamo.fecha_vencimiento).toLocaleDateString()})`;
      const motivoFinal = `Cuenta suspendida por sanción: ${motivo}`;

      const { error: errorUpdatePerfil } = await supabase
        .from('perfiles')
        .update({
          infracciones: nuevasInfracciones,
          estado_cuenta: 'inactivo',
          motivo_estado: motivoFinal
        })
        .eq('id', perfil.id);

      if (errorUpdatePerfil) {
        console.error(`Error al actualizar perfil ${perfil.id}:`, errorUpdatePerfil.message);
        continue; // No marcamos el préstamo como aplicado si falló, para reintentar después
      }

      await supabase.from('prestamos').update({ infraccion_aplicada: true }).eq('id', prestamo.id);
      sancionesAplicadas++;
    }

    return NextResponse.json({ sanciones: sancionesAplicadas, revisados: vencidos.length });
  } catch (error: any) {
    console.error('Error al verificar préstamos vencidos:', error);
    return NextResponse.json({ error: error.message || 'Error al verificar vencidos' }, { status: 500 });
  }
}