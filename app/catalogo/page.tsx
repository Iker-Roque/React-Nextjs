"use client";

import { useState, useEffect, useMemo } from 'react';
import CardLibro from '@/app/components/CardLibro';

export default function CatalogoPage() {
  const [busqueda, setBusqueda] = useState("");
  const [libros, setLibros] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // 1. Nuevo estado para el filtro de la barra lateral
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const obtenerLibros = async () => {
      try {
        setCargando(true);
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
      isMounted = false; 
    };
  }, []);

  // 2. Extraer categorías únicas y contar cuántos libros hay en cada una
  const conteoCategorias = useMemo(() => {
    const conteo: Record<string, number> = {};
    libros.forEach(libro => {
      const cat = libro.categoria || 'Sin categoría';
      conteo[cat] = (conteo[cat] || 0) + 1;
    });
    // Convertir el objeto a un arreglo y ordenarlo por cantidad (de mayor a menor)
    return Object.entries(conteo).sort((a, b) => b[1] - a[1]);
  }, [libros]);

  // 3. Lógica de filtrado doble (Búsqueda por texto + Filtro por categoría)
  const librosFiltrados = libros.filter(libro => {
    const titulo = libro.titulo ? String(libro.titulo).toLowerCase() : '';
    const autor = libro.autor ? String(libro.autor).toLowerCase() : '';
    const busquedaMinuscula = busqueda.toLowerCase();

    const coincideTexto = titulo.includes(busquedaMinuscula) || autor.includes(busquedaMinuscula);
    const coincideCategoria = categoriaSeleccionada ? libro.categoria === categoriaSeleccionada : true;

    return coincideTexto && coincideCategoria;
  });

  return (
    <div className="min-h-screen bg-lib-cream">
      {/* Encabezado */}
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

      {/* Main actualizado con CSS Grid (12 columnas en pantallas grandes) */}
      <main className="max-w-[85%] mx-auto px-4 py-16 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* BARRA LATERAL (Toma 3 de 12 columnas) */}
        <aside className="lg:col-span-2">
          <div className="sticky top-24 bg-white p-8 rounded-4xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-lg mb-6 font-serif italic text-lib-dark">Explorar Géneros</h3>
            
            <ul className="space-y-4">
              {/* Opción para ver todos los libros */}
              <li 
                onClick={() => setCategoriaSeleccionada(null)}
                className="group flex justify-between items-center cursor-pointer"
              >
                <span className={`text-xs font-bold transition-colors ${categoriaSeleccionada === null ? 'text-lib-dark' : 'text-gray-400 group-hover:text-lib-dark'}`}>
                  Todos los géneros
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black transition-all ${categoriaSeleccionada === null ? 'bg-lib-dark text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'}`}>
                  {libros.length}
                </span>
              </li>

              {/* Mapeo dinámico de tus categorías reales */}
              {conteoCategorias.map(([categoria, cantidad]) => (
                <li 
                  key={categoria} 
                  onClick={() => setCategoriaSeleccionada(categoria)}
                  className="group flex justify-between items-center cursor-pointer"
                >
                  <span className={`text-xs font-bold transition-colors ${categoriaSeleccionada === categoria ? 'text-lib-dark' : 'text-gray-400 group-hover:text-lib-dark'}`}>
                    {categoria}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black transition-all ${categoriaSeleccionada === categoria ? 'bg-lib-dark text-white' : 'bg-lib-accent text-lib-dark group-hover:bg-lib-dark group-hover:text-white'}`}>
                    {cantidad}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* SECCIÓN DE LIBROS (Toma 9 de 12 columnas) */}
        <section className="lg:col-span-10">
          <div className="flex justify-between items-center mb-10">
            <p className="text-sm text-gray-500 font-medium">
              Mostrando <span className="text-lib-dark font-bold">{cargando ? '...' : librosFiltrados.length}</span> resultados
              {categoriaSeleccionada && <span> en <strong>{categoriaSeleccionada}</strong></span>}
            </p>
          </div>

          {/* Grilla dinámica ajustada al nuevo espacio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {cargando ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="w-full h-80 bg-gray-200 rounded-xl animate-pulse flex flex-col justify-between p-6">
                  <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                  <div className="h-6 bg-gray-300 rounded w-3/4 my-4"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                </div>
              ))
            ) : (
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
            <div className="text-center py-24 bg-white rounded-3xl border border-gray-100">
              <p className="text-sm text-gray-400 font-medium">No se encontraron libros para esta búsqueda.</p>
              {categoriaSeleccionada && (
                <button 
                  onClick={() => setCategoriaSeleccionada(null)}
                  className="mt-4 text-xs font-bold text-lib-dark hover:underline"
                >
                  Quitar filtro de categoría
                </button>
              )}
            </div>
          )}
        </section>
        
      </main>
    </div>
  );
}