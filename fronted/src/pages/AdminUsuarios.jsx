import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { 
  Users, UserCheck, ShieldAlert, Trash2, Building2, 
  CheckCircle2, XCircle, Settings, Mail, Save, Sparkles, Loader2,
  AlertTriangle, Search, FileText, Calendar, Edit3
} from 'lucide-react';

const AdminUsuarios = () => {
  const [activeTab, setActiveTab] = useState('usuarios'); // 'usuarios' | 'licitaciones'
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // id_usuario de la acción en curso
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [busqueda, setBusqueda] = useState('');
  const [modalEliminarUsuario, setModalEliminarUsuario] = useState(null); // { id, email }

  // Licitaciones
  const [licitaciones, setLicitaciones] = useState([]);
  const [destinatarios, setDestinatarios] = useState([]);
  const [licitacionesLoading, setLicitacionesLoading] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(null); // id_proceso_db a eliminar
  const [modalEditar, setModalEditar] = useState(null); // licitacion a editar { id_proceso_db, id_destinatario }
  const [busquedaLicitacion, setBusquedaLicitacion] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);

  // Resetear la paginación al realizar búsquedas de licitaciones
  useEffect(() => {
    setPaginaActual(1);
  }, [busquedaLicitacion]);

  // Listado de usuarios a editar localmente
  const [editedUsers, setEditedUsers] = useState({});

  // Control de mantenimiento
  const [mantenimiento, setMantenimiento] = useState({ advertencia: false, bloqueo: false, limite: '' });
  const [mantenimientoLoading, setMantenimientoLoading] = useState(true);
  const [mantenimientoActionLoading, setMantenimientoActionLoading] = useState(false);
  const [minutosGracia, setMinutosGracia] = useState(5);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/usuarios');
      setUsuarios(res.data);
      
      // Inicializar estado de edición para cada usuario
      const initialEdits = {};
      res.data.forEach(u => {
        initialEdits[u.id_usuario] = {
          rol: u.rol,
          habilitado: u.habilitado,
          
          puede_importar: u.puede_importar
        };
      });
      setEditedUsers(initialEdits);
    } catch (err) {
      console.error(err);
      mostrarMensaje('error', 'Error al cargar el listado de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMantenimiento = async (silencioso = false) => {
    if (!silencioso) setMantenimientoLoading(true);
    try {
      const res = await api.get('/admin/mantenimiento');
      setMantenimiento(res.data);
    } catch (err) {
      console.error(err);
      if (!silencioso) {
        mostrarMensaje('error', 'Error al obtener la configuración de mantenimiento.');
      }
    } finally {
      if (!silencioso) setMantenimientoLoading(false);
    }
  };

  const fetchLicitaciones = async () => {
    setLicitacionesLoading(true);
    try {
      const res = await api.get('/admin/licitaciones');
      setLicitaciones(res.data);
    } catch (err) {
      console.error(err);
      mostrarMensaje('error', 'Error al cargar el listado de licitaciones.');
    } finally {
      setLicitacionesLoading(false);
    }
  };

  const fetchDestinatarios = async () => {
    try {
      const res = await api.get('/admin/licitaciones/destinatarios');
      setDestinatarios(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateHospital = async (idProceso, idDestinatario) => {
    try {
      await api.put(`/admin/licitaciones/${idProceso}/hospital`, { id_destinatario: idDestinatario });
      mostrarMensaje('exito', 'Hospital actualizado correctamente.');
      fetchLicitaciones();
      setModalEditar(null);
    } catch (err) {
      console.error(err);
      mostrarMensaje('error', 'Error al actualizar el hospital.');
    }
  };

  const handleDeleteLicitacion = async (idProceso) => {
    try {
      await api.delete(`/admin/licitaciones/${idProceso}`);
      mostrarMensaje('exito', 'Licitación y renglones eliminados correctamente.');
      fetchLicitaciones();
      setModalEliminar(null);
    } catch (err) {
      console.error(err);
      mostrarMensaje('error', 'Error al eliminar la licitación.');
    }
  };

  useEffect(() => {
    fetchUsuarios();
    fetchMantenimiento();
    fetchLicitaciones();
    fetchDestinatarios();

    // Mantener la perilla sincronizada cada 5 segundos de forma silenciosa
    const interval = setInterval(() => {
      fetchMantenimiento(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleToggleMantenimiento = async (tipo, valorActual) => {
    setMantenimientoActionLoading(true);
    try {
      const nuevoValor = !valorActual;
      const res = await api.post('/admin/mantenimiento', { 
        tipo, 
        activo: nuevoValor,
        minutos: tipo === 'advertencia' ? minutosGracia : undefined
      });
      setMantenimiento(prev => ({ 
        ...prev, 
        [tipo]: nuevoValor,
        limite: res.data.limite !== undefined ? res.data.limite : prev.limite
      }));
      mostrarMensaje('exito', `Mantenimiento (${tipo === 'advertencia' ? 'Advertencia' : 'Bloqueo'}) actualizado correctamente.`);
    } catch (err) {
      console.error(err);
      mostrarMensaje('error', 'No se pudo actualizar el estado de mantenimiento.');
    } finally {
      setMantenimientoActionLoading(false);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: '', texto: '' }), 5000);
  };

  const handleEditChange = (id, campo, valor) => {
    setEditedUsers(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [campo]: valor
      }
    }));
  };

  // Guardar cambios en un usuario activo
  const handleGuardarCambios = async (id) => {
    setActionLoading(id);
    try {
      const editData = editedUsers[id];
      await api.put(`/admin/usuarios/${id}`, editData);
      mostrarMensaje('exito', 'Usuario actualizado correctamente.');
      fetchUsuarios();
    } catch (err) {
      console.error(err);
      mostrarMensaje('error', 'No se pudieron guardar los cambios.');
    } finally {
      setActionLoading(null);
    }
  };

  // Aprobar usuario y enviar código por email
  const handleAprobarUsuario = async (id) => {
    setActionLoading(id);
    try {
      const editData = editedUsers[id];
      await api.post(`/admin/usuarios/${id}/aprobar`, {
        rol: editData.rol,
        
        puede_importar: editData.puede_importar ? 1 : 0
      });
      mostrarMensaje('exito', 'Usuario aprobado. Se ha enviado el código de acceso a su correo.');
      fetchUsuarios();
    } catch (err) {
      console.error(err);
      mostrarMensaje('error', 'Error al aprobar el usuario o enviar el correo.');
    } finally {
      setActionLoading(null);
    }
  };

  // Solicitar eliminación de usuario (abre modal)
  const handleEliminarUsuario = (id, email) => {
    setModalEliminarUsuario({ id, email });
  };

  // Confirmar y eliminar usuario
  const handleConfirmarEliminarUsuario = async () => {
    if (!modalEliminarUsuario) return;
    const { id } = modalEliminarUsuario;
    setActionLoading(id);
    try {
      await api.delete(`/admin/usuarios/${id}`);
      mostrarMensaje('exito', 'Usuario eliminado permanentemente.');
      fetchUsuarios();
      setModalEliminarUsuario(null);
    } catch (err) {
      console.error(err);
      mostrarMensaje('error', 'No se pudo eliminar el usuario.');
    } finally {
      setActionLoading(null);
    }
  };

  // Subir o actualizar foto de perfil
  const handlePhotoUpload = async (id, file) => {
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      mostrarMensaje('error', 'El archivo debe ser una imagen.');
      return;
    }

    // Convertir a base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setActionLoading(id);
      try {
        await api.put(`/admin/usuarios/${id}/foto`, { foto_perfil: base64String });
        mostrarMensaje('exito', 'Foto de perfil actualizada correctamente.');
        fetchUsuarios();
      } catch (err) {
        console.error(err);
        mostrarMensaje('error', 'No se pudo actualizar la foto de perfil.');
      } finally {
        setActionLoading(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const matchBusqueda = (u) => {
    const term = busqueda.toLowerCase().trim();
    if (!term) return true;
    const nombre = (u.nombre || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    return nombre.includes(term) || email.includes(term);
  };

  const loggedInEmail = (sessionStorage.getItem('userEmail') || '').toLowerCase();
  const pendientes = usuarios.filter(u => u.habilitado === false && u.estado === false && matchBusqueda(u));
  const activos = usuarios
    .filter(u => !(u.habilitado === false && u.estado === false) && matchBusqueda(u))
    .sort((a, b) => {
      const aIsSelf = a.email.toLowerCase() === loggedInEmail;
      const bIsSelf = b.email.toLowerCase() === loggedInEmail;
      if (aIsSelf && !bIsSelf) return -1;
      if (!aIsSelf && bIsSelf) return 1;
      return a.email.localeCompare(b.email);
    });

  // Paginación y Filtrado de Licitaciones
  const filteredLicitaciones = licitaciones.filter(lic => {
    const term = busquedaLicitacion.toLowerCase();
    return (
      (lic.nro_proceso || '').toLowerCase().includes(term) ||
      (lic.nombre_hospital || '').toLowerCase().includes(term) ||
      (lic.email_creador || '').toLowerCase().includes(term)
    );
  });
  const limitLicitaciones = 10;
  const totalPagesLicitaciones = Math.ceil(filteredLicitaciones.length / limitLicitaciones);
  const offsetLicitaciones = (paginaActual - 1) * limitLicitaciones;
  const paginatedLicitaciones = filteredLicitaciones.slice(offsetLicitaciones, offsetLicitaciones + limitLicitaciones);

  return (
    <div className="p-8 lg:p-12 bg-[#f8fafc] h-full overflow-y-auto font-sans">
      
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic flex items-center gap-3">
            <div className="p-2 rounded-xl shadow-lg bg-blue-600">
              <Settings className="text-white" size={28} />
            </div>
            Panel de <span className="text-blue-600">Administración</span>
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-2 italic flex items-center gap-1">
            <Sparkles size={12} className="text-amber-500 animate-pulse" /> Control de Usuarios, Licitaciones, Auditoría y Mantenimiento
          </p>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex gap-4 border-b border-slate-200 mb-8">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`pb-3 px-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-[2px] flex items-center gap-2 ${
            activeTab === 'usuarios'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <Users size={16} /> Usuarios y Mantenimiento
        </button>
        <button
          onClick={() => setActiveTab('licitaciones')}
          className={`pb-3 px-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-[2px] flex items-center gap-2 ${
            activeTab === 'licitaciones'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <FileText size={16} /> Licitaciones Importadas
        </button>
      </div>

      {/* TOAST MENSAJES */}
      {mensaje.texto && (
        <div className={`p-4 rounded-2xl mb-6 flex items-center gap-3 text-sm font-bold border animate-in slide-in-from-top ${
          mensaje.tipo === 'exito' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-rose-50 border-rose-100 text-rose-700'
        }`}>
          {mensaje.tipo === 'exito' ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {activeTab === 'usuarios' && (
        <>
          {/* PANEL DE CONTROL DE MANTENIMIENTO */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-8">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-rose-500 rounded-full"></div> Control de Mantenimiento y Actualizaciones del Sistema
        </h2>

        {mantenimientoLoading ? (
          <div className="py-4 text-center text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={16} /> Cargando estado de mantenimiento...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tarjeta Advertencia */}
            <div className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
              mantenimiento.advertencia 
                ? 'bg-amber-50/50 border-amber-200 shadow-sm shadow-amber-100' 
                : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'
            }`}>
              <div>
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 rounded-xl ${
                    mantenimiento.advertencia ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    <AlertTriangle size={22} className={mantenimiento.advertencia ? 'animate-pulse' : ''} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Banner de Advertencia</h3>
                    <p className="text-xs text-slate-500 mt-1 font-semibold leading-relaxed">
                      Muestra un banner superior informando a los usuarios activos que el sistema entrará en mantenimiento pronto para que guarden su trabajo.
                    </p>
                  </div>
                </div>

                {/* SELECTOR DE TIEMPO DE GRACIA */}
                {!mantenimiento.advertencia ? (
                  <div className="mt-2 mb-4 p-3 bg-slate-100/60 rounded-xl border border-slate-200/50 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tiempo de aviso previo:</span>
                    <select
                      value={minutosGracia}
                      onChange={(e) => setMinutosGracia(parseInt(e.target.value))}
                      className="bg-white border border-slate-200 text-xs font-bold rounded-lg px-3 py-1 outline-none text-slate-700 shadow-sm"
                    >
                      <option value={1}>1 Minuto</option>
                      <option value={2}>2 Minutos</option>
                      <option value={5}>5 Minutos</option>
                      <option value={10}>10 Minutos</option>
                      <option value={15}>15 Minutos</option>
                    </select>
                  </div>
                ) : (
                  mantenimiento.limite && (
                    <div className="mt-2 mb-4 p-3 bg-amber-100/50 rounded-xl border border-amber-200/50 flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase text-amber-700 tracking-wider">Límite de gracia establecido:</span>
                      <span className="text-xs font-bold text-amber-900">
                        Mantenimiento a las {new Date(mantenimiento.limite).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  )
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Estado: <span className={mantenimiento.advertencia ? 'text-amber-600 font-extrabold' : 'text-slate-500'}>
                    {mantenimiento.advertencia ? 'Activo (Mostrando Banner)' : 'Inactivo'}
                  </span>
                </span>
                <button
                  onClick={() => handleToggleMantenimiento('advertencia', mantenimiento.advertencia)}
                  disabled={mantenimientoActionLoading}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    mantenimiento.advertencia ? 'bg-amber-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      mantenimiento.advertencia ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Tarjeta Bloqueo */}
            <div className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
              mantenimiento.bloqueo 
                ? 'bg-rose-50/50 border-rose-200 shadow-sm shadow-rose-100' 
                : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'
            }`}>
              <div className="flex items-start gap-4 mb-4">
                <div className={`p-3 rounded-xl ${
                  mantenimiento.bloqueo ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  <ShieldAlert size={22} className={mantenimiento.bloqueo ? 'animate-pulse' : ''} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Bloqueo de Acceso General</h3>
                  <p className="text-xs text-slate-500 mt-1 font-semibold leading-relaxed">
                    Redirige inmediatamente a todos los usuarios no administradores a la pantalla de mantenimiento e impide nuevos accesos.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Estado: <span className={mantenimiento.bloqueo ? 'text-rose-600 font-extrabold' : 'text-slate-500'}>
                    {mantenimiento.bloqueo ? 'Bloqueado (Mantenimiento)' : 'Permitido'}
                  </span>
                </span>
                <button
                  onClick={() => handleToggleMantenimiento('bloqueo', mantenimiento.bloqueo)}
                  disabled={mantenimientoActionLoading}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    mantenimiento.bloqueo ? 'bg-rose-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      mantenimiento.bloqueo ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-24 text-center shadow-sm">
          <Loader2 className="animate-spin text-slate-400 mx-auto mb-4" size={40} />
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Cargando base de usuarios...</p>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* SOLICITUDES DE REGISTRO PENDIENTES */}
          <div>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <div className="w-1.5 h-4 bg-amber-500 rounded-full animate-pulse"></div> Solicitudes Pendientes de Aprobación ({pendientes.length})
            </h2>

            {pendientes.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center text-slate-400 text-sm font-bold flex flex-col items-center gap-2">
                <CheckCircle2 size={32} className="text-slate-300" />
                No hay solicitudes de acceso pendientes de revisión.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendientes.map(u => {
                  const state = editedUsers[u.id_usuario] || {};
                  return (
                    <div key={u.id_usuario} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className="bg-amber-50 border border-amber-100 text-amber-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                            Pendiente Aprobación
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Mail size={10} /> {u.email.split('@')[1]}
                          </span>
                        </div>
                        
                        <h3 className="font-black text-slate-800 text-sm truncate uppercase tracking-tight mb-4" title={u.email}>
                          {u.email}
                        </h3>

                        {/* CONFIGURACIÓN ANTES DE APROBAR */}
                        <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-5 text-xs font-bold text-slate-600">
                          
                          {/* Rol */}
                          <div>
                            <label className="text-[9px] text-slate-400 uppercase tracking-wider block mb-1">Rol del Usuario</label>
                            <select
                              value={state.rol}
                              onChange={(e) => handleEditChange(u.id_usuario, 'rol', e.target.value)}
                              className="w-full bg-white border border-slate-200 py-2 px-3 rounded-xl outline-none"
                            >
                              <option value="vendedor">Vendedor</option>
                              <option value="jefe">Jefe</option>
                              <option value="admin">Administrador</option>
                            </select>
                          </div>

                          

                          {/* Permiso Importar */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px]">¿Tiene Permisos de Importador?</span>
                            <input
                              type="checkbox"
                              checked={state.puede_importar}
                              onChange={(e) => handleEditChange(u.id_usuario, 'puede_importar', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                          </div>

                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAprobarUsuario(u.id_usuario)}
                          disabled={actionLoading === u.id_usuario}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl flex-1 transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          {actionLoading === u.id_usuario ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <>
                              <UserCheck size={14} /> Aprobar y Enviar Código
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleEliminarUsuario(u.id_usuario, u.email)}
                          disabled={actionLoading === u.id_usuario}
                          className="bg-rose-50 text-rose-600 hover:bg-rose-100 p-2.5 rounded-xl border border-rose-100 transition"
                          title="Rechazar y Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LISTADO DE USUARIOS REGISTRADOS / ACTIVOS */}
          <div>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div> Usuarios Registrados ({activos.length})
            </h2>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider bg-slate-50/50">
                      <th className="py-4 px-6 min-w-[220px]">
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            placeholder="Usuario"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="bg-transparent border-b border-slate-200/60 hover:border-slate-350 focus:border-blue-500 text-[10px] font-black uppercase text-slate-700 tracking-wider outline-none pb-1 w-full placeholder-slate-400/80 transition-all pr-6"
                          />
                          {busqueda ? (
                            <button
                              onClick={() => setBusqueda('')}
                              className="absolute right-1 text-slate-450 hover:text-rose-500 text-[10px] font-bold transition-colors"
                            >
                              ✕
                            </button>
                          ) : (
                            <Search size={12} className="absolute right-1 text-slate-400 pointer-events-none" />
                          )}
                        </div>
                      </th>
                      <th className="py-4 px-4">Estado Cuenta</th>
                      <th className="py-4 px-4">Rol</th>
                      <th className="py-4 px-4">Acceso Licitaciones</th>
                      <th className="py-4 px-4">Permiso Importar</th>
                      <th className="py-4 px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activos.map(u => {
                      const state = editedUsers[u.id_usuario] || {};
                      const loggedInEmail = sessionStorage.getItem('userEmail') || '';
                      const isSelf = u.email.toLowerCase() === loggedInEmail.toLowerCase();
                      
                      return (
                        <tr key={u.id_usuario} className="border-b border-slate-50 hover:bg-slate-50/30 transition text-slate-700 text-sm font-semibold">
                          
                          {/* Usuario info */}
                          <td className="py-5 px-6">
                            <div className="flex items-center gap-3">
                              {/* Avatar con File Uploader */}
                              <div className="relative group shrink-0">
                                <label className="cursor-pointer block" title="Subir / Cambiar Foto">
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => handlePhotoUpload(u.id_usuario, e.target.files[0])}
                                  />
                                  {u.foto_perfil ? (
                                    <img 
                                      src={u.foto_perfil} 
                                      alt={u.nombre} 
                                      className="w-10 h-10 rounded-full object-cover border-2 border-slate-100 shadow-sm hover:opacity-80 transition-opacity"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-black text-xs uppercase hover:bg-blue-100 transition-colors">
                                      {(u.nombre || u.email).substring(0, 2)}
                                    </div>
                                  )}
                                </label>
                                {/* Indicador de Conexión */}
                                <div 
                                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                    u.is_online === 1 ? 'bg-green-500 animate-pulse' : 'bg-slate-300'
                                  }`} 
                                  title={u.is_online === 1 ? "En línea" : "Desconectado"}
                                />
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-slate-800">{u.nombre || 'Registro Incompleto'}</span>
                                  {u.is_online === 1 && (
                                    <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wide">
                                      en línea
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-400 font-mono mt-0.5">{u.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Habilitado switch */}
                          <td className="py-5 px-4">
                            <div className="flex items-center gap-2">
                              {isSelf ? (
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                                  Habilitado (Tú)
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleEditChange(u.id_usuario, 'habilitado', !state.habilitado)}
                                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all tracking-wider ${
                                    state.habilitado
                                      ? 'bg-green-50 text-green-700 border border-green-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  {state.habilitado ? 'Habilitado' : 'Suspendido'}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Rol */}
                          <td className="py-5 px-4">
                            {isSelf ? (
                              <span className="text-slate-500 uppercase font-black text-xs">Administrador</span>
                            ) : (
                              <select
                                value={state.rol}
                                onChange={(e) => handleEditChange(u.id_usuario, 'rol', e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-lg py-1 px-2.5 text-xs outline-none focus:bg-white"
                              >
                                <option value="vendedor">Vendedor</option>
                                <option value="jefe">Jefe</option>
                                <option value="admin">Administrador</option>
                              </select>
                            )}
                          </td>

                          

                          {/* Puede importar */}
                          <td className="py-5 px-4">
                            {isSelf ? (
                              <input
                                type="checkbox"
                                checked={!!state.puede_importar}
                                disabled
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-not-allowed opacity-60"
                              />
                            ) : (
                              <input
                                type="checkbox"
                                checked={!!state.puede_importar}
                                onChange={(e) => handleEditChange(u.id_usuario, 'puede_importar', e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                              />
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="py-5 px-6 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleGuardarCambios(u.id_usuario)}
                                disabled={actionLoading === u.id_usuario}
                                className="bg-slate-800 hover:bg-slate-900 text-white p-2 rounded-xl transition flex items-center justify-center gap-1 text-xs font-bold px-3 py-2 shadow-sm"
                                title="Guardar Cambios"
                              >
                                {actionLoading === u.id_usuario ? (
                                  <Loader2 className="animate-spin" size={14} />
                                ) : (
                                  <>
                                    <Save size={14} /> Guardar
                                  </>
                                )}
                              </button>
                              
                              {!isSelf && (
                                <button
                                  onClick={() => handleEliminarUsuario(u.id_usuario, u.email)}
                                  disabled={actionLoading === u.id_usuario}
                                  className="bg-rose-50 text-rose-600 hover:bg-rose-100 p-2 rounded-xl border border-rose-100 transition flex items-center justify-center"
                                  title="Eliminar Usuario"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}
        </>
      )}

      {activeTab === 'licitaciones' && (
        <div className="space-y-6">
          {/* FILTRO Y CABECERA DE LICITACIONES */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div> Licitaciones e Historial de Comparativas Cargadas
              </h2>
              <p className="text-xs text-slate-400 font-bold uppercase mt-1">
                Auditoría de cargas, edición de hospital destinatario y eliminación segura en cascada
              </p>
            </div>
            
            <div className="relative w-full md:w-80 shrink-0">
              <input
                type="text"
                placeholder="Buscar por Hospital o Nro..."
                value={busquedaLicitacion}
                onChange={(e) => setBusquedaLicitacion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs font-bold rounded-xl py-2.5 pl-3 pr-8 outline-none placeholder-slate-400 transition"
              />
              <Search size={14} className="absolute right-3 top-3.5 text-slate-450 pointer-events-none" />
            </div>
          </div>

          {licitacionesLoading ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-24 text-center shadow-sm">
              <Loader2 className="animate-spin text-slate-400 mx-auto mb-4" size={40} />
              <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Cargando licitaciones...</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider bg-slate-50/50">
                      <th className="py-4 px-6">Proceso / Nro</th>
                      <th className="py-4 px-6">Hospital Destinatario</th>
                      <th className="py-4 px-6">Fecha Importación</th>
                      <th className="py-4 px-6">Cargado Por</th>
                      <th className="py-4 px-6">Items/Renglones</th>
                      <th className="py-4 px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLicitaciones.map(lic => (
                      <tr key={lic.id_proceso_db} className="border-b border-slate-50 hover:bg-slate-50/30 transition text-slate-700 text-sm font-semibold">
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-slate-400" />
                            <span className="font-black text-slate-800 uppercase font-mono">{lic.nro_proceso}</span>
                          </div>
                        </td>
                        <td className="py-5 px-6">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800 uppercase">{lic.nombre_hospital}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">{lic.provincia || 'SIN PROVINCIA'}</span>
                          </div>
                        </td>
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500">
                            <Calendar size={12} />
                            {lic.fecha_importacion ? new Date(lic.fecha_importacion).toLocaleString() : 'S/D'}
                          </div>
                        </td>
                        <td className="py-5 px-6">
                          <div className="flex flex-col">
                            <span className="text-slate-800 font-bold">{lic.nombre_creador || 'S/D'}</span>
                            <span className="text-xs text-slate-400 font-mono mt-0.5">{lic.email_creador || 'Desconocido'}</span>
                          </div>
                        </td>
                        <td className="py-5 px-6">
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full text-xs font-black">
                            {lic.cant_renglones} Renglones
                          </span>
                        </td>
                        <td className="py-5 px-6 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setModalEditar(lic)}
                              className="bg-slate-800 hover:bg-slate-900 text-white p-2 rounded-xl transition flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 shadow-sm"
                            >
                              <Edit3 size={14} /> Hospital
                            </button>
                            <button
                              onClick={() => setModalEliminar(lic.id_proceso_db)}
                              className="bg-rose-50 text-rose-600 hover:bg-rose-100 p-2.5 rounded-xl border border-rose-100 transition"
                              title="Eliminar Licitación"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredLicitaciones.length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-400 text-sm font-bold">
                          {licitaciones.length === 0 
                            ? 'No hay licitaciones importadas en el sistema.' 
                            : 'No se encontraron licitaciones que coincidan con la búsqueda.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPagesLicitaciones > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                  <span className="text-xs font-semibold text-slate-500">
                    Página <span className="font-bold text-slate-800">{paginaActual}</span> de <span className="font-bold text-slate-800">{totalPagesLicitaciones}</span> ({filteredLicitaciones.length} resultados)
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaginaActual(p => Math.max(p - 1, 1))}
                      disabled={paginaActual === 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPaginaActual(p => Math.min(p + 1, totalPagesLicitaciones))}
                      disabled={paginaActual === totalPagesLicitaciones}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE EDICIÓN DE HOSPITAL */}
      {modalEditar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 mb-2">
              <Building2 size={20} className="text-blue-600" /> Cambiar Hospital / Destinatario
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase mb-4 leading-relaxed">
              Selecciona el destinatario correcto para asociar todos los renglones cargados en este proceso.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                  Nro Proceso Licitación
                </label>
                <input
                  type="text"
                  disabled
                  value={modalEditar.nro_proceso}
                  className="w-full bg-slate-50 border border-slate-200 font-mono text-xs font-bold py-2.5 px-3.5 rounded-xl cursor-not-allowed text-slate-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                  Seleccionar Destinatario/Hospital
                </label>
                <select
                  value={modalEditar.id_destinatario || ''}
                  onChange={(e) => setModalEditar({ ...modalEditar, id_destinatario: parseInt(e.target.value) })}
                  className="w-full bg-white border border-slate-200 text-xs font-bold py-2.5 px-3 rounded-xl outline-none"
                >
                  <option value="">-- SELECCIONAR HOSPITAL --</option>
                  {destinatarios.map(dest => (
                    <option key={dest.id_destinatario} value={dest.id_destinatario}>
                      {dest.nombre_hospital} ({dest.provincia})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalEditar(null)}
                className="bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl flex-1 transition border border-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleUpdateHospital(modalEditar.id_proceso_db, modalEditar.id_destinatario)}
                disabled={!modalEditar.id_destinatario}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl flex-1 transition disabled:opacity-50"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-12 h-12 bg-rose-50 border border-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle size={24} className="animate-bounce" />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">
              ¿Eliminar Licitación?
            </h3>
            <p className="text-xs text-rose-600 font-bold uppercase leading-relaxed mb-6">
              ¡ATENCIÓN! Se eliminará permanentemente la licitación y TODOS sus renglones e historial de ofertas asociadas de forma irreversible (eliminación en cascada).
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setModalEliminar(null)}
                className="bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl flex-1 transition border border-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteLicitacion(modalEliminar)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl flex-1 transition shadow-md shadow-rose-100"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE USUARIO */}
      {modalEliminarUsuario && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto w-12 h-12 bg-rose-50 border border-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle size={24} className="animate-bounce" />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">
              ¿Eliminar Usuario?
            </h3>
            <p className="text-xs text-rose-650 font-bold uppercase leading-relaxed mb-6">
              ¡ATENCIÓN! Se eliminará permanentemente al usuario <span className="font-black text-slate-800 break-all">{modalEliminarUsuario.email}</span> de forma irreversible.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setModalEliminarUsuario(null)}
                className="bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl flex-1 transition border border-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarEliminarUsuario}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl flex-1 transition shadow-md shadow-rose-100"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsuarios;
