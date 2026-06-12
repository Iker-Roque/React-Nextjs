import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dni, contrasena } = body;

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('dni', dni)
      .eq('contrasena', contrasena)
      .single();

    if (error || !usuario) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    return NextResponse.json({ message: 'Login exitoso', usuario }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}