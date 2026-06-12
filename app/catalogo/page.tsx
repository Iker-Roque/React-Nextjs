"use client";

import { useState, useEffect } from 'react';
import CardLibro from '@/app/components/CardLibro';

export default function CatalogoPage() {
  const [busqueda, setBusqueda] = useState("");
  const [libros, setLibros] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const obtenerLibros = async () => {
      try {
        setCargando(true);
        
        // Llamada actualizada a tu API de Next.js (Supabase)
        const response = await fetch('/api/libros');
        
        if (!response.ok) {
          throw new Error("Error al obtener los libros del backend");
        }
        
        const data = await response.json();

        if (isMounted) {
          setLibros(data);
        }
      } catch (error) {
        console.error("Error en la petición del catálogo:", error);
      } finally {
        if (isMounted) setCargando(false);
      }
    };

    obtenerLibros();

    return () => {
      isMounted = false; // Evita pérdidas de memoria y bloqueos de estado
    };
  }, []);

  const librosFiltrados = libros.filter(libro => {
    const titulo = libro.titulo ? String(libro.titulo).toLowerCase() : '';
    const autor = libro.autor ? String(libro.autor).toLowerCase() : '';
    const busquedaMinuscula = busqueda.toLowerCase();

    return titulo.includes(busquedaMinuscula) || autor.includes(busquedaMinuscula);
  });

  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      {/* Encabezado - Carga instantáneo porque es estático */}
      <header className="bg-white border-b border-gray-100 py-20 px-12 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Explora la colección</span>
          <h2 className="text-5xl font-serif italic text-gray-950 mt-3 mb-6">Encuentra tu próxima lectura</h2>
          <div className="flex gap-3 max-w-xl mx-auto bg-gray-50 p-2 rounded-2xl border border-gray-100">
            <input
              type="text"
              placeholder="Buscar por título o autor..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-transparent px-4 py-3 outline-none text-sm text-gray-800"
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-12 py-16">
        <div className="flex justify-between items-center mb-10">
          <p className="text-sm text-gray-500 font-medium">
            Mostrando <span className="text-lib-dark font-bold">{cargando ? '...' : librosFiltrados.length}</span> resultados
          </p>
        </div>

        {/* Grilla dinámica */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8">
          {cargando ? (
            // SKELETON UI: Muestra 5 tarjetas falsas animadas mientras carga Supabase
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="w-full h-80 bg-gray-200 rounded-xl animate-pulse flex flex-col justify-between p-6">
                <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                <div className="h-6 bg-gray-300 rounded w-3/4 my-4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              </div>
            ))
          ) : (

            // Cuando deja de cargar, se muestran los libros reales al instante
            librosFiltrados.map(libro => (
              <CardLibro
                key={libro.id}
                id={libro.id}
                titulo={libro.titulo}
                autor={libro.autor}
                genero={libro.categoria}
                disp={libro.cantidad}
                img={libro.img || ""}
              />
            ))
          )}
        </div>

        {!cargando && librosFiltrados.length === 0 && (
          <div className="text-center py-24">
            <p className="text-sm text-gray-400 font-medium">No se encontraron libros.</p>
          </div>
        )}
      </main>
    </div>
  );
}