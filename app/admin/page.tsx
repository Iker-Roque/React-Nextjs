"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircleIcon, XCircleIcon, MagnifyingGlassIcon, FolderOpenIcon, ClipboardTextIcon, WarningCircleIcon } from "@phosphor-icons/react";

export default function AdminDashboard() {
  const [libros, setLibros] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [busquedaId, setBusquedaId] = useState('');
  const [busquedaInventario, setBusquedaInventario] = useState('');
  const [activeTab, setActiveTab] = useState<'register' | 'import' | 'inventory' | 'loans' | 'users'>('inventory');


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

  //Funcion de sancion


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


  // Función para cambiar el estado en Supabase
  const handleActualizarEstado = async (prestamoId: number, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from('prestamos')
        .update({ estado: nuevoEstado })
        .eq('id', prestamoId);

      if (error) throw error;

      mostrarNotificacion(`Préstamo marcado como ${nuevoEstado}`, 'exito');
      fetchAllPrestamos(); // Recarga la tabla de préstamos
      if (nuevoEstado === 'devuelto') fetchLibros(); // Recarga el stock de libros
    } catch (error: any) {
      console.error("Error al actualizar:", error);
      mostrarNotificacion(error.message || "Error al actualizar el estado", "error");
    }
  };

  // Función para activar/desactivar la visibilidad de un libro
  const handleToggleEstadoLibro = async (libroId: number, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'inactivo' ? 'activo' : 'inactivo';

    try {
      const { error } = await supabase
        .from('libros')
        .update({ estado_libro: nuevoEstado })
        .eq('id', libroId);

      if (error) throw error;

      mostrarNotificacion(
        `Libro ${nuevoEstado === 'activo' ? 'activado para el catálogo' : 'desactivado del catálogo'}`,
        'exito'
      );
      fetchLibros(); // Recarga el inventario para ver los cambios
    } catch (error: any) {
      console.error("Error al cambiar estado del libro:", error);
      mostrarNotificacion("Error al cambiar el estado del libro", "error");
    }
  };

  // --- CONTROL DE USUARIOS ---
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [busquedaUsuario, setBusquedaUsuario] = useState('');
  const [modalUsuario, setModalUsuario] = useState<{ id: string, nombre: string, infracciones: number } | null>(null);
  const [motivoSuspension, setMotivoSuspension] = useState('');

  const fetchUsuarios = async () => {
    try {
      // Ordenamos por nombre para que la lista siempre se vea igual
      const { data, error } = await supabase.from('perfiles').select('*').order('nombre_completo');
      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
    }
  };

  // --- FUNCIÓN PARA REHABILITAR ---
  const handleEstadoUsuario = async (userId: string, nuevoEstado: string, motivo: string | null = null) => {

    // 1. ACTUALIZACIÓN VISUAL INSTANTÁNEA (Esto hace que el botón y el texto cambien al instante)
    setUsuarios(prevUsuarios => prevUsuarios.map(u =>
      u.id === userId
        ? { ...u, estado_cuenta: nuevoEstado, infracciones: nuevoEstado === 'activo' ? 0 : u.infracciones, motivo_estado: motivo }
        : u
    ));

    try {
      const updateData: any = {
        estado_cuenta: nuevoEstado,
        motivo_estado: motivo
      };

      if (nuevoEstado === 'activo') updateData.infracciones = 0;

      const { error } = await supabase.from('perfiles').update(updateData).eq('id', userId);

      if (error) throw error;

      mostrarNotificacion('Cuenta rehabilitada. Infracciones reiniciadas a 0.', 'exito');
      setModalUsuario(null);
      setMotivoSuspension('');

    } catch (error: any) {
      mostrarNotificacion("Error al actualizar estado", "error");
      fetchUsuarios(); // Si falla la base de datos, regresamos la pantalla a la normalidad
    }
  };

  // --- FUNCIÓN PARA SANCIONAR ---
  const registrarInfraccion = async (usuarioId: string, infraccionesActuales: number, motivoSancion: string) => {
    const nuevasInfracciones = (infraccionesActuales || 0) + 1;
    const esInactivo = nuevasInfracciones >= 3;
    const motivoFinal = esInactivo
      ? `Cuenta suspendida por acumular 3 infracciones. (Última falta: ${motivoSancion})`
      : motivoSancion;

    // 1. ACTUALIZACIÓN VISUAL INSTANTÁNEA (Esto suma los números en vivo sin esperar)
    setUsuarios(prevUsuarios => prevUsuarios.map(u =>
      u.id === usuarioId
        ? { ...u, infracciones: nuevasInfracciones, estado_cuenta: esInactivo ? 'inactivo' : 'activo', motivo_estado: esInactivo ? motivoFinal : null }
        : u
    ));

    try {
      const { error } = await supabase
        .from('perfiles')
        .update({
          infracciones: nuevasInfracciones,
          estado_cuenta: esInactivo ? 'inactivo' : 'activo',
          motivo_estado: esInactivo ? motivoFinal : null
        })
        .eq('id', usuarioId);

      if (error) throw error;

      mostrarNotificacion(esInactivo ? "Usuario suspendido (Límite de infracciones)" : `Infracción registrada (Faltan ${3 - nuevasInfracciones} para suspensión)`, "exito");
      setModalUsuario(null);
      setMotivoSuspension('');

    } catch (error) {
      mostrarNotificacion("Error al registrar la infracción", "error");
      fetchUsuarios(); // Si falla la base de datos, regresamos la pantalla a la normalidad
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsuarios();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
      {/* HEADER */}
      <div className="mb-4">
        <h2 className="text-3xl font-bold text-lib-dark mb-2">Panel de Administración</h2>
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
        <button onClick={() => setActiveTab('users')} className={`px-6 py-4 font-semibold text-sm transition-all ${activeTab === 'users' ? 'text-lib-dark border-b-2 border-lib-dark' : 'text-gray-500 hover:text-gray-700'}`}>Control de Usuarios</button>
      </div>

      {/* TABLA DE INVENTARIO */}
      {activeTab === 'inventory' && (
        <div className="mb-8 flex justify-center w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full">
            <div className="p-8 border-b border-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Inventario de Libros</h3>
                  <p className="text-sm text-gray-500 mt-1">Total de libros: {libros.length}</p>
                </div>
                {/* BARRA DE BÚSQUEDA */}
                <input
                  type="text"
                  placeholder="Buscar por Título o Autor..."
                  value={busquedaInventario}
                  onChange={(e) => setBusquedaInventario(e.target.value)}
                  className="w-full md:max-w-xs p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark text-sm"
                />
              </div>
            </div>



            {libros.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-8 py-4 font-semibold text-gray-700 w-[30%]">Título</th> 
                      <th className="px-8 py-4 font-semibold text-gray-700 w-[20%]">Autor</th>  
                      <th className="px-8 py-4 font-semibold text-gray-700 w-[20%]">Categoría / Origen</th>
                      <th className="px-8 py-4 font-semibold text-gray-700 text-center w-[10%]">Stock</th>
                      <th className="px-8 py-4 font-semibold text-gray-700 text-center w-[10%]">Estado</th>
                      <th className="px-8 py-4 font-semibold text-gray-700 text-center w-[10%]">Acciones</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-50">
                    {/* FILTRO DE BÚSQUEDA APLICADO AQUÍ */}
                    {libros
                      .filter(libro =>
                        busquedaInventario === '' ||
                        (libro.titulo && libro.titulo.toLowerCase().includes(busquedaInventario.toLowerCase())) ||
                        (libro.autor && libro.autor.toLowerCase().includes(busquedaInventario.toLowerCase()))
                      )
                      .map((libro) => (
                        <tr key={libro.id} className={`hover:bg-gray-50 transition-colors ${libro.estado_libro === 'inactivo' ? 'bg-gray-50/70 opacity-60' : ''}`}>
                          <td className="px-8 py-4 font-bold text-gray-800">
                            {libro.titulo}
                            {libro.estado_libro === 'inactivo' && (
                              <span className="ml-2 inline-block px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-[9px] font-black uppercase tracking-wider">
                                Oculto
                              </span>
                            )}
                          </td>
                          <td className="px-8 py-4 text-gray-600">{libro.autor}</td>
                          <td className="px-8 py-4">
                            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium mb-1">
                              {libro.categoria}
                            </span>
                            <br />
                            <span className="text-[10px] font-bold text-gray-400 uppercase">
                              Origen: {libro.procedencia || 'Comprado'}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-center">
                            <p className="font-bold text-gray-800">{libro.disponibles}/{libro.cantidad}</p>
                            <p className="text-xs text-gray-400">disponibles</p>
                          </td>
                          <td className="px-8 py-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${libro.disponibles > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {libro.disponibles > 0 ? (
                                <><CheckCircleIcon size={16} weight="bold" /> Disponible</>
                              ) : (
                                <><XCircleIcon size={16} weight="bold" /> Agotado</>
                              )}
                            </span>
                          </td>

                          <td className="px-8 py-4 text-center">
                            <button
                              onClick={() => handleToggleEstadoLibro(libro.id, libro.estado_libro || 'activo')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer ${libro.estado_libro === 'inactivo'
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                              {libro.estado_libro === 'inactivo' ? 'Activar' : 'Desactivar'}
                            </button>
                          </td>
                        </tr>
                      ))}

                    {/* MENSAJE SI LA BÚSQUEDA NO ENCUENTRA NADA */}
                    {libros.filter(libro =>
                      busquedaInventario === '' ||
                      (libro.titulo && libro.titulo.toLowerCase().includes(busquedaInventario.toLowerCase())) ||
                      (libro.autor && libro.autor.toLowerCase().includes(busquedaInventario.toLowerCase()))
                    ).length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center justify-center">
                              <MagnifyingGlassIcon size={48} weight="light" className="text-gray-400 mb-3" />
                              <p className="text-base font-bold text-gray-800">No se encontraron libros</p>
                              <p className="text-sm text-gray-600 mt-1">No hay resultados para "{busquedaInventario}"</p>
                            </div>
                          </td>
                        </tr>
                      )}
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

        {/* TAB: REGISTRAR LIBRO */}
        {activeTab === 'register' && (
          <div className="mb-8 flex justify-center w-full">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl w-full">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">Registrar Nuevo Libro</h3>
            <form onSubmit={handleAgregarLibro} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Título del Libro *</label>
                <input type="text" placeholder="Ej: El Quijote" required value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark focus:border-transparent text-sm" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Autor *</label>
                <input type="text" placeholder="Ej: Miguel de Cervantes" required value={form.autor} onChange={e => setForm({ ...form, autor: e.target.value })} className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark focus:border-transparent text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ISBN *</label>
                  <input type="text" placeholder="978-8408043347" required value={form.isbn} onChange={e => setForm({ ...form, isbn: e.target.value })} className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark focus:border-transparent text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cantidad *</label>
                  <input type="number" placeholder="5" required value={form.cantidad} onChange={e => setForm({ ...form, cantidad: Number(e.target.value) })} className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark focus:border-transparent text-sm" />
                </div>
              </div>

              {/* GRID PARA CATEGORÍA Y PROCEDENCIA (DISEÑO MEJORADO) */}
              <div className="grid grid-cols-2 gap-4">
                {/* CATEGORÍA (Intacta) */}
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

                {/* PROCEDENCIA (Combo Personalizado Tailwind) */}
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Procedencia (Origen) *</label>

                  {/* Botón del Combo */}
                  <div
                    onClick={() => setIsOpenProcedencia(!isOpenProcedencia)}
                    className={`w-full p-3 bg-gray-50 rounded-lg border ${isOpenProcedencia ? 'border-lib-dark ring-2 ring-lib-dark' : 'border-gray-200'} outline-none text-sm cursor-pointer flex justify-between items-center transition-all hover:bg-gray-100`}
                  >
                    <span className="text-gray-700">{form.procedencia}</span>
                    <svg className={`fill-current h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpenProcedencia ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
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
                          className={`relative p-3 pl-4 text-sm cursor-pointer transition-colors hover:bg-gray-50 ${form.procedencia === opcion
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
          </div>
        )}

        {/* TAB: IMPORTAR CSV */}
        {activeTab === 'import' && (
          <div className="mb-8 flex justify-center w-full">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl w-full">
            <h3 className="text-2xl font-bold mb-6 text-gray-800">Importar Libros desde CSV</h3>

            <div className="mb-6 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-lib-dark hover:bg-blue-50 transition-colors cursor-pointer">
              <label htmlFor="csv-upload" className="cursor-pointer block">
                <div className="flex justify-center mb-3 text-gray-600">
                  <FolderOpenIcon size={64} weight="light" />
                </div>
                <p className="text-base font-semibold text-gray-700 mb-1">Arrastra tu archivo CSV aquí</p>
                <p className="text-sm text-gray-400">o haz clic para seleccionar un archivo</p>
                <input id="csv-upload" type="file" accept=".csv" onChange={handleImportCSV} disabled={importLoading} className="hidden" />
              </label>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-blue-900 mb-3">
                  <ClipboardTextIcon size={20} weight="bold" /> Formato esperado del CSV
                </p>
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
          </div>
        )}

      {/* TAB: VER PRÉSTAMOS (Buscador y Botón de Acción) */}
      {activeTab === 'loans' && (
        <div className='flex justify-center w-full'>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full">
          

          {/* CABECERA CON BUSCADOR */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h3 className="text-2xl font-bold text-gray-800">Historial de Préstamos Globales</h3>
            <input
              type="text"
              placeholder="Buscar por ID o DNI..."
              value={busquedaId}
              onChange={(e) => setBusquedaId(e.target.value)}
              className="w-full md:max-w-xs p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark text-sm"
            />
          </div>

          {allPrestamos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 font-semibold text-gray-700">ID</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Libro</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Usuario ID (DNI)</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Fecha Solicitud</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Vencimiento</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">Estado</th>
                    <th className="px-6 py-4 font-semibold text-gray-700 text-center">Acciones</th>
                  </tr>
                </thead>

                {/*Barra de busqueda*/}
                <tbody className="divide-y divide-gray-50">
                  {(() => {
                    const filtrados = allPrestamos.filter(p =>
                      busquedaId === '' ||
                      p.id?.toString().includes(busquedaId) ||
                      p.dni_usuario?.includes(busquedaId)
                    );

                    if (filtrados.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <MagnifyingGlassIcon size={48} weight="light" className="text-gray-400 mb-3" />
                              <p className="text-base font-bold text-gray-800">No se encontraron resultados</p>
                              <p className="text-sm text-gray-600 mt-1">
                                No hay préstamos que coincidan con "{busquedaId}"
                              </p>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return filtrados.map((p) => {
                      const estaVencido = p.fecha_vencimiento && p.estado === 'prestado' && new Date() > new Date(p.fecha_vencimiento);

                      return (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900">#{p.id}</td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-800">{p.libro?.titulo || 'Libro desconocido'}</p>
                            <p className="text-xs text-gray-500">ID: {p.libro?.id || p.libroId}</p>
                          </td>
                          <td className="px-6 py-4 font-mono text-gray-600">{p.dni_usuario}</td>
                          <td className="px-6 py-4 text-gray-600">{new Date(p.fecha_prestamo).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-gray-600">{p.fecha_vencimiento ? new Date(p.fecha_vencimiento).toLocaleDateString() : 'N/A'}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${p.estado === 'solicitado' ? 'bg-yellow-100 text-yellow-700' :
                                p.estado === 'prestado' ? 'bg-blue-100 text-blue-700' :
                                  p.estado === 'devuelto' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                {p.estado}
                              </span>
                              {estaVencido && (
                                <span className="inline-block px-2 py-1 rounded-full text-[10px] font-bold bg-red-600 text-white animate-pulse shadow-sm">
                                  ⚠️ Vencido
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {p.estado === 'solicitado' && (
                              <span className="text-gray-400 text-xs font-bold animate-pulse">Procesando...</span>
                            )}

                            {p.estado === 'prestado' && (
                              <button
                                onClick={() => handleActualizarEstado(p.id, 'devuelto')}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                              >
                                Marcar Devuelto
                              </button>
                            )}

                            {p.estado === 'devuelto' && (
                              <span className="text-gray-400 text-xs font-bold">Completado</span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No hay solicitudes de préstamos registradas del sistema.</p>
          )}
        </div>
        </div>
      )}

      {/* TAB: CONTROL DE USUARIOS */}
      {activeTab === 'users' && (
        <div className='flex justify-center w-full'>
        <div className="relative bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full overflow-hidden mb-8">

          {/* VENTANA EMERGENTE (MODAL) DE INFRACCIÓN */}
          {modalUsuario && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm p-4">
              <div className="bg-white p-6 rounded-2xl shadow-2xl border border-red-100 w-full max-w-md animate-fade-in">
                <h4 className="text-xl font-bold text-gray-800 mb-2">Registrar Infracción</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Aplicando sanción a: <span className="font-bold">{modalUsuario.nombre}</span>
                </p>
                <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-xs font-bold border border-yellow-200">
                  Faltas actuales: {modalUsuario.infracciones} / 3
                  {modalUsuario.infracciones === 2 && " (¡Advertencia: Esta falta suspenderá la cuenta!)"}
                </div>

                <label className="block text-sm font-semibold text-gray-700 mb-2">Motivo de la falta *</label>
                <textarea
                  autoFocus
                  placeholder="Ej: Devolvió el libro con retraso de 3 días..."
                  value={motivoSuspension}
                  onChange={(e) => setMotivoSuspension(e.target.value)}
                  className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-red-500 text-sm mb-4 resize-none h-24"
                />

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => { setModalUsuario(null); setMotivoSuspension(''); }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={motivoSuspension.trim() === ''}
                    onClick={() => registrarInfraccion(modalUsuario.id, modalUsuario.infracciones, motivoSuspension.trim())}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    Registrar Falta
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h3 className="text-2xl font-bold text-gray-800">Control de Usuarios Registrados</h3>
            <input
              type="text"
              placeholder="Buscar por Nombre o DNI..."
              value={busquedaUsuario}
              onChange={(e) => setBusquedaUsuario(e.target.value)}
              className="w-full md:max-w-xs p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark text-sm"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 font-semibold text-gray-700">Nombre Completo</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">DNI</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-center">Numero de Sanciones</th>
                  <th className="px-6 py-4 font-semibold text-gray-700">Estado de Cuenta</th>
                  <th className="px-6 py-4 font-semibold text-gray-700 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usuarios
                  .filter(u => u.rol !== 'admin')
                  .filter(u => busquedaUsuario === '' || u.dni?.includes(busquedaUsuario) || u.nombre_completo?.toLowerCase().includes(busquedaUsuario.toLowerCase()))
                  .map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-800">{usuario.nombre_completo || 'Sin nombre'}</td>
                      <td className="px-6 py-4 text-gray-600 font-mono">{usuario.dni || 'N/A'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-gray-700">{usuario.infracciones || 0} / 3</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${usuario.estado_cuenta === 'inactivo'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-green-100 text-green-700 border border-green-200'
                            }`}>
                            {usuario.estado_cuenta === 'inactivo' ? 'Suspendido' : 'Activo'}
                          </span>

                          {usuario.estado_cuenta === 'inactivo' && usuario.motivo_estado && (
                            <span className="text-[10px] text-red-600 font-semibold max-w-45 leading-tight">
                              Motivo: {usuario.motivo_estado}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {usuario.estado_cuenta === 'inactivo' ? (
                          <button
                            onClick={() => handleEstadoUsuario(usuario.id, 'activo', null)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                          >
                            Rehabilitar Cuenta
                          </button>
                        ) : (
                          <button
                            onClick={() => setModalUsuario({ id: usuario.id, nombre: usuario.nombre_completo, infracciones: usuario.infracciones || 0 })}
                            className="px-4 py-2 bg-gray-100 text-black rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                          >
                            Sancionar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}