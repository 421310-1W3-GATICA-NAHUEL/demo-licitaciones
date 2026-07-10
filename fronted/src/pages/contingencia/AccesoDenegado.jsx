import React from 'react';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const AccesoDenegado = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.06),transparent)] pointer-events-none"></div>
      
      <div className="relative bg-white/80 backdrop-blur-xl p-10 md:p-16 rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-xl w-full text-center animate-in zoom-in-95 duration-300">
        
        {/* Animated Icons Container */}
        <div className="relative w-24 h-24 mx-auto mb-8 flex items-center justify-center">
          <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-75"></div>
          <div className="relative w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-lg text-white">
            <Lock size={38} className="animate-pulse" />
          </div>
        </div>

        {/* Text Details */}
        <h1 className="text-3xl font-black text-slate-800 uppercase italic tracking-tight mb-4">
          Acceso <span className="text-red-500">Restringido</span>
        </h1>
        
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest leading-relaxed mb-6">
          No tenés las credenciales o permisos necesarios para ver esta sección.
        </p>

        <div className="h-[1px] w-full bg-slate-100 my-6"></div>

        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-8">
          Si creés que esto es un error, por favor contactá al administrador del sistema.
        </p>

        {/* Action Button */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-md hover:shadow-slate-200 cursor-pointer"
          >
            <ArrowLeft size={14} />
            Volver al Inicio
          </Link>
        </div>

        {/* Bottom Tag */}
        <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl text-[10px] font-black uppercase tracking-wider border border-red-100/50">
          <ShieldAlert size={12} />
          <span>Sistema de Droguería</span>
        </div>

      </div>
    </div>
  );
};

export default AccesoDenegado;
