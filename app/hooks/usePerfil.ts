import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function usePerfil() {
  const [perfil, setPerfil] = useState<any>(null);

  useEffect(() => {
    const obtenerEstadoUsuario = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data } = await supabase
            .from('perfiles')
            .select('estado_cuenta, motivo_estado')
            .eq('id', session.user.id)
            .single();
          
          if (data) {
            setPerfil(data);
          }
        }
      } catch (error) {
        console.error("Error obteniendo perfil:", error);
      }
    };

    obtenerEstadoUsuario();
  }, []);

  return perfil;
}