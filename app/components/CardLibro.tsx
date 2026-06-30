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

const CardLibro: React.FC<LibroProps> = ({ id, titulo, autor, img, disp, genero, perfil }) => {
  const [stock, setStock] = useState<number>(disp);
  const [procesando, setProcesando] = useState<boolean>(false);
  const [portadaFinal, setPortadaFinal] = useState<string>(img);

  useEffect(() => {
    if (img && typeof img === 'string' && img.trim() !== "") {
      setPortadaFinal(img);
      return;
    }

    const cacheKey = `portada_libro_${id}`;
    const portadaGuardada = sessionStorage.getItem(cacheKey);

    if (portadaGuardada) {
      setPortadaFinal(portadaGuardada);
      return;
    }

    let isMounted = true;

    const buscarEnAPI = async () => {
      try {
        const tiempoDeEspera = Math.floor(Math.random() * 2500) + 100;
        await new Promise(resolve => setTimeout(resolve, tiempoDeEspera));

        if (!isMounted) return;

        const query = encodeURIComponent(titulo);
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1&key=${apiKey}`);

        if (res.status === 429) {
          console.warn(`[Límite 429] Google pidió esperar para la portada de: ${titulo}`);
          return;
        }

        if (!res.ok) throw new Error("Fallo en la red");

        const data = await res.json();

        if (data.items && data.items.length > 0) {
          const imagenApi = data.items[0].volumeInfo?.imageLinks?.thumbnail;
          if (imagenApi && isMounted) {
            const urlFinal = imagenApi.replace('http:', 'https:').replace('&zoom=5', '&zoom=1');
            setPortadaFinal(urlFinal);
            sessionStorage.setItem(cacheKey, urlFinal);
          }
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
      toast.success(`¡Préstamo confirmado! Tienes 14 días para devolver ${titulo.replace(/['"]/g, '')}.`, { duration: 3000 });

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
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            alt={titulo}
            onError={(e) => {
              e.currentTarget.onerror = null;
              setPortadaFinal('');
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