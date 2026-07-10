import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import Comparativas from './pages/Comparativas';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AsistenteIA from './pages/AsistenteIA';
import Importador from './pages/Importador';
import Seguimiento from './pages/Seguimiento';
import AdminUsuarios from './pages/AdminUsuarios';
import Inventario from './pages/Inventario';
import Cotizador from './pages/Cotizador';
import Contactos from './pages/Contactos';
import AnmatPM from './pages/AnmatPM';
import PerfilModal from './components/PerfilModal';
import Mantenimiento from './pages/contingencia/Mantenimiento';
import ErrorConexion from './pages/contingencia/ErrorConexion';
import PaginaNoEncontrada from './pages/contingencia/PaginaNoEncontrada';
import AccesoDenegado from './pages/contingencia/AccesoDenegado';
import GuidedTour from './components/GuidedTour';

import logoDpc from './assets/LogoDPC.png';
import logoSr from './assets/LogoSR.png';
import { UploadCloud, LogOut, Settings, User, ChevronDown, AlertCircle, Users, AlertTriangle, Loader2, Activity, Boxes, ShieldAlert, Contact2, DollarSign, Bell, HelpCircle, ShieldCheck, Menu, X } from 'lucide-react'; 
import api from './api/api';

// ============================
// DROPDOWN "HERRAMIENTAS"
// ============================
function HerramientasDropdown({ isActive, handleSafeClick }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  const isHerramientasActive = isActive('/inventario') || isActive('/cotizador') || isActive('/anmat');

  // Cerrar al hacer click afuera
  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const items = [
    { to: '/inventario', label: 'Inventario', icon: <Boxes size={15} />, id: 'tour-inventario' },
    { to: '/cotizador',  label: 'Cotizador',  icon: <Activity size={15} />, id: 'tour-cotizador' },
    { to: '/anmat',      label: 'PM ANMAT',   icon: <ShieldCheck size={15} />, id: 'tour-anmat' },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        id="tour-herramientas"
        onClick={() => setOpen(o => !o)}
        className={`px-3.5 py-2 rounded-xl font-bold transition-all text-sm flex items-center gap-1.5 cursor-pointer ${
          isHerramientasActive
            ? 'text-[#0059a3] bg-blue-50/50 dark:text-blue-400 dark:bg-blue-900/30'
            : 'text-[#64748b] hover:text-[#0059a3] hover:bg-slate-50 dark:text-slate-300 dark:hover:text-blue-400 dark:hover:bg-slate-800'
        }`}
      >
        Herramientas
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/60 dark:shadow-none py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {items.map(item => (
            <Link
              key={item.to}
              to={item.to}
              id={item.id}
              onClick={(e) => { handleSafeClick(e, item.to); setOpen(false); }}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm font-bold transition-all mx-1 rounded-xl ${
                isActive(item.to)
                  ? 'text-[#0059a3] bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30'
                  : 'text-slate-600 hover:text-[#0059a3] hover:bg-slate-50 dark:text-slate-300 dark:hover:text-blue-400 dark:hover:bg-slate-800'
              }`}
            >
              <span className={isActive(item.to) ? 'text-[#0059a3] dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function NavigationHeader({ token, userEmail, userName, userFotoPerfil, handleLogoutClick, getInitials, openPerfil, handleSafeClick }) {

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const dropdownRef = React.useRef(null);

  // Estados para notificaciones
  const [notificaciones, setNotificaciones] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifDropdownRef = React.useRef(null);

  const fetchNotificaciones = async () => {
    try {
      const res = await api.get('/notificaciones');
      setNotificaciones(res.data);
    } catch (err) {
      console.error('Error al traer notificaciones:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchNotificaciones();
      const interval = setInterval(fetchNotificaciones, 30000); // Polling de 30 segundos
      return () => clearInterval(interval);
    }
  }, [token]);
  
  // Close menu if clicked outside dropdown container
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    
    if (menuOpen || notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen, notifOpen]);

  const marcarTodasComoLeidas = async () => {
    try {
      await api.post('/notificaciones/marcar-leido');
      setNotificaciones(prev => prev.map(n => ({ ...n, leido: true })));
    } catch (err) {
      console.error('Error al marcar notificaciones:', err);
    }
  };

  const unreadCount = notificaciones.filter(n => !n.leido).length;

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path;
  };

  const puedeImportar = sessionStorage.getItem('userPuedeImportar') === '1' || sessionStorage.getItem('userPuedeImportar') === 'true';
  const userRol = sessionStorage.getItem('userRol');

  if (!token || location.pathname === '/error-conexion' || location.pathname === '/mantenimiento') return null;

  return (
    <nav className="bg-white/80 dark:bg-slate-900 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
      
      {/* SECCIÓN IZQUIERDA: TITULO Y LOGO */}
      <div className="flex items-center space-x-3 shrink-0">
        <span className="text-base font-black text-slate-800 dark:text-white uppercase tracking-[0.15em] italic">
          Droguería <span className="text-blue-600">Gestión</span>
        </span>
      </div>

      {/* SECCIÓN LINKS Y CONTROLES DERECHA */}
      <div className="flex items-center space-x-4 md:space-x-8">
        <div className="hidden md:flex space-x-2 items-center">
          <Link 
            to="/" 
            id="tour-comparativas"
            onClick={(e) => handleSafeClick(e, '/')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all text-sm ${isActive('/') ? 'text-[#0059a3] bg-blue-50/50' : 'text-[#64748b] hover:text-[#0059a3] hover:bg-slate-50'}`}
          >
            Comparativas
          </Link>
          <Link 
            to="/dashboard" 
            id="tour-estadisticas"
            onClick={(e) => handleSafeClick(e, '/dashboard')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all text-sm ${isActive('/dashboard') ? 'text-[#0059a3] bg-blue-50/50' : 'text-[#64748b] hover:text-[#0059a3] hover:bg-slate-50'}`}
          >
            Estadísticas
          </Link>
          <Link 
            to="/seguimiento" 
            id="tour-seguimiento"
            onClick={(e) => handleSafeClick(e, '/seguimiento')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all text-sm ${isActive('/seguimiento') ? 'text-[#0059a3] bg-blue-50/50' : 'text-[#64748b] hover:text-[#0059a3] hover:bg-slate-50'}`}
          >
            Seguimiento
          </Link>
          <Link 
            to="/contactos" 
            id="tour-contactos"
            onClick={(e) => handleSafeClick(e, '/contactos')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all text-sm flex items-center gap-1.5 ${isActive('/contactos') ? 'text-[#0059a3] bg-blue-50/50' : 'text-[#64748b] hover:text-[#0059a3] hover:bg-slate-50'}`}
          >
            <Contact2 size={14} /> Contactos
          </Link>

          {/* DROPDOWN HERRAMIENTAS */}
          <HerramientasDropdown isActive={isActive} handleSafeClick={handleSafeClick} />
        </div>

        <div className="hidden md:block h-6 w-[1px] bg-slate-200 dark:bg-slate-700"></div>

        {/* SECCIÓN USUARIO / ACCIONES EXTRAS */}
        <div className="relative flex items-center gap-2 md:gap-3" ref={dropdownRef}>
          <Link 
            to="/ia" 
            id="tour-ia"
            onClick={(e) => handleSafeClick(e, '/ia')}
            className={`px-3 py-2 md:px-4.5 text-[#0059a3] bg-[#eff6ff] hover:bg-[#dbeafe] rounded-xl font-black transition-all text-sm border border-[#bfdbfe] flex items-center gap-2 shadow-sm ${isActive('/ia') ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0059a3]"></span>
            </div>
            <span className="hidden sm:inline">Asistente IA</span>
            <span className="sm:hidden">IA</span>
          </Link>

          {/* BOTÓN DE AYUDA / TOUR GUIADO */}
          <button 
            onClick={() => window.dispatchEvent(new Event('start-drogueria-tour'))}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-500 hover:text-slate-700 focus:outline-none cursor-pointer"
            title="Ver tutorial guiado"
          >
            <HelpCircle size={20} />
          </button>

          {/* CAMPANA DE NOTIFICACIONES */}
          <div className="relative flex items-center" ref={notifDropdownRef}>
            <button 
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all relative text-slate-650 focus:outline-none"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[9px] font-black text-white items-center justify-center">
                    {unreadCount}
                  </span>
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 z-50 py-3 animate-in fade-in zoom-in duration-200">
                <div className="px-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-slate-800 italic">Notificaciones</span>
                  {unreadCount > 0 && (
                    <button 
                      onClick={marcarTodasComoLeidas}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition"
                    >
                      Marcar leídas
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto custom-scrollbar divide-y divide-slate-50">
                  {notificaciones.length === 0 ? (
                    <div className="p-6 text-center text-xs font-semibold text-slate-400">
                      Sin novedades por ahora.
                    </div>
                  ) : (
                    notificaciones.map(n => (
                      <div 
                        key={n.id_notificacion} 
                        className={`p-3 transition-colors text-left flex flex-col gap-1 ${!n.leido ? 'bg-blue-50/20' : ''}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider ${!n.leido ? 'text-[#0059a3]' : 'text-slate-500'}`}>
                            {n.titulo}
                          </span>
                          <span className="text-[9px] font-medium text-slate-400 shrink-0">
                            {new Date(n.fecha_creacion).toLocaleDateString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-650 leading-normal">
                          {n.mensaje}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 group focus:outline-none shrink-0">
            {userFotoPerfil ? (
              <img 
                src={userFotoPerfil} 
                alt={userName} 
                className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-md group-hover:shadow-blue-200 transition-all"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 text-white flex items-center justify-center font-bold text-xs shadow-md border-2 border-white group-hover:shadow-blue-200 transition-all">
                {getInitials()}
              </div>
            )}
            <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* BOTÓN HAMBURGUESA MOBILE */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl focus:outline-none"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 py-2 overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-4 py-2.5 border-b border-slate-50 bg-slate-50/50">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 italic">Hola,</p>
                <p className="text-xs font-bold text-blue-900 truncate">
                  {userName && userName !== "undefined" && userName !== "null" ? userName : userEmail}
                </p>
              </div>
              
              <button 
                onClick={(e) => { setMenuOpen(false); handleSafeClick(e, () => openPerfil('perfil')); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-655 hover:bg-blue-50 hover:text-[#0059a3] transition-colors"
              >
                <User size={14} /> Mi Perfil
              </button>
              <button 
                onClick={(e) => { setMenuOpen(false); handleSafeClick(e, () => openPerfil('ajustes')); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-655 hover:bg-blue-50 hover:text-[#0059a3] transition-colors"
              >
                <Settings size={14} /> Ajustes
              </button>

              {puedeImportar && (
                <Link 
                  to="/importar" 
                  onClick={(e) => { setMenuOpen(false); handleSafeClick(e, '/importar'); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-655 hover:bg-blue-50 hover:text-[#0059a3] transition-colors"
                >
                  <UploadCloud size={14} /> Importar Datos
                </Link>
              )}

              {userRol === 'admin' && (
                <Link 
                  to="/admin" 
                  onClick={(e) => { setMenuOpen(false); handleSafeClick(e, '/admin'); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-655 hover:bg-blue-50 hover:text-[#0059a3] transition-colors"
                >
                  <Users size={14} /> Panel Administrador
                </Link>
              )}
              
              <div className="border-t border-slate-50 my-1"></div>
              
              <button onClick={(e) => { setMenuOpen(false); handleSafeClick(e, handleLogoutClick); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors font-bold">
                <LogOut size={14} /> Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-xl md:hidden flex flex-col p-4 gap-1 z-50 animate-in slide-in-from-top-2">
          <Link 
            to="/" 
            onClick={(e) => { handleSafeClick(e, '/'); setMobileMenuOpen(false); }}
            className={`px-4 py-3 rounded-xl font-bold transition-all text-sm ${isActive('/') ? 'text-[#0059a3] bg-blue-50/50 dark:text-blue-400 dark:bg-blue-900/30' : 'text-[#64748b] hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            Comparativas
          </Link>
          <Link 
            to="/dashboard" 
            onClick={(e) => { handleSafeClick(e, '/dashboard'); setMobileMenuOpen(false); }}
            className={`px-4 py-3 rounded-xl font-bold transition-all text-sm ${isActive('/dashboard') ? 'text-[#0059a3] bg-blue-50/50 dark:text-blue-400 dark:bg-blue-900/30' : 'text-[#64748b] hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            Estadísticas
          </Link>
          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-4"></div>
          <p className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">Herramientas</p>
          <Link 
            to="/inventario" 
            onClick={(e) => { handleSafeClick(e, '/inventario'); setMobileMenuOpen(false); }}
            className={`px-4 py-3 rounded-xl font-bold transition-all text-sm ${isActive('/inventario') ? 'text-[#0059a3] bg-blue-50/50 dark:text-blue-400 dark:bg-blue-900/30' : 'text-[#64748b] hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            Inventario
          </Link>
          <Link 
            to="/cotizador" 
            onClick={(e) => { handleSafeClick(e, '/cotizador'); setMobileMenuOpen(false); }}
            className={`px-4 py-3 rounded-xl font-bold transition-all text-sm ${isActive('/cotizador') ? 'text-[#0059a3] bg-blue-50/50 dark:text-blue-400 dark:bg-blue-900/30' : 'text-[#64748b] hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            Cotizador
          </Link>
          <Link 
            to="/anmat" 
            onClick={(e) => { handleSafeClick(e, '/anmat'); setMobileMenuOpen(false); }}
            className={`px-4 py-3 rounded-xl font-bold transition-all text-sm ${isActive('/anmat') ? 'text-[#0059a3] bg-blue-50/50 dark:text-blue-400 dark:bg-blue-900/30' : 'text-[#64748b] hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            PM ANMAT
          </Link>
          <div className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-4"></div>
          <Link 
            to="/seguimiento" 
            onClick={(e) => { handleSafeClick(e, '/seguimiento'); setMobileMenuOpen(false); }}
            className={`px-4 py-3 rounded-xl font-bold transition-all text-sm ${isActive('/seguimiento') ? 'text-[#0059a3] bg-blue-50/50 dark:text-blue-400 dark:bg-blue-900/30' : 'text-[#64748b] hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            Seguimiento
          </Link>
          <Link 
            to="/contactos" 
            onClick={(e) => { handleSafeClick(e, '/contactos'); setMobileMenuOpen(false); }}
            className={`px-4 py-3 rounded-xl font-bold transition-all text-sm flex items-center gap-2 ${isActive('/contactos') ? 'text-[#0059a3] bg-blue-50/50 dark:text-blue-400 dark:bg-blue-900/30' : 'text-[#64748b] hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            <Contact2 size={16} /> Contactos
          </Link>
          <div className="border-t border-slate-100 dark:border-slate-800 my-2"></div>
          <Link 
            to="/inventario" 
            onClick={(e) => { handleSafeClick(e, '/inventario'); setMobileMenuOpen(false); }}
            className={`px-4 py-3 rounded-xl font-bold transition-all text-sm flex items-center gap-2 ${isActive('/inventario') ? 'text-[#0059a3] bg-blue-50/50 dark:text-blue-400 dark:bg-blue-900/30' : 'text-[#64748b] hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            <Boxes size={16} /> Inventario
          </Link>
          <Link 
            to="/cotizador" 
            onClick={(e) => { handleSafeClick(e, '/cotizador'); setMobileMenuOpen(false); }}
            className={`px-4 py-3 rounded-xl font-bold transition-all text-sm flex items-center gap-2 ${isActive('/cotizador') ? 'text-[#0059a3] bg-blue-50/50 dark:text-blue-400 dark:bg-blue-900/30' : 'text-[#64748b] hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            <Activity size={16} /> Cotizador
          </Link>
          <Link 
            to="/anmat" 
            onClick={(e) => { handleSafeClick(e, '/anmat'); setMobileMenuOpen(false); }}
            className={`px-4 py-3 rounded-xl font-bold transition-all text-sm flex items-center gap-2 ${isActive('/anmat') ? 'text-[#0059a3] bg-blue-50/50 dark:text-blue-400 dark:bg-blue-900/30' : 'text-[#64748b] hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
          >
            <ShieldCheck size={16} /> PM ANMAT
          </Link>
        </div>
      )}
    </nav>
  );
}

function App() {
  const token = sessionStorage.getItem('userEmail');
  const location = useLocation();
  const navigate = useNavigate();
  
  // LEEMOS TANTO EL MAIL COMO EL NOMBRE REAL
  const userEmail = sessionStorage.getItem('userEmail') || '';
  const [currentUserName, setCurrentUserName] = useState(sessionStorage.getItem('userName'));
  const [userFotoPerfil, setUserFotoPerfil] = useState(sessionStorage.getItem('userFotoPerfil') || '');
  
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isPerfilOpen, setIsPerfilOpen] = useState(false);
  const [perfilTab, setPerfilTab] = useState('perfil');

  const [warningActive, setWarningActive] = useState(false);
  const [maintenanceLimit, setMaintenanceLimit] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [appInitializing, setAppInitializing] = useState(true);
  const [showPermModal, setShowPermModal] = useState(false);
  
  // Estados para proteger los datos sin guardar en el Importador
  const [isImportadorDirty, setIsImportadorDirty] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [pendingTransition, setPendingTransition] = useState(null);

  const handleSafeClick = (e, callbackOrPath) => {
    if (isImportadorDirty) {
      e.preventDefault();
      setPendingTransition(() => callbackOrPath);
      setShowUnsavedConfirm(true);
    } else {
      if (typeof callbackOrPath === 'function') {
        callbackOrPath();
      }
    }
  };

  // Simular inicialización de la app / splash screen
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setAppInitializing(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Polling y redirección automática por estado de mantenimiento/contingencia
  React.useEffect(() => {
    if (location.pathname === '/error-conexion') return; // Si no hay conexión, omitir polling

    const checkMantenimiento = async () => {
      try {
        const res = await api.get('/auth/status-mantenimiento');
        const userRol = sessionStorage.getItem('userRol');
        const isAdmin = userRol === 'admin';
        const currentToken = sessionStorage.getItem('userEmail');

        // 1. Si el bloqueo está activo y el usuario NO es admin
        if (res.data.bloqueo && !isAdmin) {
          if (location.pathname !== '/mantenimiento') {
            navigate('/mantenimiento', { replace: true });
          }
        } 
        // 2. Si el bloqueo NO está activo (o el usuario es admin)
        else {
          if (location.pathname === '/mantenimiento') {
            navigate(currentToken ? '/' : '/login', { replace: true });
          }
        }

        setWarningActive(res.data.advertencia && !isAdmin);
        setMaintenanceLimit(res.data.limite || '');

        // 3. Verificar si los permisos del usuario cambiaron en tiempo real (si está logueado)
        if (currentToken) {
          try {
            const permRes = await api.get('/auth/check-permissions');
            if (permRes.data.user.habilitado === false || permRes.data.user.habilitado === 0) {
              alert("Tu acceso ha sido deshabilitado o revocado por el administrador.");
              confirmLogout();
              return;
            }
            // Sincronizar foto de perfil en tiempo real si el administrador la cambió
            const newFoto = permRes.data.user.foto_perfil || '';
            if (sessionStorage.getItem('userFotoPerfil') !== newFoto) {
              sessionStorage.setItem('userFotoPerfil', newFoto);
              setUserFotoPerfil(newFoto);
            }

            if (permRes.data.cambiado) {
              sessionStorage.setItem('userName', permRes.data.user.nombre);
              sessionStorage.setItem('userRol', permRes.data.user.rol);
              sessionStorage.setItem('userEmpresaAcceso', permRes.data.user.empresa_acceso);
              sessionStorage.setItem('userPuedeImportar', permRes.data.user.puede_importar === 1 ? '1' : '0');
              
              setShowPermModal(true);
              return;
            }
          } catch (permErr) {
            console.error("Error al verificar permisos en caliente:", permErr);
          }
        }
      } catch (err) {
        console.error("Error al consultar estado de mantenimiento:", err);
      }
    };

    checkMantenimiento();
    // Si el usuario está en la página de mantenimiento, poll rápido de 3s para levantarlo apenas se desactive.
    // En las demás páginas, un intervalo de 10s es óptimo.
    const intervalTime = location.pathname === '/mantenimiento' ? 3000 : 10000;
    const interval = setInterval(checkMantenimiento, intervalTime);
    return () => clearInterval(interval);
  }, [location.pathname, navigate]);

  // Timer local para la cuenta regresiva en el banner
  React.useEffect(() => {
    if (!warningActive || !maintenanceLimit) {
      setTimeLeft('');
      return;
    }

    const updateCountdown = () => {
      const diffMs = new Date(maintenanceLimit) - new Date();
      if (diffMs <= 0) {
        setTimeLeft('00:00');
        return;
      }

      const totalSec = Math.floor(diffMs / 1000);
      const minutes = Math.floor(totalSec / 60);
      const seconds = totalSec % 60;
      
      const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      setTimeLeft(formatted);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [warningActive, maintenanceLimit]);

  // Inicializar clase dark si está guardado en localStorage
  React.useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, []);

  // Heartbeat de presencia online (cada 30s)
  React.useEffect(() => {
    if (!token) return;

    const sendHeartbeat = async () => {
      try {
        await api.post('/auth/heartbeat');
      } catch (err) {
        console.error("Error al enviar heartbeat de presencia:", err.message);
      }
    };

    // Enviar el primero de forma inmediata
    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const confirmLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error("Error al notificar logout al servidor:", err);
    }
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userName'); 
    sessionStorage.removeItem('userRol');
    sessionStorage.removeItem('userEmpresaAcceso');
    sessionStorage.removeItem('userPuedeImportar');
    sessionStorage.removeItem('userFotoPerfil');
    document.body.classList.remove('dark');
    setShowLogoutConfirm(false);
    window.location.href = '/login';
  };

  // FUNCIÓN DE INICIALES
  const getInitials = () => {
    if (currentUserName && currentUserName !== "undefined" && currentUserName !== "null") {
      const names = currentUserName.trim().split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return names[0][0].toUpperCase();
    }

    const namePart = userEmail.split('@')[0];
    if (namePart.includes('.')) {
      const pieces = namePart.split('.');
      return (pieces[0][0] + pieces[1][0]).toUpperCase();
    }
    
    return namePart.substring(0, 2).toUpperCase();
  };

  const userRol = localStorage.getItem('userRol');

  if (appInitializing) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center font-sans select-none overflow-hidden relative">
        {/* Glowing aura */}
        <div className="absolute w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        
        <div className="relative z-10 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
          {/* Pulse ring container */}
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-blue-600/10 border border-blue-500/30 shadow-2xl shadow-blue-500/10">
            <span className="absolute inset-0 rounded-full border border-blue-400/50 animate-ping opacity-30" />
            <Activity className="text-blue-400 animate-pulse" size={32} />
          </div>
          
          <div className="text-center">
            <h1 className="text-lg font-black text-white uppercase tracking-[0.25em] italic">
              Sistema <span className="text-blue-500">Droguería</span>
            </h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2.5 flex items-center justify-center gap-1.5">
              <Loader2 className="animate-spin text-blue-500" size={10} /> Sincronizando entorno seguro...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {warningActive && (
        <div className="bg-amber-500 text-white py-3 px-4 text-center font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300 z-[100] relative shrink-0">
          <AlertTriangle size={14} className="animate-bounce" />
          <span>
            {timeLeft && timeLeft !== '00:00' 
              ? `¡Atención! El sistema entrará en mantenimiento en ${timeLeft}. Por favor guarde su trabajo y finalice sus tareas.` 
              : '¡Atención! El sistema entrará en mantenimiento de forma inminente. Por favor guarde su trabajo inmediatamente.'}
          </span>
        </div>
      )}
      {token ? (
        <div className="h-screen flex flex-col overflow-hidden">
          <NavigationHeader 
            token={token} 
            userEmail={userEmail} 
            userName={currentUserName} 
            userFotoPerfil={userFotoPerfil}
            handleLogoutClick={() => setShowLogoutConfirm(true)} 
            getInitials={getInitials} 
            openPerfil={(tab) => {
              setPerfilTab(tab);
              setIsPerfilOpen(true);
            }}
            handleSafeClick={handleSafeClick}
          />

          <main className="flex-1 min-h-0 overflow-hidden">
            <Routes>
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/" element={<Comparativas />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/seguimiento" element={<Seguimiento setIsDirty={setIsImportadorDirty} />} />
              <Route path="/ia" element={<AsistenteIA />} />
              <Route path="/importar" element={sessionStorage.getItem('userPuedeImportar') === '1' || sessionStorage.getItem('userPuedeImportar') === 'true' ? <Importador setIsDirty={setIsImportadorDirty} /> : <AccesoDenegado />} />
              <Route path="/admin" element={sessionStorage.getItem('userRol') === 'admin' ? <AdminUsuarios /> : <AccesoDenegado />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/cotizador" element={<Cotizador />} />
              <Route path="/contactos" element={<Contactos setIsDirty={setIsImportadorDirty} />} />
              <Route path="/anmat" element={<AnmatPM />} />
              <Route path="/mantenimiento" element={<Mantenimiento />} />
              <Route path="/error-conexion" element={<ErrorConexion />} />
              <Route path="*" element={<PaginaNoEncontrada />} />
            </Routes>
          </main>
        </div>
      ) : (
        <main className="min-h-screen">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/mantenimiento" element={<Mantenimiento />} />
            <Route path="/error-conexion" element={<ErrorConexion />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </main>
      )}

      {/* MODAL DE CONFIRMACIÓN DE LOGOUT PERSONALIZADO */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in duration-300 text-center">
            <div className="bg-rose-50 text-rose-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 border border-rose-100">
              <LogOut size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase italic mb-2">Cerrar Sesión</h3>
            <p className="text-slate-500 text-sm font-semibold mb-6">
              ¿Estás seguro de que deseas salir del sistema?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={confirmLogout}
                className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-md flex-1"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREMIUM DE CONFIRMACIÓN DE DESCARTAR CAMBIOS */}
      {showUnsavedConfirm && (
        <div className="fixed inset-0 bg-slate-905/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 p-8 shadow-2xl animate-in zoom-in duration-300 text-center">
            <div className="bg-amber-50 text-amber-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 border border-amber-100">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase italic mb-2">¿Descartar Cambios?</h3>
            <p className="text-slate-500 text-sm font-semibold mb-6">
              Tenés datos cargados en el Importador que no han sido guardados. Si salís de esta pestaña, perderás todo el progreso.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setShowUnsavedConfirm(false);
                  setPendingTransition(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition flex-1"
              >
                Volver
              </button>
              <button
                onClick={() => {
                  setIsImportadorDirty(false);
                  setShowUnsavedConfirm(false);
                  if (typeof pendingTransition === 'string') {
                    navigate(pendingTransition);
                  } else if (typeof pendingTransition === 'function') {
                    pendingTransition();
                  }
                  setPendingTransition(null);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-md flex-1"
              >
                Descartar y Salir
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE PERFIL Y AJUSTES */}
      <PerfilModal 
        isOpen={isPerfilOpen} 
        onClose={() => setIsPerfilOpen(false)} 
        onUserUpdated={(newName) => setCurrentUserName(newName)}
        userFotoPerfil={userFotoPerfil}
        initialTab={perfilTab}
        key={perfilTab} 
      />

      {/* MODAL DE PERMISOS ACTUALIZADOS */}
      {showPermModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[150] animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            
            <div className="bg-blue-50 text-[#0059a3] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 border border-blue-100">
              <ShieldAlert size={28} className="animate-pulse" />
            </div>
            
            <h3 className="text-xl font-black text-slate-800 uppercase italic mb-3 tracking-tight">Permisos Actualizados</h3>
            <p className="text-slate-500 text-sm font-semibold mb-6 leading-relaxed">
              El administrador del sistema ha modificado tus roles o accesos corporativos. Es necesario recargar la página para activar las nuevas funciones.
            </p>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition shadow-lg shadow-blue-200 hover:shadow-blue-300 flex items-center justify-center gap-2"
            >
              <span>Actualizar Pantalla</span>
            </button>
          </div>
        </div>
      )}

      {/* INTERACTIVE GUIDED TOUR */}
      {token && <GuidedTour />}

    </>
  );
}

export default App;