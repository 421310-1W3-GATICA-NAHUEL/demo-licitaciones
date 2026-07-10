import { Settings, ShieldAlert } from 'lucide-react';

const Mantenimiento = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08),transparent)] pointer-events-none"></div>
      
      <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-10 md:p-16 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-gray-800/80 max-w-xl w-full text-center animate-in zoom-in-95 duration-350">
        
        {/* Animated Icons Container */}
        <div className="relative w-24 h-24 mx-auto mb-8 flex items-center justify-center">
          <div className="absolute inset-0 bg-blue-100 dark:bg-blue-950/40 rounded-full animate-ping opacity-75"></div>
          <div className="relative w-20 h-20 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center shadow-lg text-white">
            <Settings size={38} className="animate-spin duration-5000" style={{ animationDuration: '8s' }} />
          </div>
        </div>

        {/* Text Details */}
        <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight mb-4">
          Servicio en <span className="text-blue-600 dark:text-blue-400">Mantenimiento</span>
        </h1>
        
        <p className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-widest leading-relaxed mb-6">
          Estamos actualizando el sistema para brindarte una mejor experiencia sanitaria.
        </p>

        <div className="h-[1px] w-full bg-slate-100 dark:bg-gray-800 my-6"></div>

        <p className="text-xs text-slate-400 dark:text-gray-500 font-bold uppercase tracking-wider">
          Volveremos a estar disponibles en unos minutos. Gracias por tu paciencia.
        </p>

        {/* Bottom Tag */}
        <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-wider border border-blue-100/50 dark:border-blue-900/20">
          <ShieldAlert size={12} />
          <span>Sistema de Droguería</span>
        </div>

      </div>
    </div>
  );
};

export default Mantenimiento;
