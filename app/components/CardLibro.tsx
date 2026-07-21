"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';

interface LibroProps {
  id: number;
  titulo: string;
  autor: string;
  img: string;
  disp: number;
  genero: string;
  perfil?: {
    estado_cuenta: 'activo' | 'inactivo';
  };
}


// Valor que guardamos en localStorage cuando ya confirmamos que un libro NO tiene
// portada (o falló de forma permanente). Así no se vuelve a pedir en este navegador.
const SIN_PORTADA_SENTINEL = '__SIN_PORTADA__';

// TTL para la caché negativa: si un libro quedó marcado como "sin portada"
// hace más de 7 días, lo reintentamos (pudo haber sido un error transitorio,
// o Google Books pudo haber indexado la portada después).
const TTL_SIN_PORTADA_MS = 1000 * 60 * 60 * 24 * 7;

function leerCachePortada(cacheKey: string): string | null {
  const crudo = localStorage.getItem(cacheKey);
  if (!crudo) return null;

  try {
    const { valor, ts } = JSON.parse(crudo);
    if (valor === SIN_PORTADA_SENTINEL && Date.now() - ts > TTL_SIN_PORTADA_MS) {
      localStorage.removeItem(cacheKey);
      return null; // caducó, se reintenta
    }
    return valor;
  } catch {
    // Formato viejo (string plano, sin TTL) de una versión anterior: lo tratamos
    // como caducado para forzar un reintento con el proxy nuevo.
    localStorage.removeItem(cacheKey);
    return null;
  }
}

function guardarCachePortada(cacheKey: string, valor: string) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ valor, ts: Date.now() }));
  } catch { /* no crítico */ }
}

const CardLibro: React.FC<LibroProps> = ({ id, titulo, autor, img, disp, genero, perfil }) => {
  const [stock, setStock] = useState<number>(disp);
  const [procesando, setProcesando] = useState<boolean>(false);
  const [portadaFinal, setPortadaFinal] = useState<string>(img);

  useEffect(() => {
    // Caso ideal: el libro ya trae "img" desde la base de datos (backfill hecho).
    // Aquí no se dispara ninguna petición.
    if (img && typeof img === 'string' && img.trim() !== "") {
      setPortadaFinal(img);
      return;
    }

    const cacheKey = `portada_libro_${id}`;
    const portadaGuardada = leerCachePortada(cacheKey);

    if (portadaGuardada) {
      setPortadaFinal(portadaGuardada === SIN_PORTADA_SENTINEL ? '' : portadaGuardada);
      return;
    }

    let isMounted = true;

    const buscarEnAPI = async () => {
      try {
        // Ya no llamamos a Google Books directo: pasa por nuestra propia
        // ruta backend, que cachea en el servidor entre TODOS los usuarios.
        const res = await fetch(`/api/portada?titulo=${encodeURIComponent(titulo)}&id=${id}`);
        if (!res.ok) throw new Error("Fallo en la red");

        const { url, reintentar } = await res.json();

        if (reintentar) {
          // 429/503 transitorio del lado de Google: no cacheamos nada,
          // se reintentará la próxima vez que se muestre la tarjeta.
          return;
        }

        if (url && isMounted) {
          setPortadaFinal(url);
          guardarCachePortada(cacheKey, url);
        } else {
          guardarCachePortada(cacheKey, SIN_PORTADA_SENTINEL);
        }
      } catch (error) {
        console.warn(`No se pudo cargar la portada de "${titulo}" de forma automática.`);
      }
    };

    buscarEnAPI();

    return () => {
      isMounted = false;
    };
  }, [titulo, img, id]);

  const handleSolicitarPrestamo = async () => {
    if (stock <= 0) {
      toast.error("Este libro está agotado");
      return;
    }
    setProcesando(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Debes iniciar sesión para solicitar un préstamo");
        setProcesando(false);
        return;
      }

      const response = await fetch('/api/prestamos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          libroId: id,
          usuarioId: session.user.id,
          dniUsuario: session.user.user_metadata?.dni?.toString() || ""
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      setStock(stock - 1);
      toast.success(`¡Solicitud confirmada! Tienes 14 días para Recoger El Libro ${titulo.replace(/['"]/g, '')}.`, { duration: 3000 });

    } catch (error: any) {
      toast.error(`${error.message}`);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="group cursor-pointer">
      <div className="relative overflow-hidden rounded-3xl mb-4 aspect-3/4 bg-gray-100 flex items-center justify-center">

        {portadaFinal ? (
          <img
            src={portadaFinal}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            alt={titulo}
            onError={(e) => {
              e.currentTarget.onerror = null;
              setPortadaFinal('');
              guardarCachePortada(`portada_libro_${id}`, SIN_PORTADA_SENTINEL);
            }}
          />
        ) : (
          <span className="text-[8px] font-bold text-gray-300 uppercase text-center p-2">Sin Portada</span>
        )}

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 backdrop-blur-sm">
          <button
            onClick={handleSolicitarPrestamo}
            disabled={procesando || stock <= 0 || perfil?.estado_cuenta === 'inactivo'}
            className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase shadow-xl transition-colors mb-2 disabled:opacity-50 ${
              perfil?.estado_cuenta === 'inactivo'
                ? 'bg-gray-200 text-gray-400 shadow-none cursor-not-allowed hover:bg-gray-200 hover:text-gray-400'
                : 'bg-white text-lib-dark hover:bg-lib-dark hover:text-white'
            }`}
          >
            {procesando 
              ? 'Procesando...' 
              : perfil?.estado_cuenta === 'inactivo' 
                ? 'Acceso Restringido' 
                : 'Solicitar Préstamo'
            }
          </button>
        </div>
      </div>

      <h4 className="font-bold text-[11px] text-gray-900 leading-tight mb-1 truncate">{titulo}</h4>
      <p className="text-[10px] text-gray-400 mb-2">{autor}</p>

      <div className="flex justify-between items-center">
        <span className="text-[8px] bg-lib-accent text-lib-dark px-2 py-0.5 rounded-full font-black uppercase">
          {genero}
        </span>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${stock > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className={`text-[9px] font-bold ${stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {stock > 0 ? `${stock} disp.` : 'Agotado'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CardLibro;