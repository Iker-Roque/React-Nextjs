import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function usePerfil() {
  const [perfil, setPerfil] = useState<any>(null);

  useEffect(() => {
    let activo = true; // evita actualizar el estado si el componente ya se desmontó

    const cargarPerfil = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('perfiles')
          .select('rol, estado_cuenta, motivo_estado, infracciones')
          .eq('id', userId)
          .single();

        if (activo && !error && data) {
          setPerfil(data);
        }
      } catch (error) {
        console.error("Error obteniendo perfil:", error);
      }
    };

    // 1. Chequeo inicial normal (cubre la mayoría de los casos)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) cargarPerfil(session.user.id);
    });

    // 2. Escucha cambios de sesión: esto es lo que arregla la carrera al recargar.
    // Cuando la sesión termina de restaurarse desde localStorage, Supabase dispara
    // un evento (INITIAL_SESSION / SIGNED_IN) y recién ahí cargamos el perfil.
    // También cubre login y logout en caliente sin necesidad de recargar la página.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        cargarPerfil(session.user.id);
      } else if (activo) {
        setPerfil(null);
      }
    });

    return () => {
      activo = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return perfil;
}