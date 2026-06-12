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

  // Estados para el formulario
  const [form, setForm] = useState({
    titulo: '',
    autor: '',
    isbn: '',
    cantidad: 1,
    categoria: ''
  });

  // notificacion de Guardado de libro Formulario y de importacion de CSV
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'exito' });

  const mostrarNotificacion = (mensaje: string, tipo: 'exito' | 'error' = 'exito') => {
    setNotificacion({ visible: true, mensaje, tipo });
    setTimeout(() => setNotificacion({ visible: false, mensaje: '', tipo: 'exito' }), 3000); // Desaparece en 3 segundos
  };

  const [allPrestamos, setAllPrestamos] = useState<any[]>([]);

  const fetchAllPrestamos = async () => {
    try {
      console.log("Solicitando préstamos al servidor Next.js...");
      const res = await fetch('/api/prestamos');

      if (res.ok) {
        const data = await res.json();
        console.log("Datos recibidos:", data);
        setAllPrestamos(data);
      } else {
        console.error("El servidor respondió, pero con error:", res.status);
      }
    } catch (error) {
      console.error("Error al obtener préstamos:", error);
    }
  };

  useEffect(() => {
    if (activeTab === 'loans') fetchAllPrestamos();
  }, [activeTab]);

  // Cargar libros al iniciar
  useEffect(() => {
    fetchLibros();
  }, []);

  const fetchLibros = async () => {
    try {
      const res = await fetch('/api/libros');

      if (!res.ok) throw new Error("Error al obtener el inventario del servidor");

      const data = await res.json();

      // Ordenamos para que los libros más nuevos aparezcan arriba 
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
      // Armar el objeto que espera la API
      const nuevoLibro = {
        titulo: form.titulo,
        autor: form.autor,
        isbn: form.isbn,
        cantidad: Number(form.cantidad),
        categoria: form.categoria
      };

      const res = await fetch('/api/libros', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(nuevoLibro)
      });

      if (!res.ok) throw new Error("Fallo al registrar el libro en el servidor.");

      // --- CAMBIOS AQUÍ (Éxito) ---
      mostrarNotificacion("¡Libro agregado correctamente!", "exito");
      setForm({ titulo: '', autor: '', isbn: '', cantidad: 1, categoria: '' }); // Limpia el formulario
      fetchLibros(); // Refresca la tabla del inventario al instante

    } catch (error: any) {
      // --- CAMBIOS AQUÍ (Error) ---
      mostrarNotificacion(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Parsear CSV
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

  // Importar libros desde CSV
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

      // Validar que tenga las columnas necesarias
      const requiredFields = ['titulo', 'autor', 'isbn', 'cantidad', 'categoria'];
      const hasRequiredFields = requiredFields.every(field =>
        Object.keys(parsedData[0]).includes(field)
      );

      if (!hasRequiredFields) {
        setImportMessage(`El CSV debe contener las columnas: ${requiredFields.join(', ')}`);
        setImportLoading(false);
        return;
      }

      // Preparar datos para insertar
      const librosParaInsertar = parsedData.map((row: any) => ({
        titulo: row.titulo,
        autor: row.autor,
        isbn: row.isbn,
        cantidad: Number(row.cantidad) || 0,
        disponibles: Number(row.cantidad) || 0,
        categoria: row.categoria,
      }));

      // Insertar en Supabase
      const { error } = await supabase.from('libros').insert(librosParaInsertar);

      if (error) {
        setImportMessage(`Error al importar: ${error.message}`);
      } else {
        setImportMessage(`✓ Se importaron ${parsedData.length} libros correctamente`);
        fetchLibros();

        // Limpiar el input
        if (e.target) {
          e.target.value = '';
        }

        // Mostrar mensaje por 3 segundos
        setTimeout(() => setImportMessage(''), 3000);
      }
    } catch (error: any) {
      setImportMessage(`Error: ${error.message}`);
    }

    setImportLoading(false);
  };

  //Aceptar y rechazar préstamos (solo para el admin)

  const handleAprobar = async (id: number) => {
    try {
      const res = await fetch(`/api/prestamos/${id}/aprobar`, {
        method: 'PUT'
      });
      if (res.ok) {
        fetchAllPrestamos(); // Refresca la tabla automáticamente
      }
    } catch (error) {
      console.error("Error de conexión al aprobar:", error);
    }
  };

  const handleRechazar = async (id: number) => {
    try {
      const res = await fetch(`/api/prestamos/${id}/rechazar`, {
        method: 'PUT'
      });
      if (res.ok) {
        fetchAllPrestamos(); // Refresca la tabla y devuelve el stock
      }
    } catch (error) {
      console.error("Error de conexión al rechazar:", error);
    }
  };

  return (

    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-8">
      {/* HEADER */}
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-lib-dark mb-2">Panel de Administración</h2>
        <p className="text-gray-500">Gestiona tu catálogo de libros de forma eficiente</p>
      </div>

      {/* NOTIFICACIONES DE REGISTRO Y IMPORTACIÓN */}
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
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-6 py-4 font-semibold text-sm transition-all ${activeTab === 'inventory'
            ? 'text-lib-dark border-b-2 border-lib-dark'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Inventario ({libros.length})
        </button>
        <button
          onClick={() => setActiveTab('register')}
          className={`px-6 py-4 font-semibold text-sm transition-all ${activeTab === 'register'
            ? 'text-lib-dark border-b-2 border-lib-dark'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Registrar Libro
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`px-6 py-4 font-semibold text-sm transition-all ${activeTab === 'import'
            ? 'text-lib-dark border-b-2 border-lib-dark'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Importar CSV
        </button>


        <button
          onClick={() => setActiveTab('loans')}
          className={`px-6 py-4 font-semibold text-sm transition-all ${activeTab === 'loans'
            ? 'text-lib-dark border-b-2 border-lib-dark'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Ver Préstamos Solicitados
        </button>
      </div>

      {/* CONTENIDO DE LOS TABS */}
      <div className="mb-8 flex justify-center">
        {/* TAB: REGISTRAR LIBRO */}
        {activeTab === 'register' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl w-full">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">Registrar Nuevo Libro</h3>
            <form onSubmit={handleAgregarLibro} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Título del Libro *</label>
                <input
                  type="text" placeholder="Ej: El Quijote" required
                  value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })}
                  className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Autor *</label>
                <input
                  type="text" placeholder="Ej: Miguel de Cervantes" required
                  value={form.autor} onChange={e => setForm({ ...form, autor: e.target.value })}
                  className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark focus:border-transparent text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ISBN *</label>
                  <input
                    type="text" placeholder="978-8408043347" required
                    value={form.isbn} onChange={e => setForm({ ...form, isbn: e.target.value })}
                    className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cantidad *</label>
                  <input
                    type="number" placeholder="5" required
                    value={form.cantidad} onChange={e => setForm({ ...form, cantidad: Number(e.target.value) })}
                    className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría *</label>
                <input
                  type="text" placeholder="Ej: Clásicos, Ficción, Infantil" required
                  value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
                  className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark focus:border-transparent text-sm"
                />
              </div>

              <button
                disabled={loading}
                className="w-full bg-lib-dark text-white py-3 rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-md disabled:opacity-50"
              >
                {loading ? '⏳ Guardando...' : '✓ Guardar Libro'}
              </button>
            </form>
          </div>
        )}

        {/* TAB: IMPORTAR CSV */}
        {activeTab === 'import' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl w-full">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">Importar Libros desde CSV</h3>

            {/* ZONA DE ARRASTRE */}
            <div className="mb-6 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-lib-dark hover:bg-blue-50 transition-colors cursor-pointer">
              <label htmlFor="csv-upload" className="cursor-pointer block">
                <div className="text-5xl mb-3">📁</div>
                <p className="text-base font-semibold text-gray-700 mb-1">Arrastra tu archivo CSV aquí</p>
                <p className="text-sm text-gray-400">o haz clic para seleccionar un archivo</p>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  disabled={importLoading}
                  className="hidden"
                />
              </label>
            </div>

            {/* MENSAJE DE ESTADO */}
            {importMessage && (
              <div className={`mb-6 p-4 rounded-xl text-sm font-medium border ${importMessage.startsWith('✓')
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                {importMessage}
              </div>
            )}

            {/* INFORMACIÓN DEL FORMATO */}
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-900 mb-3">📋 Formato esperado del CSV</p>
                <div className="bg-white rounded-lg p-3 mb-3 border border-blue-100">
                  <p className="text-xs font-mono text-gray-700">titulo,autor,isbn,cantidad,categoria</p>
                </div>
                <p className="text-xs text-blue-800 font-medium mb-2">Ejemplo:</p>
                <div className="bg-white rounded-lg p-3 border border-blue-100">
                  <p className="text-xs font-mono text-gray-700">El Quijote,Miguel de Cervantes,978-8408,5,Clásicos</p>
                </div>
              </div>

              {/* BOTÓN DE DESCARGAR PLANTILLA */}
              <a
                href="/libros_ejemplo.csv"
                download="libros_ejemplo.csv"
                className="inline-flex items-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors text-sm"
              >
                📥 Descargar plantilla de ejemplo
              </a>
            </div>
          </div>
        )}
      </div>

      {/* TAB: VER PRÉSTAMOS */}
      {activeTab === 'loans' && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full overflow-hidden mb-8">
          <h3 className="text-2xl font-bold mb-6 text-gray-800">Historial de Préstamos Globales</h3>
          {allPrestamos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 font-semibold text-gray-700">Libro ID</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Usuario ID</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Fecha Solicitud</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Estado</th>
                    <th className="px-6 py-4 font-semibold text-gray-700 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {allPrestamos.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-800">{p.libro?.id || p.libroId}</td>
                      <td className="px-6 py-4 text-gray-800 font-bold">{p.dni_usuario}</td>
                      <td className="px-6 py-4 text-gray-500">{new Date(p.fecha_prestamo).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${p.estado === 'solicitado' ? 'bg-yellow-100 text-yellow-700' :
                          p.estado === 'prestado' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                          {p.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {/* Botones condicionales: Solo aparecen si está "solicitado" */}
                        {p.estado === 'solicitado' && (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleAprobar(p.id)}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                            >
                              ✓ Entregar
                            </button>
                            <button
                              onClick={() => handleRechazar(p.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                            >
                              ✕ Rechazar
                            </button>
                          </div>
                        )}
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

      {/* TABLA DE INVENTARIO - SIEMPRE VISIBLE */}
      {activeTab === 'inventory' && (
        <div className="flex justify-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full">
            <div className="p-8 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Inventario de Libros</h3>
                  <p className="text-sm text-gray-500 mt-1">Total de libros: {libros.length}</p>
                </div>
                {libros.length === 0 && (
                  <div className="text-right">
                    <p className="text-sm text-gray-500">No hay libros registrados</p>
                  </div>
                )}
              </div>
            </div>

            {libros.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-8 py-4 font-semibold text-gray-700">Título</th>
                      <th className="px-8 py-4 font-semibold text-gray-700">Autor</th>
                      <th className="px-8 py-4 font-semibold text-gray-700">Categoría</th>
                      <th className="px-8 py-4 font-semibold text-gray-700 text-center">Stock</th>
                      <th className="px-8 py-4 font-semibold text-gray-700 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {libros.map((libro) => (
                      <tr key={libro.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-8 py-4">
                          <p className="font-semibold text-gray-800">{libro.titulo}</p>
                        </td>
                        <td className="px-8 py-4 text-gray-600">{libro.autor}</td>
                        <td className="px-8 py-4">
                          <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            {libro.categoria}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-center">
                          <p className="font-semibold text-gray-800">{libro.disponibles}/{libro.cantidad}</p>
                          <p className="text-xs text-gray-400">disponibles</p>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <span className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold ${libro.disponibles > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                            }`}>
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