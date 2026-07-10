import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { 
  User, 
  Lock, 
  Building2, 
  Mail, 
  ShieldCheck, 
  Moon, 
  Sun, 
  X, 
  Save, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';

const PerfilModal = ({ isOpen, onClose, onUserUpdated, initialTab = 'perfil', userFotoPerfil }) => {
  const [activeTab, setActiveTab] = useState(initialTab); // 'perfil' o 'ajustes'
  
  // Datos del sessionStorage
  const userEmail = sessionStorage.getItem('userEmail') || '';
  const initialName = sessionStorage.getItem('userName') || '';
  const userRol = sessionStorage.getItem('userRol') || '';
  
  const puedeImportar = sessionStorage.getItem('userPuedeImportar') === '1' || sessionStorage.getItem('userPuedeImportar') === 'true';

  // Formulario
  const [nombre, setNombre] = useState(initialName);
  const [passwordActual, setPasswordActual] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');

  // Estados de carga y feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({
    passwordActual: false,
    nuevoPassword: false,
    confirmarPassword: false
  });

  // Modo Oscuro
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || document.body.classList.contains('dark');
  });

  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    if (nextMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleUpdatePerfil = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setValidationErrors({
      passwordActual: false,
      nuevoPassword: false,
      confirmarPassword: false
    });

    // 1. Validar si no hubo cambios
    const noHayPassword = !passwordActual && !nuevoPassword && !confirmarPassword;
    if (nombre.trim() === initialName.trim() && noHayPassword) {
      setError('No se detectaron cambios para guardar.');
      return;
    }

    // 2. Validar si se intentó cambiar contraseña pero faltan campos
    const algunPasswordLleno = passwordActual || nuevoPassword || confirmarPassword;
    if (algunPasswordLleno) {
      let tieneErrores = false;
      const nuevosErrores = { passwordActual: false, nuevoPassword: false, confirmarPassword: false };

      if (!passwordActual) {
        nuevosErrores.passwordActual = true;
        tieneErrores = true;
      }
      if (!nuevoPassword) {
        nuevosErrores.nuevoPassword = true;
        tieneErrores = true;
      }
      if (!confirmarPassword) {
        nuevosErrores.confirmarPassword = true;
        tieneErrores = true;
      }

      if (tieneErrores) {
        setValidationErrors(nuevosErrores);
        setError('Para cambiar tu contraseña debes completar todos los campos correspondientes.');
        return;
      }

      // 3. Validar coincidencia de nueva contraseña
      if (nuevoPassword !== confirmarPassword) {
        setValidationErrors({
          passwordActual: false,
          nuevoPassword: true,
          confirmarPassword: true
        });
        setError('La nueva contraseña y su confirmación no coinciden.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = { nombre };
      if (passwordActual && nuevoPassword) {
        payload.passwordActual = passwordActual;
        payload.nuevoPassword = nuevoPassword;
      }

      const res = await api.put('/auth/perfil', payload);

      // Guardar nuevos datos en sessionStorage
      sessionStorage.setItem('token', res.data.token);
      sessionStorage.setItem('userName', res.data.user.nombre);
      sessionStorage.setItem('userEmail', res.data.user.email);
      sessionStorage.setItem('userRol', res.data.user.rol);
      sessionStorage.setItem('userEmpresaAcceso', res.data.user.empresa_acceso);
      sessionStorage.setItem('userPuedeImportar', res.data.user.puede_importar);

      setSuccess('Perfil actualizado con éxito.');
      setPasswordActual('');
      setNuevoPassword('');
      setConfirmarPassword('');

      if (onUserUpdated) {
        onUserUpdated(res.data.user.nombre);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar el perfil.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Background Blur */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-gray-800 max-w-lg w-full overflow-hidden flex flex-col relative z-10 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-gray-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 dark:bg-blue-500 text-white p-2.5 rounded-xl shadow-md">
              <User size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight italic">
              Configuración de Perfil
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="bg-slate-50 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 p-2 rounded-full transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs navigation */}
        <div className="flex border-b border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/50 p-2 shrink-0 gap-2">
          <button
            onClick={() => { setActiveTab('perfil'); setError(''); setSuccess(''); }}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition duration-200 ${
              activeTab === 'perfil'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800'
            }`}
          >
            Mi Perfil
          </button>
          <button
            onClick={() => { setActiveTab('ajustes'); setError(''); setSuccess(''); }}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition duration-200 ${
              activeTab === 'ajustes'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800'
            }`}
          >
            Ajustes de Cuenta
          </button>
        </div>

        {/* Feedback Messages */}
        <div className="px-8 pt-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 p-3.5 rounded-2xl text-xs font-bold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400 p-3.5 rounded-2xl text-xs font-bold">
              <CheckCircle size={16} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>

        {/* Body content */}
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
          
          {activeTab === 'perfil' ? (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-slate-50 dark:bg-gray-800/40 border border-slate-100 dark:border-gray-800/80 p-5 rounded-3xl flex items-center gap-4">
                {userFotoPerfil ? (
                  <img 
                    src={userFotoPerfil} 
                    alt={nombre} 
                    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full text-white flex items-center justify-center font-black text-lg shadow-lg">
                    {nombre ? nombre.substring(0, 2).toUpperCase() : userEmail.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white uppercase truncate max-w-[280px]">
                    {nombre || 'Sin Nombre'}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-gray-500 truncate max-w-[280px]">{userEmail}</p>
                </div>
              </div>

              {/* Scope & Details */}
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-gray-800/60">
                  <span className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Building2 size={14} /> Empresa Asignada
                  </span>
                  <span className={`text-xs font-black uppercase px-3.5 py-1 rounded-xl shadow-sm ${
                    userEmpresaAcceso === 'TODAS'
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30'
                      : userEmpresaAcceso === 'DROGUERIA DEMO'
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30'
                      : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                  }`}>
                    {userEmpresaAcceso}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-gray-800/60">
                  <span className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck size={14} /> Rol Administrativo
                  </span>
                  <span className="text-xs font-black uppercase text-slate-700 dark:text-gray-300">
                    {userRol === 'admin' ? 'Administrador General' : 'Vendedor / Comercial'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3">
                  <span className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle size={14} /> Carga / Importador
                  </span>
                  <span className={`text-xs font-black uppercase px-3.5 py-1 rounded-xl ${
                    puedeImportar 
                      ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-100 dark:border-green-900/30' 
                      : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-100 dark:border-red-900/30'
                  }`}>
                    {puedeImportar ? 'Habilitado' : 'Solo Consultas'}
                  </span>
                </div>
              </div>

              {/* Theme Settings inside Profile for convenience */}
              <div className="border-t border-slate-100 dark:border-gray-800 pt-5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Modo Oscuro</h4>
                  <p className="text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-tight mt-0.5">Alternar interfaz visual</p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className="flex items-center gap-2 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-750 px-4 py-2 rounded-xl transition duration-200 text-xs font-black uppercase text-slate-700 dark:text-gray-300"
                >
                  {darkMode ? (
                    <>
                      <Sun size={15} className="text-amber-400" />
                      <span>Modo Claro</span>
                    </>
                  ) : (
                    <>
                      <Moon size={15} className="text-indigo-500" />
                      <span>Modo Oscuro</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          ) : (
            <form onSubmit={handleUpdatePerfil} className="space-y-5">
              
              {/* Nombre completo */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2">Nombre de Usuario</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 text-slate-300" size={16} />
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-750 rounded-2xl text-sm font-bold outline-none"
                    placeholder="Tu nombre completo"
                  />
                </div>
              </div>

              {/* Divider de contraseña */}
              <div className="border-t border-slate-100 dark:border-gray-800 my-4 pt-4">
                <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Cambiar Contraseña</h4>
                <p className="text-[10px] text-slate-400 dark:text-gray-500 font-bold uppercase tracking-tight mt-0.5">Completa solo si deseas modificarla</p>
              </div>

              {/* Contraseña Actual */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2">Contraseña Actual</label>
                <div className="relative">
                  <Lock className={`absolute left-3.5 top-3.5 transition-all ${validationErrors.passwordActual ? 'text-red-500' : 'text-slate-300'}`} size={16} />
                  <input
                    type="password"
                    value={passwordActual}
                    onChange={(e) => setPasswordActual(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-gray-800 border rounded-2xl text-sm font-bold outline-none transition-all ${
                      validationErrors.passwordActual
                        ? 'border-red-500 ring-2 ring-red-100 dark:ring-red-950/20'
                        : 'border-slate-200 dark:border-gray-750 focus:border-blue-500'
                    }`}
                    placeholder="Contraseña actual"
                  />
                </div>
              </div>

              {/* Nueva Contraseña */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2">Nueva Contraseña</label>
                  <div className="relative">
                    <Lock className={`absolute left-3.5 top-3.5 transition-all ${validationErrors.nuevoPassword ? 'text-red-500' : 'text-slate-300'}`} size={16} />
                    <input
                      type="password"
                      value={nuevoPassword}
                      onChange={(e) => setNuevoPassword(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-gray-800 border rounded-2xl text-sm font-bold outline-none transition-all ${
                        validationErrors.nuevoPassword
                          ? 'border-red-500 ring-2 ring-red-100 dark:ring-red-950/20'
                          : 'border-slate-200 dark:border-gray-750 focus:border-blue-500'
                      }`}
                      placeholder="Nueva contraseña"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2">Confirmar Contraseña</label>
                  <div className="relative">
                    <Lock className={`absolute left-3.5 top-3.5 transition-all ${validationErrors.confirmarPassword ? 'text-red-500' : 'text-slate-300'}`} size={16} />
                    <input
                      type="password"
                      value={confirmarPassword}
                      onChange={(e) => setConfirmarPassword(e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-gray-800 border rounded-2xl text-sm font-bold outline-none transition-all ${
                        validationErrors.confirmarPassword
                          ? 'border-red-500 ring-2 ring-red-100 dark:ring-red-950/20'
                          : 'border-slate-200 dark:border-gray-750 focus:border-blue-500'
                      }`}
                      placeholder="Confirmar nueva"
                    />
                  </div>
                </div>
              </div>

              {/* Botón Guardar */}
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl shadow-lg transition duration-200 w-full sm:w-auto"
                >
                  <Save size={16} />
                  <span>{loading ? 'Guardando...' : 'Guardar Ajustes'}</span>
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};

export default PerfilModal;
