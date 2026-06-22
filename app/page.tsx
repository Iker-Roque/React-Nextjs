"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CardLibro from '@/app/components/CardLibro';
import { usePerfil } from '@/app/hooks/usePerfil';
import { ArrowRightIcon, ArrowDownIcon } from '@phosphor-icons/react';

const Home: React.FC = () => {
    const router = useRouter(); 
    
    // Estado para guardar los libros de la base de datos
    const [libros, setLibros] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);

    //LLAMA AL HOOK CORRECTAMENTE:
    const perfil = usePerfil();

    // Efecto para cargar los "Nuevos Libros" al entrar a la página
    useEffect(() => {
        let isMounted = true;

        const cargarNovedades = async () => {
            try {
                setCargando(true);

                // Se cambia a la ruta relativa del API de Next.js
                const response = await fetch('/api/libros');
                if (!response.ok) throw new Error("Error al cargar novedades del servidor");

                const data = await response.json();

                if (isMounted) {
                    // Extrae únicamente los primeros 8 libros para la vista de inicio
                    setLibros(data.slice(0, 8)); 
                }

            } catch (error) {
                console.error("Error al cargar novedades:", error);
            } finally {
                if (isMounted) setCargando(false);
            }
        };

        cargarNovedades();

        return () => {
            isMounted = false;
        };
    }, []);

    const navigationFeatures = [
        { title: "Catálogo", desc: "Explorar libros", size: "col-span-1", bg: "bg-lib-dark text-white", path: "/catalogo" },
        { title: "Préstamos", desc: "Ver mis pedidos", size: "col-span-1", bg: "bg-white text-gray-800", path: "/prestamos" }, 
        { title: "Renovar", desc: "Extender plazos", size: "col-span-1", bg: "bg-green-50 text-lib-dark", path: "/", arrow: "group-hover:text-white" },
        { title: "Alertas", desc: "Avisos hoy", size: "col-span-1", bg: "bg-gray-100 text-gray-500", path: "/" },
    ];

    return (
        <main className="pb-20 bg-lib-cream min-h-screen">
            <header className="relative h-115 mx-10 mt-8 rounded-[40px] overflow-hidden bg-gray-900 shadow-xl">
                <img
                    src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=2000"
                    className="absolute inset-0 w-full h-full object-cover opacity-40 transition-transform duration-1000 hover:scale-105"
                    alt="Library Background"
                />
                <div className="relative h-full flex items-center justify-between px-20 text-white">
                    <div className="max-w-xl">
                        <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[9px] font-bold tracking-[0.2em] uppercase mb-4 border border-white/20">
                            Biblioteca Digital
                        </span>
                        <h2 className="text-5xl font-serif italic mb-6 leading-tight">Historias que inspiran, <br /> conocimiento que transforma.</h2>
                    </div>

                    <div className="bg-white/10 backdrop-blur-xl p-6 rounded-4xl w-64 text-white border border-white/20">
                        <h3 className="font-bold text-[10px] tracking-widest uppercase mb-4 opacity-70">Horario de Atención</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center border-b border-white/10 pb-1">
                                <p className="text-[10px] opacity-60">Lun - Vie</p>
                                <p className="text-sm font-bold">08:00 - 20:00</p>
                            </div>
                            <p className="text-[9px] text-red-300 font-bold uppercase tracking-tighter">Fines de semana: Cerrado</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Sección de tarjetas de inicio */}
            <section className="max-w-250 mx-auto px-10 py-10">
                <div className="grid grid-cols-4 gap-3">
                    {navigationFeatures.map((f, i) => (
                        <button
                            key={i}
                            onClick={() => router.push(f.path)}
                            className={`${f.size} ${f.bg} p-5 rounded-3xl border border-black/10 flex flex-col justify-between items-start text-left transition-all duration-300 hover:scale-[0.96] hover:shadow-lg group relative`}
                        >
                            <div>
                                <h4 className="text-sm font-bold">{f.title}</h4>
                                <p className="text-[10px] opacity-60 font-medium">{f.desc}</p>
                            </div>
                            <div className="mt-4 w-7 h-7 rounded-full border border-current flex items-center justify-center group-hover:bg-current transition-colors">
                                <span className={`text-xs transition-colors ${f.arrow || (f.bg.includes('dark') ? 'group-hover:text-lib-dark' : 'group-hover:text-white')}`}>
                                    <ArrowRightIcon size={15}/>
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            <div className="max-w-350 mx-auto px-10 grid grid-cols-12 gap-10">
                <aside className="col-span-3">
                    <div className="sticky top-24 bg-white p-8 rounded-4xl border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-lg mb-6 font-serif italic text-lib-dark">Explorar Géneros</h3>
                        <ul className="space-y-4">
                            {["Ficción", "Clásico", "Fantasía", "Misterio", "Ciencia Ficción"].map(g => (
                                <li key={g} className="group flex justify-between items-center cursor-pointer">
                                    <span className="text-xs font-bold text-gray-400 group-hover:text-lib-dark transition-colors">{g}</span>
                                    <span className="bg-lib-accent text-lib-dark px-2 py-0.5 rounded-full text-[9px] font-black group-hover:bg-lib-dark group-hover:text-white transition-all">
                                        10+
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>

                <section className="col-span-9 bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <span className="text-[9px] font-black tracking-[0.2em] text-lib-dark/30 uppercase">Catálogo Digital</span>
                            <h2 className="text-3xl font-serif italic text-lib-dark">Novedades</h2>
                        </div>

                        <button
                            onClick={() => router.push('/catalogo')}
                            className="group flex items-center gap-3 py-2 px-4 rounded-full border border-gray-100 hover:border-lib-dark transition-all duration-300 shadow-sm"
                        >
                            <span className="text-[10px] font-black tracking-widest text-gray-400 group-hover:text-lib-dark transition-colors">
                                VER TODO EL CATÁLOGO
                            </span>
                            <div className="w-8 h-8 rounded-full bg-lib-accent flex items-center justify-center group-hover:bg-lib-dark transition-colors">
                                <span className="text-lib-dark group-hover:text-white text-xs transition-colors"><ArrowRightIcon size={20}/></span>
                            </div>
                        </button>
                    </div>

                    {/* Renderizado de las tarjetas con CardLibro */}
                    <div className="grid grid-cols-4 gap-x-6 gap-y-10">
                        {cargando ? (
                            <p className="col-span-4 text-center text-sm text-gray-400 py-10">Cargando novedades...</p>
                        ) : libros.length === 0 ? (
                            <p className="col-span-4 text-center text-sm text-gray-400 py-10">Aún no hay libros registrados.</p>
                        ) : (
                            libros.map(l => (
                                <CardLibro
                                    key={l.id}
                                    id={l.id}
                                    titulo={l.titulo}
                                    autor={l.autor}
                                    img={l.img || ""}
                                    disp={l.cantidad} 
                                    genero={l.categoria} 
                                    perfil={perfil}
                                />
                            ))
                        )}
                    </div>

                    <div className="mt-16 pt-8 border-t border-gray-50 flex justify-center">
                        <button className="text-[10px] font-black tracking-[0.3em] text-gray-400 hover:text-lib-dark transition-all flex flex-col items-center gap-3">
                            <span className="animate-bounce"><ArrowDownIcon size={20}/></span>
                            DESLIZAR PARA CARGAR MÁS LIBROS
                        </button>
                    </div>
                </section>
            </div>
        </main>
    );
};

export default Home;