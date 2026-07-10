import React, { useState } from 'react';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

const ErrorConexion = () => {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => {
      window.location.href = '/';
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.06),transparent)] pointer-events-none"></div>

      <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-10 md:p-16 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-gray-800/80 max-w-xl w-full text-center animate-in zoom-in-95 duration-350">
        
        {/* Animated Icons Container */}
        <div className="relative w-24 h-24 mx-auto mb-8 flex items-center justify-center">
          <div className="absolute inset-0 bg-red-100 dark:bg-red-950/40 rounded-full animate-ping opacity-75"></div>
          <div className="relative w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-lg text-white">
            <WifiOff size={38} className="animate-bounce" style={{ animationDuration: '2.5s' }} />
          </div>
        </div>

        {/* Text Details */}
        <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight mb-4">
          Servidor <span className="text-red-500">Desconectado</span>
        </h1>
        
        <p className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-widest leading-relaxed mb-6">
          No pudimos conectar con la base de datos o el servidor API. Por favor verifica tu conexión a internet o intenta nuevamente.
        </p>

        <div className="h-[1px] w-full bg-slate-100 dark:bg-gray-800 my-6"></div>

        {/* Action Button */}
        <div className="flex justify-center">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-gray-800 dark:hover:bg-gray-700 text-white font-black text-xs uppercase tracking-wider px-8 py-4 rounded-xl shadow-md transition duration-200 disabled:opacity-50"
          >
            <RefreshCw size={14} className={retrying ? 'animate-spin' : ''} />
            <span>{retrying ? 'Probando Enlace...' : 'Reintentar Conexión'}</span>
          </button>
        </div>

        {/* Bottom Alert */}
        <div className="mt-8 flex items-center gap-2 justify-center text-[10px] font-black uppercase tracking-wider text-red-500">
          <AlertCircle size={12} />
          <span>Error de enlace de red (SQL Server Offline)</span>
        </div>

      </div>
    </div>
  );
};

export default ErrorConexion;
