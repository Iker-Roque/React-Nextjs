import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Faltan variables en .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,      // guarda la sesión en localStorage
    autoRefreshToken: true,    // renueva el token antes de que expire
    detectSessionInUrl: true,  // necesario para links de confirmación/recuperación de contraseña
  },
});