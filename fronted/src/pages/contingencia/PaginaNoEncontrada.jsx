import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

const PaginaNoEncontrada = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.06),transparent)] pointer-events-none"></div>

      <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-10 md:p-16 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-gray-800/80 max-w-xl w-full text-center animate-in zoom-in-95 duration-350">
        
        {/* Animated Icons Container */}
        <div className="relative w-24 h-24 mx-auto mb-8 flex items-center justify-center">
          <div className="absolute inset-0 bg-blue-100 dark:bg-blue-950/40 rounded-full animate-pulse opacity-75"></div>
          <div className="relative w-20 h-20 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center shadow-lg text-white font-black text-2xl italic tracking-tighter">
            404
          </div>
        </div>

        {/* Text Details */}
        <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight mb-4">
          Página No <span className="text-blue-600 dark:text-blue-400">Encontrada</span>
        </h1>
        
        <p className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-widest leading-relaxed mb-6">
          La dirección que ingresaste no existe, ha sido movida o no tienes permisos suficientes para acceder a ella.
        </p>

        <div className="h-[1px] w-full bg-slate-100 dark:bg-gray-800 my-6"></div>

        {/* Action Button */}
        <div className="flex justify-center">
          <Link
            to="/"
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-gray-800 dark:hover:bg-gray-750 text-white font-black text-xs uppercase tracking-wider px-8 py-4 rounded-xl shadow-md transition duration-200"
          >
            <ArrowLeft size={14} />
            <span>Volver al Inicio</span>
          </Link>
        </div>

        {/* Bottom Alert */}
        <div className="mt-8 flex items-center gap-2 justify-center text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-500">
          <AlertTriangle size={12} />
          <span>Error 404: HTTP NOT FOUND</span>
        </div>

      </div>
    </div>
  );
};

export default PaginaNoEncontrada;
