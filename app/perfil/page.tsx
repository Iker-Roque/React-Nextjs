"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { CheckCircleIcon, EyeSlashIcon, EyeIcon } from '@phosphor-icons/react';

export default function PerfilUsuario() {
    const router = useRouter();
    const [usuario, setUsuario] = useState<any>(null);
    const [prestamos, setPrestamos] = useState<any[]>([]);
    const [cargando, setCargando] = useState(true);
    const [nombreForm, setNombreForm] = useState('');
    const [passwordForm, setPasswordForm] = useState('');
    const [confirmPasswordForm, setConfirmPasswordForm] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [guardadoExitoso, setGuardadoExitoso] = useState(false);
    const [mostrarPass, setMostrarPass] = useState(false);
    const [mostrarConfirm, setMostrarConfirm] = useState(false);


    const [alerta, setAlerta] = useState<{ tipo: 'exito' | 'error', texto: string } | null>(null);
    // Estado que controla qué panel se muestra a la derecha
    const [pestañaActiva, setPestañaActiva] = useState<'activos' | 'historial' | 'ajustes'>('activos');

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                    router.push('/login');
                    return;
                }
                setUsuario(session.user);
                setNombreForm(session.user.user_metadata?.nombre_completo || '');

                const res = await fetch(`/api/prestamos/usuario/${session.user.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setPrestamos(data);
                }
            } catch (error) {
                console.error("Error al cargar el perfil:", error);
            } finally {
                setCargando(false);
            }
        };
        cargarDatos();
    }, [router]);

    if (cargando) {
        return (
            <div className="min-h-screen bg-lib-cream flex justify-center items-center">
                <p className="text-gray-500 font-bold animate-pulse">Cargando tu perfil...</p>
            </div>
        );
    }

    const handleGuardarCambios = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setAlerta(null);

        if (passwordForm && passwordForm !== confirmPasswordForm) {
            setAlerta({ tipo: 'error', texto: "Las contraseñas no coinciden" });
            return;
        }

        setGuardando(true);
        try {
            const actualizaciones: any = {
                data: { nombre_completo: nombreForm }
            };

            if (passwordForm) {
                actualizaciones.password = passwordForm;
            }

            const { data, error } = await supabase.auth.updateUser(actualizaciones);

            if (error) throw error;

            setUsuario(data.user);
            setPasswordForm('');
            setConfirmPasswordForm('');

            setAlerta({ tipo: 'exito', texto: "Perfil actualizado correctamente" });

            // Cambio de estado para el botón "¡Listo!"
            setGuardadoExitoso(true);
            setTimeout(() => setGuardadoExitoso(false), 3000);

        } catch (error: any) {
            console.error("Error al actualizar:", error);
            setAlerta({ tipo: 'error', texto: error.message || "Error al actualizar el perfil" });
        } finally {
            setGuardando(false);
        }
    };

    



    const nombreCompleto = usuario?.user_metadata?.nombre_completo || 'Usuario';
    const iniciales = nombreCompleto.substring(0, 2).toUpperCase();

    // Filtros de préstamos
    const prestamosActivos = prestamos.filter(p => p.estado === 'solicitado' || p.estado === 'prestado');
    const prestamosHistoricos = prestamos.filter(p => p.estado === 'devuelto' || p.estado === 'rechazado');
    const listaMostrada = pestañaActiva === 'activos' ? prestamosActivos : prestamosHistoricos;

    return (
        <div className="min-h-screen bg-lib-cream py-16 px-6 lg:px-12">
            <div className="max-w-6xl mx-auto">

                {/* Encabezado */}
                <div className="mb-10">
                    <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">Mi Espacio</span>
                    <h2 className="text-4xl font-serif italic text-gray-950 mt-2">Perfil de Usuario</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* PANEL IZQUIERDO: Información del Usuario (4 columnas) */}
                    <aside className="lg:col-span-4">
                        <div className="bg-white p-8 rounded-4xl border border-gray-100 shadow-sm text-center">
                            <div className="w-24 h-24 bg-lib-dark text-white rounded-full flex items-center justify-center text-3xl font-serif italic mx-auto mb-6 shadow-lg">
                                {iniciales}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">{nombreCompleto}</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">
                                DNI: {usuario?.user_metadata?.dni || 'No registrado'}
                            </p>

                            <div className="border-t border-gray-100 pt-6 text-left space-y-4">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase">DNI DE USUARIO</p>
                                    <p className="text-sm font-medium text-gray-800">{usuario?.user_metadata.dni}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase">Estado de Cuenta</p>
                                    <p className="text-sm font-bold text-green-600">✓ Activo</p>
                                </div>

                                <div className="pt-4 mt-2">
                                    <button
                                        onClick={() => setPestañaActiva('ajustes')}
                                        className={`w-full flex justify-center items-center gap-2 font-bold text-xs py-3 rounded-xl border transition-colors shadow-sm cursor-pointer ${pestañaActiva === 'ajustes' ? 'bg-gray-100 border-gray-300 text-lib-dark' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'}`}
                                    >
                                        ⚙️ Configuración de Cuenta
                                    </button>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* PANEL DERECHO: Dinámico (8 columnas) */}
                    <section className="lg:col-span-8">
                        <div className="bg-white p-8 rounded-4xl border border-gray-100 shadow-sm h-full">

                            {/* Lógica de reemplazo: Si es ajustes muestra form, sino muestra préstamos */}
                            {pestañaActiva === 'ajustes' ? (

                                /* --- VISTA: CONFIGURACIÓN --- */
                                <div className="animate-fade-in">
                                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                        <h3 className="font-bold text-lg font-serif italic text-lib-dark">Configuración de Cuenta</h3>
                                        <button onClick={() => setPestañaActiva('activos')} className="text-xs font-bold text-gray-400 hover:text-lib-dark transition-colors cursor-pointer">
                                            ✕ Cerrar ajustes
                                        </button>
                                    </div>

                                    <form onSubmit={handleGuardarCambios} className="space-y-5 max-w-md">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre Completo</label>
                                            <input
                                                type="text"
                                                required
                                                value={nombreForm}
                                                onChange={(e) => setNombreForm(e.target.value)}
                                                className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark focus:border-transparent text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Nueva Contraseña</label>
                                            <div className="relative">
                                                <input
                                                    type={mostrarPass ? "text" : "password"}
                                                    placeholder="Deja en blanco para no cambiarla"
                                                    value={passwordForm}
                                                    onChange={(e) => setPasswordForm(e.target.value)}
                                                    className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark focus:border-transparent text-sm pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setMostrarPass(!mostrarPass)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                                >
                                                    {mostrarPass ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmar Nueva Contraseña</label>
                                            <div className="relative">
                                                <input
                                                    type={mostrarConfirm ? "text" : "password"}
                                                    placeholder="Repite la nueva contraseña"
                                                    value={confirmPasswordForm}
                                                    onChange={(e) => setConfirmPasswordForm(e.target.value)}
                                                    className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-lib-dark focus:border-transparent text-sm pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setMostrarConfirm(!mostrarConfirm)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                                >
                                                    {mostrarConfirm ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <button
                                                type="submit"
                                                disabled={guardando || guardadoExitoso}
                                                className={`w-full py-3 flex items-center justify-center gap-2 rounded-lg font-bold text-sm transition-all shadow-md cursor-pointer disabled:opacity-50 ${guardadoExitoso
                                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                                        : 'bg-lib-dark text-white hover:bg-opacity-90'
                                                    }`}
                                            >
                                                {guardando ? (
                                                    'Guardando...'
                                                ) : guardadoExitoso ? (
                                                    <>
                                                        <CheckCircleIcon size={20} weight="bold" /> ¡Listo!
                                                    </>
                                                ) : (
                                                    'Guardar Cambios'
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                            ) : (

                                /* --- VISTA: PRÉSTAMOS E HISTORIAL --- */
                                <div className="animate-fade-in">
                                    <div className="flex gap-6 mb-6 border-b border-gray-100">
                                        <button
                                            onClick={() => setPestañaActiva('activos')}
                                            className={`font-bold text-sm pb-3 border-b-2 transition-colors cursor-pointer ${pestañaActiva === 'activos' ? 'border-lib-dark text-lib-dark' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                                        >
                                            Préstamos Activos ({prestamosActivos.length})
                                        </button>
                                        <button
                                            onClick={() => setPestañaActiva('historial')}
                                            className={`font-bold text-sm pb-3 border-b-2 transition-colors cursor-pointer ${pestañaActiva === 'historial' ? 'border-lib-dark text-lib-dark' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                                        >
                                            Libros Leídos ({prestamosHistoricos.length})
                                        </button>
                                    </div>

                                    {listaMostrada.length === 0 ? (
                                        <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                            <p className="text-gray-500 font-medium text-sm">
                                                {pestañaActiva === 'activos' ? 'No tienes préstamos activos en este momento.' : 'Aún no tienes libros en tu historial.'}
                                            </p>
                                            <button onClick={() => router.push('/catalogo')} className="mt-4 text-xs font-bold text-lib-dark hover:underline cursor-pointer">
                                                Explorar el catálogo
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {listaMostrada.map((prestamo) => (
                                                <div key={prestamo.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-sm text-gray-900 mb-1">
                                                            {prestamo.libro?.titulo || 'Libro no especificado'}
                                                        </h4>
                                                        <p className="text-[10px] text-gray-500">
                                                            ID del libro: <span className="font-bold">{prestamo.libroId || prestamo.libro?.id}</span> •
                                                            Origen: <span className="font-bold">{prestamo.libro?.procedencia || 'No especificado'}</span>
                                                        </p>
                                                    </div>

                                                    <div className="text-right ml-4">
                                                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase mb-2 ${prestamo.estado === 'solicitado' ? 'bg-yellow-100 text-yellow-700' :
                                                            prestamo.estado === 'prestado' ? 'bg-green-100 text-green-700' :
                                                                prestamo.estado === 'devuelto' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-red-100 text-red-700'
                                                            }`}>
                                                            {prestamo.estado}
                                                        </span>
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase">
                                                            {prestamo.estado === 'solicitado' ? 'Pedido el:' :
                                                                prestamo.estado === 'prestado' ? 'Devolver el:' : 'Finalizado el:'} {
                                                                prestamo.fecha_vencimiento && prestamo.estado !== 'solicitado'
                                                                    ? new Date(prestamo.fecha_vencimiento).toLocaleDateString()
                                                                    : prestamo.fecha_prestamo
                                                                        ? new Date(prestamo.fecha_prestamo).toLocaleDateString()
                                                                        : 'N/A'
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
}