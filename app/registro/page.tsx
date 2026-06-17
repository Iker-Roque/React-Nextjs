"use client";

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { EyeIcon , EyeSlashIcon } from '@phosphor-icons/react';

const Login: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const isRegistro = pathname === '/registro';

  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [errorMensaje, setErrorMensaje] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // Ocultar Barra de Navegacion en Login y Registro
  useEffect(() => {
    const navbar = document.querySelector('nav');
    const sidebar = document.querySelector('aside'); // Por si también quieres ocultar el sidebar de la izquierda
    
    if (navbar) navbar.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';

    return () => {
      if (navbar) navbar.style.display = 'flex';
      if (sidebar) sidebar.style.display = 'flex';
    };
  }, []);

  const procesarFormulario = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMensaje(''); 

    // Validar Campos Vacíos
    if (!dni.trim() || !password.trim() || (isRegistro && !nombre.trim())) {
      setErrorMensaje('Por favor, Complete los espacios en blanco.');
      return;
    }

    // Prepara el correo final basado en el DNI
    let correoFinal = dni.trim();
    if (!correoFinal.includes('@')) {
      correoFinal = `${correoFinal}@biblioteca.com`;
    }

    try {
      if (isRegistro) {
        // FLUJO DE REGISTRO
        const { error } = await supabase.auth.signUp({
          email: correoFinal,
          password: password,
          options: {
            data: {
              nombre_completo: nombre,
              dni: dni,
              rol: 'usuario' 
            }
          }
        });
        if (error) throw error;
        router.push('/');
      } else {
        // FLUJO DE LOGIN
        const { error } = await supabase.auth.signInWithPassword({
          email: correoFinal,
          password: password,
        });

        if (error) throw error;
        router.push('/');
      }

    } catch (error: any) {
      const mensajeVieneDeSupabase = error.message?.toLowerCase() || "";

      if (isRegistro) {
        if (mensajeVieneDeSupabase.includes("already registered") || mensajeVieneDeSupabase.includes("already exists") || mensajeVieneDeSupabase.includes("user already registered")) {
          setErrorMensaje("Ya existe este DNI registrado.");
        } else {
          setErrorMensaje("Error al crear la cuenta: " + error.message);
        }
      } else {
        if (mensajeVieneDeSupabase.includes("invalid credentials") || mensajeVieneDeSupabase.includes("invalid login credentials")) {
          setErrorMensaje("El DNI no está registrado o la contraseña es incorrecta.");
        } else {
          setErrorMensaje("Ocurrió un error inesperado: " + error.message);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-lib-cream flex items-center justify-center p-6 w-full absolute top-0 left-0 z-50">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-2xl overflow-hidden grid grid-cols-2 border border-gray-100">

        {/* Panel izquierdo */}
        <div className="relative bg-gray-900 flex flex-col justify-between p-10 text-white min-h-130">
          <img
            src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=1000"
            className="absolute inset-0 w-full h-full object-cover opacity-40"
            alt="Library"
          />
          {/* Badge superior */}
          <div className="relative z-10 flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block"></span>
            <span className="text-[11px] text-white/80">Sistema activo</span>
          </div>
          {/* Texto inferior */}
          <div className="relative z-10">
            <h2 className="text-3xl font-serif italic mb-3 leading-snug">
              Bienvenido a la Biblioteca Digital
            </h2>
            <p className="text-xs text-gray-300 leading-relaxed opacity-75">
              Accede al catálogo completo y gestiona tus préstamos de forma rápida y segura.
            </p>
          </div>
        </div>

        {/* Panel derecho */}
        <div className="p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h3 className="text-2xl font-serif italic text-gray-900">
              {isRegistro ? 'Crea tu cuenta' : 'Iniciar Sesión'}
            </h3>
            <p className="text-[11px] text-gray-400 mt-1.5 font-bold tracking-widest uppercase">
              {isRegistro ? 'Completa tus datos' : 'Ingresa tus datos'}
            </p>
          </div>

          {errorMensaje && (
            <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-xl text-sm text-center">
              {errorMensaje}
            </div>
          )}

          <form className="space-y-3" onSubmit={procesarFormulario}>
            {isRegistro && (
              <input
                type="text"
                placeholder="Nombre Completo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 focus:bg-white transition-all text-sm"
              />
            )}

            <input
              type="text"
              placeholder="Número de DNI"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              maxLength={8}
              className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 focus:bg-white transition-all text-sm"
            />

            <div className="relative">
              <input
                type={mostrarPassword ? "text" : "password"}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-5 pr-12 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 focus:bg-white transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {mostrarPassword ? <EyeSlashIcon size={22} /> : <EyeIcon size={22} />}
              </button>
            </div>

            {!isRegistro && (
              <div className="text-left pl-1">
                <button
                  type="button"
                  onClick={() => alert("Funcionalidad en desarrollo para el próximo sprint")}
                  className="cursor-pointer text-[11px] text-gray-400 hover:text-gray-700 transition-colors"
                >
                  ¿Olvidó su contraseña?
                </button>
              </div>
            )}

            <button
              type="submit"
              className="cursor-pointer w-full bg-lib-dark text-white py-3.5 rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-md active:scale-95"
            >
              {isRegistro ? 'Registrarse' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 flex justify-between items-center border-t border-gray-100 pt-5">
            <button
              onClick={() => { setErrorMensaje(''); router.push(isRegistro ? '/login' : '/registro'); }}
              className="cursor-pointer text-[10px] font-black tracking-widest text-gray-400 hover:text-black transition-colors uppercase"
            >
              {isRegistro ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="cursor-pointer text-[10px] font-black tracking-widest text-gray-400 hover:text-gray-900 transition-colors uppercase"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;