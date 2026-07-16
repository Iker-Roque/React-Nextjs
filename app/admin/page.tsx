"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { CheckCircleIcon, XCircleIcon, MagnifyingGlassIcon, FolderOpenIcon, ClipboardTextIcon, WarningCircleIcon, ShieldCheckIcon, UserCircleIcon, BookOpenIcon, ClockCountdownIcon, TrendUpIcon, CaretDownIcon } from "@phosphor-icons/react";

export default function AdminDashboard() {
  const [libros, setLibros] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [busquedaId, setBusquedaId] = useState('');
  const [busquedaInventario, setBusquedaInventario] = useState('');
  const [activeTab, setActiveTab] = useState<'register' | 'import' | 'inventory' | 'loans' | 'users' | 'roles' | 'dashboard'>('inventory');

  // --- DASHBOARD DE PRÉSTAMOS ---
  const [dashMes, setDashMes] = useState<number | 'todos'>('todos');
  const [dashAnio, setDashAnio] = useState<number | 'todos'>('todos');
  const [isOpenDashMes, setIsOpenDashMes] = useState(false);
  const [isOpenDashAnio, setIsOpenDashAnio] = useState(false);


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
    if (activeTab === 'loans' || activeTab === 'dashboard' || activeTab === 'users') fetchAllPrestamos();
  }, [activeTab]);

  // --- VERIFICACIÓN AUTOMÁTICA DE PRÉSTAMOS VENCIDOS NO ENTREGADOS ---
  // Llama al endpoint del backend que revisa los préstamos vencidos y aplica
  // infracciones/suspensiones. Toda la lógica de negocio vive en el backend
  // (app/api/prestamos/verificar-vencidos/route.ts), el front solo dispara la acción.
  const [verificandoVencidos, setVerificandoVencidos] = useState(false);

  const verificarPrestamosVencidos = async () => {
    setVerificandoVencidos(true);
    try {
      const res = await fetch('/api/prestamos/verificar-vencidos', { method: 'POST' });
      if (!res.ok) throw new Error('Error al verificar préstamos vencidos');

      const data = await res.json();

      if (data.sanciones > 0) {
        mostrarNotificacion(`Se registraron ${data.sanciones} falta(s) por libros no entregados a tiempo`, 'exito');
        fetchAllPrestamos();
        fetchUsuarios();
      }
    } catch (error: any) {
      console.error("Error al verificar préstamos vencidos:", error);
    } finally {
      setVerificandoVencidos(false);
    }
  };

  // Corre automáticamente una vez al entrar al panel de administración
  useEffect(() => {
    verificarPrestamosVencidos();
  }, []);

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
  const [modalUsuario, setModalUsuario] = useState<{ id: string, nombre: string, infracciones: number, prestamosActivos: any[], prestamosVencidos: any[] } | null>(null);
  const [motivoSuspension, setMotivoSuspension] = useState('');
  const [prestamoDanadoSeleccionado, setPrestamoDanadoSeleccionado] = useState<number | null>(null);

  // Tipos de falta predefinidos con su plantilla de motivo (el admin puede editar el texto después)
  const tiposFalta: Record<string, string> = {
    'Retraso en la entrega': 'El usuario no entregó el libro dentro de la fecha límite.',
    'Libro dañado': 'El libro fue devuelto en mal estado (dañado).',
    'Libro perdido': 'El usuario no devolvió el libro (reportado como perdido).',
    'Comportamiento inadecuado': 'Comportamiento inadecuado dentro de la biblioteca.',
    'Otro': ''
  };
  const [tipoSancion, setTipoSancion] = useState('Otro');
  const [isOpenTipoSancion, setIsOpenTipoSancion] = useState(false);

  // Todas las sanciones (manuales y automáticas) se disparan desde Control de Usuarios.
  // Calcula los préstamos activos y vencidos del usuario para vincularlos a la sanción.
  const abrirModalSancion = (usuario: { id: string, nombre: string, infracciones: number }, forzarTardia = false) => {
    const prestamosDelUsuario = allPrestamos.filter((p: any) => p.usuario_id === usuario.id);
    const prestamosActivos = prestamosDelUsuario.filter((p: any) => p.estado === 'prestado');
    const prestamosVencidos = prestamosActivos.filter((p: any) =>
      p.fecha_vencimiento && new Date() > new Date(p.fecha_vencimiento) && !p.infraccion_aplicada
    );

    if (forzarTardia && prestamosVencidos.length > 0) {
      const titulos = prestamosVencidos.map((p: any) => p.libro?.titulo || 'Libro').join(', ');
      setTipoSancion('Retraso en la entrega');
      setMotivoSuspension(`${tiposFalta['Retraso en la entrega']} (${titulos})`);
    } else {
      setTipoSancion('Otro');
      setMotivoSuspension('');
    }

    setPrestamoDanadoSeleccionado(null);
    setModalUsuario({ id: usuario.id, nombre: usuario.nombre, infracciones: usuario.infracciones, prestamosActivos, prestamosVencidos });
  };

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
  const registrarInfraccion = async (
    usuarioId: string,
    infraccionesActuales: number,
    motivoSancion: string,
    opciones?: { prestamoDanadoId?: number | null; prestamosTardiosIds?: number[] }
  ) => {
    // Cualquier sanción suspende la cuenta de inmediato.
    // "nuevasInfracciones" ya no es un umbral, solo queda como historial de cuántas veces fue sancionado.
    const nuevasInfracciones = (infraccionesActuales || 0) + 1;
    const motivoFinal = `Cuenta suspendida por sanción: ${motivoSancion}`;

    // 1. ACTUALIZACIÓN VISUAL INSTANTÁNEA (Esto suma los números en vivo sin esperar)
    setUsuarios(prevUsuarios => prevUsuarios.map(u =>
      u.id === usuarioId
        ? { ...u, infracciones: nuevasInfracciones, estado_cuenta: 'inactivo', motivo_estado: motivoFinal }
        : u
    ));

    try {
      const { error } = await supabase
        .from('perfiles')
        .update({
          infracciones: nuevasInfracciones,
          estado_cuenta: 'inactivo',
          motivo_estado: motivoFinal
        })
        .eq('id', usuarioId);

      if (error) throw error;

      // Libro dañado: el libro ya está físicamente de vuelta, solo en mal estado -> se marca devuelto
      if (opciones?.prestamoDanadoId) {
        await supabase
          .from('prestamos')
          .update({ estado: 'devuelto', infraccion_aplicada: true })
          .eq('id', opciones.prestamoDanadoId);
      }

      // Entrega tardía: el libro puede seguir sin devolverse, solo marcamos que ya generó la falta
      // (para que la verificación automática de vencidos no lo vuelva a sancionar)
      if (opciones?.prestamosTardiosIds && opciones.prestamosTardiosIds.length > 0) {
        await supabase
          .from('prestamos')
          .update({ infraccion_aplicada: true })
          .in('id', opciones.prestamosTardiosIds);
      }

      if (opciones?.prestamoDanadoId || opciones?.prestamosTardiosIds?.length) {
        fetchAllPrestamos();
        fetchLibros();
      }

      mostrarNotificacion("Usuario suspendido por la sanción registrada", "exito");
      setModalUsuario(null);
      setMotivoSuspension('');
      setTipoSancion('Otro');
      setPrestamoDanadoSeleccionado(null);

    } catch (error) {
      mostrarNotificacion("Error al registrar la infracción", "error");
      fetchUsuarios(); // Si falla la base de datos, regresamos la pantalla a la normalidad
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsuarios();
  }, [activeTab]);

  // --- GESTIÓN DE ROLES ---
  const [busquedaRoles, setBusquedaRoles] = useState('');
  const [rolLoading, setRolLoading] = useState<string | null>(null);

  const handleCambiarRol = async (userId: string, nuevoRol: string) => {
    setRolLoading(userId);
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, rol: nuevoRol } : u));
    try {
      const { error } = await supabase.from('perfiles').update({ rol: nuevoRol }).eq('id', userId);
      if (error) throw error;
      mostrarNotificacion(`Rol cambiado a "${nuevoRol}" correctamente`, 'exito');
    } catch (error: any) {
      mostrarNotificacion("Error al cambiar el rol", "error");
      fetchUsuarios();
    } finally {
      setRolLoading(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'roles') fetchUsuarios();
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
        <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-4 font-semibold text-sm transition-all ${activeTab === 'dashboard' ? 'text-lib-dark border-b-2 border-lib-dark' : 'text-gray-500 hover:text-gray-700'}`}>Dashboard</button>
        <button onClick={() => setActiveTab('inventory')} className={`px-6 py-4 font-semibold text-sm transition-all ${activeTab === 'inventory' ? 'text-lib-dark border-b-2 border-lib-dark' : 'text-gray-500 hover:text-gray-700'}`}>Inventario ({libros.length})</button>
        <button onClick={() => setActiveTab('register')} className={`px-6 py-4 font-semibold text-sm transition-all ${activeTab === 'register' ? 'text-lib-dark border-b-2 border-lib-dark' : 'text-gray-500 hover:text-gray-700'}`}>Registrar Libro</button>
        <button onClick={() => setActiveTab('import')} className={`px-6 py-4 font-semibold text-sm transition-all ${activeTab === 'import' ? 'text-lib-dark border-b-2 border-lib-dark' : 'text-gray-500 hover:text-gray-700'}`}>Importar CSV</button>
        <button onClick={() => setActiveTab('loans')} className={`px-6 py-4 font-semibold text-sm transition-all ${activeTab === 'loans' ? 'text-lib-dark border-b-2 border-lib-dark' : 'text-gray-500 hover:text-gray-700'}`}>Ver Préstamos Solicitados</button>
        <button onClick={() => setActiveTab('users')} className={`px-6 py-4 font-semibold text-sm transition-all ${activeTab === 'users' ? 'text-lib-dark border-b-2 border-lib-dark' : 'text-gray-500 hover:text-gray-700'}`}>Control de Usuarios</button>
        <button onClick={() => setActiveTab('roles')} className={`px-6 py-4 font-semibold text-sm transition-all ${activeTab === 'roles' ? 'text-lib-dark border-b-2 border-lib-dark' : 'text-gray-500 hover:text-gray-700'}`}>Gestión de Roles</button>
      </div>

      {/* TAB: DASHBOARD DE PRÉSTAMOS */}
      {activeTab === 'dashboard' && (() => {
        const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        // Años disponibles según los datos
        const aniosDisponibles = Array.from(
          new Set(allPrestamos.map(p => new Date(p.fecha_prestamo).getFullYear()))
        ).sort((a, b) => b - a);

        // Filtrado por mes/año seleccionados
        const prestamosFiltrados = allPrestamos.filter(p => {
          const fecha = new Date(p.fecha_prestamo);
          const coincideAnio = dashAnio === 'todos' || fecha.getFullYear() === dashAnio;
          const coincideMes = dashMes === 'todos' || fecha.getMonth() === dashMes;
          return coincideAnio && coincideMes;
        });

        const totalPrestamos = prestamosFiltrados.length;
        const librosEntregados = prestamosFiltrados.filter(p => p.estado === 'devuelto').length;
        const prestamosActivos = prestamosFiltrados.filter(p => p.estado === 'prestado').length;
        const prestamosVencidos = prestamosFiltrados.filter(p =>
          p.estado === 'prestado' && p.fecha_vencimiento && new Date() > new Date(p.fecha_vencimiento)
        ).length;
        const tasaEntrega = totalPrestamos > 0 ? Math.round((librosEntregados / totalPrestamos) * 100) : 0;

        // Conteo por mes (total vs entregados) para el año seleccionado
        const anioParaGrafico = dashAnio === 'todos' ? (aniosDisponibles[0] ?? new Date().getFullYear()) : dashAnio;
        const conteoPorMes = mesesNombres.map((_, idx) => {
          const registrosMes = allPrestamos.filter(p => {
            const fecha = new Date(p.fecha_prestamo);
            return fecha.getFullYear() === anioParaGrafico && fecha.getMonth() === idx;
          });
          return { total: registrosMes.length, entregados: registrosMes.filter(p => p.estado === 'devuelto').length };
        });
        const maxConteoMes = Math.max(1, ...conteoPorMes.map(m => m.total));

        // Ranking de libros más prestados (según el filtro activo)
        const rankingLibros = Object.values(
          prestamosFiltrados.reduce((acc: any, p: any) => {
            const titulo = p.libro?.titulo || 'Libro desconocido';
            if (!acc[titulo]) acc[titulo] = { titulo, cantidad: 0 };
            acc[titulo].cantidad += 1;
            return acc;
          }, {})
        ).sort((a: any, b: any) => b.cantidad - a.cantidad).slice(0, 5) as { titulo: string; cantidad: number }[];
        const maxRanking = Math.max(1, ...rankingLibros.map(r => r.cantidad));

        // Dona SVG (% de libros entregados)
        const radio = 54;
        const circunferencia = 2 * Math.PI * radio;
        const offsetDona = circunferencia - (tasaEntrega / 100) * circunferencia;

        return (
          <div className="mb-8 flex justify-center w-full">
            <div className="w-full space-y-6">

              {/* CABECERA + FILTROS */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">Dashboard de Préstamos</h3>
                  <p className="text-sm text-gray-500 mt-1">Resumen general de préstamos y libros entregados</p>
                </div>

                <div className="flex gap-3">
                  {/* DROPDOWN MES (Combo Personalizado) */}
                  <div className="relative">
                    <div
                      onClick={() => { setIsOpenDashMes(!isOpenDashMes); setIsOpenDashAnio(false); }}
                      className={`min-w-[150px] p-3 bg-white rounded-lg border ${isOpenDashMes ? 'border-lib-dark ring-2 ring-lib-dark' : 'border-gray-200'} outline-none text-sm cursor-pointer flex justify-between items-center gap-3 transition-all hover:bg-gray-50 shadow-sm`}
                    >
                      <span className="text-gray-700 font-medium">{dashMes === 'todos' ? 'Todos los meses' : mesesNombres[dashMes]}</span>
                      <CaretDownIcon size={14} weight="bold" className={`text-gray-400 transition-transform duration-200 ${isOpenDashMes ? 'rotate-180' : ''}`} />
                    </div>

                    {isOpenDashMes && (
                      <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                        <li
                          onClick={() => { setDashMes('todos'); setIsOpenDashMes(false); }}
                          className={`relative p-3 pl-4 text-sm cursor-pointer transition-colors hover:bg-gray-50 ${dashMes === 'todos' ? 'bg-gray-50 font-bold text-lib-dark' : 'text-gray-600'}`}
                        >
                          {dashMes === 'todos' && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-2/3 w-1.5 bg-lib-dark rounded-r-full"></span>}
                          Todos los meses
                        </li>
                        {mesesNombres.map((nombre, idx) => (
                          <li
                            key={idx}
                            onClick={() => { setDashMes(idx); setIsOpenDashMes(false); }}
                            className={`relative p-3 pl-4 text-sm cursor-pointer transition-colors hover:bg-gray-50 ${dashMes === idx ? 'bg-gray-50 font-bold text-lib-dark' : 'text-gray-600'}`}
                          >
                            {dashMes === idx && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-2/3 w-1.5 bg-lib-dark rounded-r-full"></span>}
                            {nombre}
                          </li>
                        ))}
                      </ul>
                    )}
                    {isOpenDashMes && <div className="fixed inset-0 z-10" onClick={() => setIsOpenDashMes(false)} />}
                  </div>

                  {/* DROPDOWN AÑO (Combo Personalizado) */}
                  <div className="relative">
                    <div
                      onClick={() => { setIsOpenDashAnio(!isOpenDashAnio); setIsOpenDashMes(false); }}
                      className={`min-w-[130px] p-3 bg-white rounded-lg border ${isOpenDashAnio ? 'border-lib-dark ring-2 ring-lib-dark' : 'border-gray-200'} outline-none text-sm cursor-pointer flex justify-between items-center gap-3 transition-all hover:bg-gray-50 shadow-sm`}
                    >
                      <span className="text-gray-700 font-medium">{dashAnio === 'todos' ? 'Todos los años' : dashAnio}</span>
                      <CaretDownIcon size={14} weight="bold" className={`text-gray-400 transition-transform duration-200 ${isOpenDashAnio ? 'rotate-180' : ''}`} />
                    </div>

                    {isOpenDashAnio && (
                      <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                        <li
                          onClick={() => { setDashAnio('todos'); setIsOpenDashAnio(false); }}
                          className={`relative p-3 pl-4 text-sm cursor-pointer transition-colors hover:bg-gray-50 ${dashAnio === 'todos' ? 'bg-gray-50 font-bold text-lib-dark' : 'text-gray-600'}`}
                        >
                          {dashAnio === 'todos' && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-2/3 w-1.5 bg-lib-dark rounded-r-full"></span>}
                          Todos los años
                        </li>
                        {aniosDisponibles.map((anio) => (
                          <li
                            key={anio}
                            onClick={() => { setDashAnio(anio); setIsOpenDashAnio(false); }}
                            className={`relative p-3 pl-4 text-sm cursor-pointer transition-colors hover:bg-gray-50 ${dashAnio === anio ? 'bg-gray-50 font-bold text-lib-dark' : 'text-gray-600'}`}
                          >
                            {dashAnio === anio && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-2/3 w-1.5 bg-lib-dark rounded-r-full"></span>}
                            {anio}
                          </li>
                        ))}
                      </ul>
                    )}
                    {isOpenDashAnio && <div className="fixed inset-0 z-10" onClick={() => setIsOpenDashAnio(false)} />}
                  </div>
                </div>
              </div>

              {/* TARJETAS RESUMEN */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-lib-dark rounded-2xl p-5 shadow-md relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full"></div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wide">Total Préstamos</p>
                    <div className="p-2 bg-white/10 rounded-lg"><ClipboardTextIcon size={16} weight="bold" className="text-white" /></div>
                  </div>
                  <p className="text-3xl font-bold text-white">{totalPrestamos}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Entregados</p>
                    <div className="p-2 bg-amber-50 rounded-lg"><BookOpenIcon size={16} weight="bold" className="text-amber-500" /></div>
                  </div>
                  <p className="text-3xl font-bold text-gray-800">{librosEntregados}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Préstamos Activos</p>
                    <div className="p-2 bg-blue-50 rounded-lg"><TrendUpIcon size={16} weight="bold" className="text-blue-500" /></div>
                  </div>
                  <p className="text-3xl font-bold text-gray-800">{prestamosActivos}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vencidos</p>
                    <div className="p-2 bg-red-50 rounded-lg"><ClockCountdownIcon size={16} weight="bold" className="text-red-500" /></div>
                  </div>
                  <p className="text-3xl font-bold text-gray-800">{prestamosVencidos}</p>
                </div>
              </div>

              {/* GRÁFICO DE BARRAS + DONA + RANKING */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* GRÁFICO DE BARRAS DOS TONOS */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-base font-bold text-gray-800">Préstamos vs Entregados · {anioParaGrafico}</h4>
                    <div className="flex items-center gap-4 text-xs font-semibold text-gray-500">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-lib-dark"></span>Préstamos</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>Entregados</span>
                    </div>
                  </div>

                  {allPrestamos.length > 0 ? (
                    <div className="flex items-end gap-3 h-52 border-b border-gray-100 pb-2">
                      {conteoPorMes.map((m, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
                          <div className="flex items-end gap-1 w-full justify-center h-full">
                            <div
                              className={`w-1/2 rounded-t-md transition-all ${dashMes === idx ? 'bg-lib-dark' : 'bg-lib-dark/80 group-hover:bg-lib-dark'}`}
                              style={{ height: `${(m.total / maxConteoMes) * 100}%`, minHeight: m.total > 0 ? '4px' : '0px' }}
                              title={`${m.total} préstamos`}
                            />
                            <div
                              className="w-1/2 rounded-t-md bg-amber-400 group-hover:bg-amber-500 transition-all"
                              style={{ height: `${(m.entregados / maxConteoMes) * 100}%`, minHeight: m.entregados > 0 ? '4px' : '0px' }}
                              title={`${m.entregados} entregados`}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-gray-400 mt-2">
                            {mesesNombres[idx].slice(0, 3)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No hay datos de préstamos aún.</p>
                  )}
                </div>

                {/* DONA DE TASA DE ENTREGA */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
                  <h4 className="text-base font-bold text-gray-800 mb-4 self-start">Tasa de Entrega</h4>
                  <div className="relative w-36 h-36">
                    <svg viewBox="0 0 120 120" className="w-36 h-36 -rotate-90">
                      <circle cx="60" cy="60" r={radio} fill="none" stroke="#f3f4f6" strokeWidth="12" />
                      <circle
                        cx="60" cy="60" r={radio} fill="none" stroke="#f59e0b" strokeWidth="12"
                        strokeDasharray={circunferencia} strokeDashoffset={totalPrestamos > 0 ? offsetDona : circunferencia}
                        strokeLinecap="round" className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-gray-800">{tasaEntrega}%</span>
                    </div>
                  </div>
                  <div className="w-full mt-6 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-gray-500 font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>Entregados</span>
                      <span className="font-bold text-gray-700">{librosEntregados}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-gray-500 font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-gray-200"></span>Pendientes</span>
                      <span className="font-bold text-gray-700">{totalPrestamos - librosEntregados}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RANKING DE LIBROS MÁS PRESTADOS */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h4 className="text-base font-bold text-gray-800 mb-4">Libros más prestados</h4>
                {rankingLibros.length > 0 ? (
                  <div className="space-y-4">
                    {rankingLibros.map((libro, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <span className="w-6 text-xs font-bold text-gray-400">#{idx + 1}</span>
                        <span className="w-48 truncate text-sm font-semibold text-gray-700">{libro.titulo}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full bg-lib-dark rounded-full transition-all"
                            style={{ width: `${(libro.cantidad / maxRanking) * 100}%` }}
                          />
                        </div>
                        <span className="w-6 text-right text-sm font-bold text-gray-700">{libro.cantidad}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No hay préstamos registrados en este periodo.</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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
                      <th className="px-8 py-4 font-semibold text-gray-700 w-[5%] text-center">ID</th>
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
                          <td className="px-8 py-4 text-center">
                            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs font-mono font-bold">#{libro.id}</span>
                          </td>
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
                          <td className="px-6 py-4">
                            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs font-mono font-bold">#{p.id}</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-800">{p.libro?.titulo || 'Libro desconocido'}</p>
                            <span className="inline-block mt-0.5 px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-mono font-bold">#{p.libro?.id || p.libroId}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono font-bold">{p.dni_usuario}</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-semibold text-gray-700">{new Date(p.fecha_prestamo).toLocaleDateString()}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className={`text-sm font-semibold ${p.fecha_vencimiento && new Date() > new Date(p.fecha_vencimiento) && p.estado === 'prestado' ? 'text-red-600' : 'text-gray-700'}`}>
                              {p.fecha_vencimiento ? new Date(p.fecha_vencimiento).toLocaleDateString() : 'N/A'}
                            </p>
                          </td>
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

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h3 className="text-2xl font-bold text-gray-800">Control de Usuarios Registrados</h3>
            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={verificarPrestamosVencidos}
                disabled={verificandoVencidos}
                className="whitespace-nowrap px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {verificandoVencidos ? 'Verificando...' : 'Verificar Entregas Tardías'}
              </button>
              <input
                type="text"
                placeholder="Buscar por Nombre o DNI..."
                value={busquedaUsuario}
                onChange={(e) => setBusquedaUsuario(e.target.value)}
                className="w-full md:max-w-xs p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark text-sm"
              />
            </div>
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
                  .map((usuario) => {
                    const prestamosVencidosUsuario = allPrestamos.filter((p: any) =>
                      p.usuario_id === usuario.id &&
                      p.estado === 'prestado' &&
                      p.fecha_vencimiento &&
                      new Date() > new Date(p.fecha_vencimiento) &&
                      !p.infraccion_aplicada
                    );
                    return (
                    <tr key={usuario.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-800">{usuario.nombre_completo || 'Sin nombre'}</td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono font-bold">{usuario.dni || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${(usuario.infracciones || 0) > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                          {usuario.infracciones || 0} {(usuario.infracciones || 0) === 1 ? 'sanción' : 'sanciones'}
                        </span>
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

                          {usuario.estado_cuenta !== 'inactivo' && prestamosVencidosUsuario.length > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold uppercase">
                              {prestamosVencidosUsuario.length} entrega(s) tardía(s)
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
                          <div className="flex flex-col gap-2 items-center">
                            {prestamosVencidosUsuario.length > 0 && (
                              <button
                                onClick={() => abrirModalSancion({ id: usuario.id, nombre: usuario.nombre_completo, infracciones: usuario.infracciones || 0 }, true)}
                                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                              >
                                Sancionar Entrega Tardía
                              </button>
                            )}
                            <button
                              onClick={() => abrirModalSancion({ id: usuario.id, nombre: usuario.nombre_completo, infracciones: usuario.infracciones || 0 })}
                              className="px-4 py-2 bg-gray-100 text-black rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                            >
                              Sancionar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )})}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}
      {/* TAB: GESTIÓN DE ROLES */}
      {activeTab === 'roles' && (
        <div className="mb-8 flex justify-center w-full">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Gestión de Roles</h3>
                <p className="text-sm text-gray-500 mt-1">Asigna o cambia el rol de cada usuario registrado</p>
              </div>
              <input
                type="text"
                placeholder="Buscar por Nombre o DNI..."
                value={busquedaRoles}
                onChange={(e) => setBusquedaRoles(e.target.value)}
                className="w-full md:max-w-xs p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark text-sm"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 font-semibold text-gray-700">Nombre Completo</th>
                    <th className="px-6 py-4 font-semibold text-gray-700">DNI</th>
                    <th className="px-6 py-4 font-semibold text-gray-700 text-center">Rol Actual</th>
                    <th className="px-6 py-4 font-semibold text-gray-700 text-center">Cambiar Rol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {usuarios
                    .filter(u =>
                      busquedaRoles === '' ||
                      u.dni?.includes(busquedaRoles) ||
                      u.nombre_completo?.toLowerCase().includes(busquedaRoles.toLowerCase())
                    )
                    .map((usuario) => (
                      <tr key={usuario.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {usuario.rol === 'admin'
                              ? <ShieldCheckIcon size={18} weight="fill" className="text-lib-dark" />
                              : <UserCircleIcon size={18} weight="fill" className="text-gray-400" />
                            }
                            <span className="font-bold text-gray-800">{usuario.nombre_completo || 'Sin nombre'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono font-bold">{usuario.dni || 'N/A'}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            usuario.rol === 'admin'
                              ? 'bg-lib-dark text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {usuario.rol || 'user'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              disabled={usuario.rol === 'admin' || rolLoading === usuario.id}
                              onClick={() => handleCambiarRol(usuario.id, 'admin')}
                              className="px-3 py-1.5 bg-lib-dark text-white rounded-lg text-xs font-bold hover:bg-opacity-90 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {rolLoading === usuario.id ? '...' : 'Hacer Admin'}
                            </button>
                            <button
                              disabled={usuario.rol !== 'admin' || rolLoading === usuario.id}
                              onClick={() => handleCambiarRol(usuario.id, 'user')}
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {rolLoading === usuario.id ? '...' : 'Quitar Admin'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GLOBAL DE INFRACCIÓN (funciona desde cualquier pestaña) */}
      {modalUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl border border-red-100 w-full max-w-md animate-fade-in">
            <h4 className="text-xl font-bold text-gray-800 mb-2">Registrar Infracción</h4>
            <p className="text-sm text-gray-600 mb-2">
              Aplicando sanción a: <span className="font-bold">{modalUsuario.nombre}</span>
            </p>
            <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-lg text-xs font-bold border border-red-200">
              Sanciones anteriores: {modalUsuario.infracciones}. Esta sanción suspenderá la cuenta de inmediato.
            </div>

            {/* TIPO DE FALTA (Combo Personalizado) */}
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de falta</label>
            <div className="relative mb-4">
              <div
                onClick={() => setIsOpenTipoSancion(!isOpenTipoSancion)}
                className={`w-full p-3 bg-gray-50 rounded-lg border ${isOpenTipoSancion ? 'border-red-500 ring-2 ring-red-500' : 'border-gray-200'} outline-none text-sm cursor-pointer flex justify-between items-center transition-all hover:bg-gray-100`}
              >
                <span className="text-gray-700">{tipoSancion}</span>
                <svg className={`fill-current h-4 w-4 text-gray-500 transition-transform duration-200 ${isOpenTipoSancion ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>

              {isOpenTipoSancion && (
                <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-100 rounded-lg shadow-xl overflow-hidden">
                  {Object.keys(tiposFalta).map((opcion) => (
                    <li
                      key={opcion}
                      onClick={() => {
                        setTipoSancion(opcion);
                        setMotivoSuspension(tiposFalta[opcion]);
                        setIsOpenTipoSancion(false);
                      }}
                      className={`relative p-3 pl-4 text-sm cursor-pointer transition-colors hover:bg-gray-50 ${tipoSancion === opcion ? 'bg-gray-50 font-bold text-red-600' : 'text-gray-600'}`}
                    >
                      {tipoSancion === opcion && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-2/3 w-1.5 bg-red-500 rounded-r-full"></span>
                      )}
                      {opcion}
                    </li>
                  ))}
                </ul>
              )}

              {isOpenTipoSancion && (
                <div className="fixed inset-0 z-10" onClick={() => setIsOpenTipoSancion(false)} />
              )}
            </div>

            {/* Selector de libro cuando la falta es "Libro dañado" */}
            {tipoSancion === 'Libro dañado' && (
              modalUsuario.prestamosActivos.length > 0 ? (
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">¿Qué libro llegó dañado? *</label>
                  <select
                    value={prestamoDanadoSeleccionado ?? ''}
                    onChange={(e) => setPrestamoDanadoSeleccionado(e.target.value ? Number(e.target.value) : null)}
                    className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  >
                    <option value="">Selecciona un préstamo activo...</option>
                    {modalUsuario.prestamosActivos.map((p: any) => (
                      <option key={p.id} value={p.id}>#{p.id} — {p.libro?.titulo || 'Libro desconocido'}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-xs text-orange-600 font-semibold mb-4">Este usuario no tiene préstamos activos para vincular como dañados.</p>
              )
            )}

            {/* Aviso de libros vinculados cuando la falta es por entrega tardía */}
            {tipoSancion === 'Retraso en la entrega' && modalUsuario.prestamosVencidos.length > 0 && (
              <p className="text-xs text-orange-600 font-semibold mb-4">
                Se marcará como sancionado: {modalUsuario.prestamosVencidos.map((p: any) => p.libro?.titulo || 'Libro').join(', ')}
              </p>
            )}

            <label className="block text-sm font-semibold text-gray-700 mb-2">Detalle del motivo *</label>
            <textarea
              autoFocus
              placeholder="Ej: Devolvió el libro con retraso de 3 días..."
              value={motivoSuspension}
              onChange={(e) => setMotivoSuspension(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-red-500 text-sm mb-4 resize-none h-24"
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setModalUsuario(null); setMotivoSuspension(''); setTipoSancion('Otro'); setPrestamoDanadoSeleccionado(null); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                disabled={motivoSuspension.trim() === '' || (tipoSancion === 'Libro dañado' && modalUsuario.prestamosActivos.length > 0 && !prestamoDanadoSeleccionado)}
                onClick={() => {
                  const opciones: { prestamoDanadoId?: number | null; prestamosTardiosIds?: number[] } = {};
                  if (tipoSancion === 'Libro dañado' && prestamoDanadoSeleccionado) {
                    opciones.prestamoDanadoId = prestamoDanadoSeleccionado;
                  }
                  if (tipoSancion === 'Retraso en la entrega' && modalUsuario.prestamosVencidos.length > 0) {
                    opciones.prestamosTardiosIds = modalUsuario.prestamosVencidos.map((p: any) => p.id);
                  }
                  registrarInfraccion(modalUsuario.id, modalUsuario.infracciones, motivoSuspension.trim(), opciones);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                Registrar Falta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}