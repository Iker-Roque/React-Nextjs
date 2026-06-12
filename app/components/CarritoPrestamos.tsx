"use client";

import { useState, useEffect } from 'react';
import { BookIcon, XIcon} from '@phosphor-icons/react';
import { supabase } from '@/lib/supabaseClient';

const CarritoPrestamos = () => {
  const [abierto, setAbierto] = useState(false);
  const [prestamos, setPrestamos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargarMisPrestamos = async () => {
    setCargando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const res = await fetch(`/api/prestamos/usuario/${session.user.id}`);
      if (res.ok) {
        const data = await res.json();
        setPrestamos(data);
      }
    } catch (error) {
      console.error("Error al cargar carrito:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (abierto) cargarMisPrestamos();
  }, [abierto]);

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="fixed bottom-10 right-6 bg-[#e4e2de] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-50 flex items-center justify-center cursor-pointer"
      >
        <span className="text-xl"><BookIcon size={24} color="black" /></span>
        {prestamos.length > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
            {prestamos.length}
          </span>
        )}
      </button>

      {abierto && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm cursor-pointer"
          onClick={() => setAbierto(false)}
        />
      )}

      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${abierto ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="font-bold text-lg text-gray-800">Mis Préstamos</h2>
          <button onClick={() => setAbierto(false)} className="text-gray-400 hover:text-red-500 font-bold text-xl cursor-pointer">
            <XIcon size={30}/> 
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cargando ? (
            <p className="text-center text-sm text-gray-500 mt-10">Cargando tus libros...</p>
          ) : prestamos.length === 0 ? (
            <p className="text-center text-sm text-gray-500 mt-10">Aún no has solicitado ningún libro.</p>
          ) : (
            prestamos.map((prestamo) => (
              <div key={prestamo.id} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                <p className="text-xs text-gray-800 font-bold mb-1">{prestamo.libro?.titulo?.replace(/['"]/g, '') || 'Libro desconocido'}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${prestamo.estado === 'solicitado' ? 'bg-yellow-100 text-yellow-700' :
                      prestamo.estado === 'devuelto' ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                    }`}>
                    {prestamo.estado}
                  </span>
                  <div className="text-right">
                    <p className="text-[9px] text-gray-400">
                      Pedido: {prestamo.fecha_prestamo ? new Date(prestamo.fecha_prestamo).toLocaleDateString() : 'N/A'}
                    </p>
                    <p className="text-[10px] font-bold text-red-500 mt-0.5">
                      Devolver: {
                        prestamo.fecha_devolucion
                          ? new Date(prestamo.fecha_devolucion).toLocaleDateString()
                          : (prestamo.fecha_prestamo ? new Date(new Date(prestamo.fecha_prestamo).setDate(new Date(prestamo.fecha_prestamo).getDate() + 7)).toLocaleDateString() : 'N/A')
                      }
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default CarritoPrestamos;