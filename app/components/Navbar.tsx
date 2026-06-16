"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';


const Navbar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  //UseState
  const [usuario, setUsuario] = useState<any>(null);
  const ADMIN_EMAIL = "71727374@biblioteca.com"; 
  const [rolReal, setRolReal] = useState<string>('usuario');

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUsuario(session.user);

          const { data, error } = await supabase
            .from('perfiles')
            .select('rol')
            .eq('id', session.user.id)
            .single();

          if (data && !error) {
            setRolReal(data.rol);
          }
        }
      } catch (e) {
        console.error("Error al verificar sesión en Navbar:", e);
      }
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUsuario(session?.user || null);
      if (session?.user) {
        const { data } = await supabase
          .from('perfiles')
          .select('rol')
          .eq('id', session.user.id)
          .single();

        if (data) setRolReal(data.rol);
      } else {
        setRolReal('usuario');
      }
    });

    return () => authListener.subscription?.unsubscribe();
  }, []);

  const handleLogout = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    localStorage.clear();
    sessionStorage.clear();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getNavClass = (path: string) => {
    return pathname === path
      ? "text-lib-dark border-b-2 border-lib-dark pb-1 cursor-pointer font-bold"
      : "text-gray-500 hover:text-lib-dark transition-colors cursor-pointer font-medium";
  };

  const esAdmin = rolReal === 'administrador' || usuario?.email === ADMIN_EMAIL;

  

  return (
    <nav className="flex items-center justify-between px-12 py-5 bg-white border-b border-gray-100 sticky top-0 z-50">

      {/* Logo */}
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
        <div className="rounded-lg shadow-sm">
          <Image src="/img/logo.png" alt="Logo" width={60} height={60} style={{ height: "auto" }} />
        </div>
        <div>
          <h1 className="font-bold text-xl text-lib-dark leading-none">Library</h1>
          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Tu biblioteca, siempre contigo</p>
        </div>
      </div>

      {/* Menú Central */}
      <div className="hidden lg:flex items-center gap-8">
        <ul className="flex gap-8 text-sm items-center">
          <li onClick={() => router.push('/')} className={getNavClass('/')}>Inicio</li>
          <li onClick={() => router.push('/catalogo')} className={getNavClass('/catalogo')}>Catálogo</li>

          {esAdmin && (
            <button
              onClick={() => router.push('/admin')}
              className="cursor-pointer bg-lib-dark/5 text-lib-dark border border-lib-dark/20 px-4 py-1.5 rounded-full text-xs font-bold hover:bg-lib-dark hover:text-white transition-all shadow-sm"
            >
              Panel Administrador
            </button>
          )}
        </ul>
      </div>


      

      {/* Sección de Usuario */}
      <div className="flex items-center gap-6">
        {usuario ? (
          <div className="flex items-center gap-5 border-l pl-5 border-gray-200">
            
            {/* NUEVO: Botón de Mi Perfil */}
            <Link
              href="/perfil"
              className="text-[11px] font-black text-gray-500 hover:text-lib-dark transition-colors uppercase tracking-widest cursor-pointer"
            >
              Mi Perfil
            </Link>

            {/* Separador */}
            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

            <div className="text-right">
              <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">
                {usuario.user_metadata?.nombre_completo}
              </p>
              <p className="text-[9px] text-gray-400 font-bold uppercase">
                DNI: {usuario.user_metadata?.dni} • {esAdmin ? 'Administrador' : 'Usuario'}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="cursor-pointer text-[10px] font-black text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg border border-red-100 transition-all uppercase tracking-widest"
            >
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button onClick={() => router.push('/login')} className="cursor-pointer text-sm font-bold text-gray-700 px-4">Iniciar sesión</button>
            <button onClick={() => router.push('/registro')} className="cursor-pointer bg-lib-dark text-white text-sm font-bold px-6 py-2 rounded-xl">Únete</button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;