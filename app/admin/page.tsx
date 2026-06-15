"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircleIcon , XCircleIcon } from "@phosphor-icons/react";

export default function AdminDashboard() {
  const [libros, setLibros] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'register' | 'import' | 'inventory' | 'loans'>('inventory');

  const [form, setForm] = useState({
    titulo: '',
    autor: '',
    isbn: '',
    cantidad: 1,
    categoria: '',
    procedencia: 'Comprado' 
  });

  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'exito' });
  const [isOpenProcedencia, setIsOpenProcedencia] = useState(false);

  const mostrarNotificacion = (mensaje: string, tipo: 'exito' | 'error' = 'exito') => {
    setNotificacion({ visible: true, mensaje, tipo });
    setTimeout(() => setNotificacion({ visible: false, mensaje: '', tipo: 'exito' }), 3000);
  };

  const [allPrestamos, setAllPrestamos] = useState<any[]>([]);

  const fetchAllPrestamos = async () => {
    try {
      const res = await fetch('/api/prestamos');
      if (res.ok) {
        const data = await res.json();
        setAllPrestamos(data);
      }
    } catch (error) {
      console.error("Error al obtener préstamos:", error);
    }
  };

  useEffect(() => {
    if (activeTab === 'loans') fetchAllPrestamos();
  }, [activeTab]);

  useEffect(() => {
    fetchLibros();
  }, []);

  const fetchLibros = async () => {
    try {
      const res = await fetch('/api/libros');
      if (!res.ok) throw new Error("Error al obtener el inventario");
      const data = await res.json();
      const dataOrdenada = data.sort((a: any, b: any) => b.id - a.id);
      setLibros(dataOrdenada);
    } catch (error) {
      console.error("Error conectando con la API:", error);
    }
  };

  const handleAgregarLibro = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const nuevoLibro = {
        titulo: form.titulo,
        autor: form.autor,
        isbn: form.isbn,
        cantidad: Number(form.cantidad),
        categoria: form.categoria,
        procedencia: form.procedencia
      };

      const res = await fetch('/api/libros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoLibro)
      });

      if (!res.ok) throw new Error("Fallo al registrar el libro en el servidor.");

      mostrarNotificacion("¡Libro agregado correctamente!", "exito");
      setForm({ titulo: '', autor: '', isbn: '', cantidad: 1, categoria: '', procedencia: 'Comprado' }); 
      fetchLibros(); 

    } catch (error: any) {
      mostrarNotificacion(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      const values = lines[i].split(',').map(v => v.trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      data.push(obj);
    }
    return data;
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportMessage('');

    try {
      const text = await file.text();
      const parsedData = parseCSV(text);

      if (parsedData.length === 0) {
        setImportMessage('El archivo CSV está vacío');
        setImportLoading(false);
        return;
      }

      const requiredFields = ['titulo', 'autor', 'isbn', 'cantidad', 'categoria'];
      const hasRequiredFields = requiredFields.every(field =>
        Object.keys(parsedData[0]).includes(field)
      );

      if (!hasRequiredFields) {
        setImportMessage(`El CSV debe contener las columnas: ${requiredFields.join(', ')}`);
        setImportLoading(false);
        return;
      }

      const librosParaInsertar = parsedData.map((row: any) => ({
        titulo: row.titulo,
        autor: row.autor,
        isbn: row.isbn,
        cantidad: Number(row.cantidad) || 0,
        disponibles: Number(row.cantidad) || 0,
        categoria: row.categoria,
        procedencia: row.procedencia || 'Comprado' 
      }));

      const { error } = await supabase.from('libros').insert(librosParaInsertar);

      if (error) {
        setImportMessage(`Error al importar: ${error.message}`);
      } else {
        setImportMessage(`✓ Se importaron ${parsedData.length} libros correctamente`);
        fetchLibros();
        if (e.target) e.target.value = '';
        setTimeout(() => setImportMessage(''), 3000);
      }
    } catch (error: any) {
      setImportMessage(`Error: ${error.message}`);
    }
    setImportLoading(false);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-8">
      {/* HEADER */}
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-lib-dark mb-2">Panel de Administración</h2>
        <p className="text-gray-500">Gestiona tu catálogo de libros de forma eficiente</p>
      </div>

      {/* NOTIFICACIONES */}
      {notificacion.visible && (
        <div className={`fixed top-30 right-6 z-50 px-8 py-4 rounded-lg border flex items-center gap-2.5 text-sm font-medium shadow-sm transition-all ${notificacion.tipo === 'exito'
            ? 'bg-green-50 text-green-800 border-green-200'
            : 'bg-red-50 text-red-800 border-red-200'
          }`}>
          {notificacion.tipo === 'exito'
            ? <CheckCircleIcon size={18} weight="fill" />
            : <XCircleIcon size={18} weight="fill" />}
          {notificacion.mensaje}
        </div>
      )}

      {/* TABS */}
      <div className="mb-8 flex gap-4 border-b border-gray-200">
        <button onClick={() => setActiveTab('inventory')} className={`px-6 py-4 font-semibold text-sm transition-all ${activeTab === 'inventory' ? 'text-lib-dark border-b-2 border-lib-dark' : 'text-gray-500 hover:text-gray-700'}`}>Inventario ({libros.length})</button>
        <button onClick={() => setActiveTab('register')} className={`px-6 py-4 font-semibold text-sm transition-all ${activeTab === 'register' ? 'text-lib-dark border-b-2 border-lib-dark' : 'text-gray-500 hover:text-gray-700'}`}>Registrar Libro</button>
        <button onClick={() => setActiveTab('import')} className={`px-6 py-4 font-semibold text-sm transition-all ${activeTab === 'import' ? 'text-lib-dark border-b-2 border-lib-dark' : 'text-gray-500 hover:text-gray-700'}`}>Importar CSV</button>
        <button onClick={() => setActiveTab('loans')} className={`px-6 py-4 font-semibold text-sm transition-all ${activeTab === 'loans' ? 'text-lib-dark border-b-2 border-lib-dark' : 'text-gray-500 hover:text-gray-700'}`}>Ver Préstamos Solicitados</button>
      </div>

      <div className="mb-8 flex justify-center">
        {/* TAB: REGISTRAR LIBRO */}
        {activeTab === 'register' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl w-full">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">Registrar Nuevo Libro</h3>
            <form onSubmit={handleAgregarLibro} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Título del Libro *</label>
                <input type="text" placeholder="Ej: El Quijote" required value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark focus:border-transparent text-sm"/>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Autor *</label>
                <input type="text" placeholder="Ej: Miguel de Cervantes" required value={form.autor} onChange={e => setForm({ ...form, autor: e.target.value })} className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark focus:border-transparent text-sm"/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ISBN *</label>
                  <input type="text" placeholder="978-8408043347" required value={form.isbn} onChange={e => setForm({ ...form, isbn: e.target.value })} className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark focus:border-transparent text-sm"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cantidad *</label>
                  <input type="number" placeholder="5" required value={form.cantidad} onChange={e => setForm({ ...form, cantidad: Number(e.target.value) })} className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark focus:border-transparent text-sm"/>
                </div>
              </div>

              {/* GRID PARA CATEGORÍA Y PROCEDENCIA (DISEÑO MEJORADO) */}
              <div className="grid grid-cols-2 gap-4">
                {/* 1. CATEGORÍA (Intacta) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría *</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Clásicos" 
                    required 
                    value={form.categoria} 
                    onChange={e => setForm({ ...form, categoria: e.target.value })} 
                    className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark focus:border-transparent text-sm"
                  />
                </div>

                {/* 2. PROCEDENCIA (Combo Personalizado Tailwind) */}
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Procedencia (Origen) *</label>
                  
                  {/* Botón del Combo */}
                  <div
                    onClick={() => setIsOpenProcedencia(!isOpenProcedencia)}
                    className={`w-full p-3 bg-gray-50 rounded-lg border ${isOpenProcedencia ? 'border-lib-dark ring-2 ring-lib-dark' : 'border-gray-200'} outline-none text-sm cursor-pointer flex justify-between items-center transition-all hover:bg-gray-100`}
                  >
                    <span className="text-gray-700">{form.procedencia}</span>
                    <svg className={`fill-current h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpenProcedencia ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>

                  {/* Opciones del menú flotante */}
                  {isOpenProcedencia && (
                    <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-xl overflow-hidden">
                      {['Comprado', 'Donado', 'Canje', 'Reposición'].map((opcion) => (
                        <li
                          key={opcion}
                          onClick={() => {
                            setForm({ ...form, procedencia: opcion });
                            setIsOpenProcedencia(false);
                          }}
                          className={`relative p-3 pl-4 text-sm cursor-pointer transition-colors hover:bg-gray-50 ${
                            form.procedencia === opcion 
                              ? 'bg-gray-50 font-bold text-lib-dark' 
                              : 'text-gray-600'
                          }`}
                        >
                          {/* Línea indicadora redondeada */}
                          {form.procedencia === opcion && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-2/3 w-1.5 bg-lib-dark rounded-r-full"></span>
                          )}
                          {opcion}
                        </li>
                      ))}
                    </ul>
                  )}
                  
                  {/* Capa invisible para cerrar al hacer clic afuera */}
                  {isOpenProcedencia && (
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsOpenProcedencia(false)}
                    />
                  )}
                </div>
              </div>

              <button disabled={loading} className="w-full bg-lib-dark text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-md disabled:opacity-50 mt-4">
                {loading ? '⏳ Guardando...' : 'Guardar Libro'}
              </button>
            </form>
          </div>
        )}

        {/* TAB: IMPORTAR CSV */}
        {activeTab === 'import' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl w-full">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">Importar Libros desde CSV</h3>

            <div className="mb-6 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-lib-dark hover:bg-blue-50 transition-colors cursor-pointer">
              <label htmlFor="csv-upload" className="cursor-pointer block">
                <div className="text-5xl mb-3">📁</div>
                <p className="text-base font-semibold text-gray-700 mb-1">Arrastra tu archivo CSV aquí</p>
                <p className="text-sm text-gray-400">o haz clic para seleccionar un archivo</p>
                <input id="csv-upload" type="file" accept=".csv" onChange={handleImportCSV} disabled={importLoading} className="hidden" />
              </label>
            </div>

            {importMessage && (
              <div className={`mb-6 p-4 rounded-xl text-sm font-medium border ${importMessage.startsWith('✓') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {importMessage}
              </div>
            )}

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-900 mb-3">📋 Formato esperado del CSV</p>
                <div className="bg-white rounded-lg p-3 mb-3 border border-blue-100">
                  <p className="text-xs font-mono text-gray-700">titulo,autor,isbn,cantidad,categoria,procedencia</p>
                </div>
                <p className="text-xs text-blue-800 font-medium mb-2">Ejemplo:</p>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-xs font-mono text-gray-700">El Quijote,Miguel de Cervantes,978-8408,5,Clásicos,Donado</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TAB: VER PRÉSTAMOS (ACTUALIZADO: Nombre de libro + ID y sin Acciones) */}
      {activeTab === 'loans' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full overflow-hidden mb-8">
          <h3 className="text-2xl font-bold mb-6 text-gray-800">Historial de Préstamos Globales</h3>
          {allPrestamos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 font-semibold text-gray-700">Libro</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Usuario ID (DNI)</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Fecha Solicitud</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allPrestamos.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-800">{p.libro?.titulo || 'Libro desconocido'}</p>
                        <p className="text-xs text-gray-500">ID: {p.libro?.id || p.libroId}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-800 font-bold">{p.dni_usuario}</td>
                      <td className="px-6 py-4 text-gray-500">{new Date(p.fecha_prestamo).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${p.estado === 'solicitado' ? 'bg-yellow-100 text-yellow-700' : p.estado === 'prestado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {p.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No hay solicitudes de préstamos registradas del sistema.</p>
          )}
        </div>
      )}

      {/* TABLA DE INVENTARIO */}
      {activeTab === 'inventory' && (
        <div className="flex justify-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full">
            <div className="p-8 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Inventario de Libros</h3>
                  <p className="text-sm text-gray-500 mt-1">Total de libros: {libros.length}</p>
                </div>
              </div>
            </div>

            {libros.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-8 py-4 font-semibold text-gray-700">Título</th>
                      <th className="px-8 py-4 font-semibold text-gray-700">Autor</th>
                      <th className="px-8 py-4 font-semibold text-gray-700">Categoría / Origen</th>
                      <th className="px-8 py-4 font-semibold text-gray-700 text-center">Stock</th>
                      <th className="px-8 py-4 font-semibold text-gray-700 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {libros.map((libro) => (
                      <tr key={libro.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-8 py-4 font-semibold text-gray-800">{libro.titulo}</td>
                        <td className="px-8 py-4 text-gray-600">{libro.autor}</td>
                        <td className="px-8 py-4">
                          <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium mb-1">
                            {libro.categoria}
                          </span>
                          <br/>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            Origen: {libro.procedencia || 'Comprado'}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-center">
                          <p className="font-semibold text-gray-800">{libro.disponibles}/{libro.cantidad}</p>
                          <p className="text-xs text-gray-400">disponibles</p>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold ${libro.disponibles > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {libro.disponibles > 0 ? '✓ Disponible' : '✗ Agotado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p className="text-lg">No hay libros en el inventario</p>
                <p className="text-sm">Comienza registrando un nuevo libro o importando desde CSV</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}