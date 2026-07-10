import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, HelpCircle, X, Check } from 'lucide-react';

const GuidedTour = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState({});

  const tourSteps = [
    {
      title: "¡Te damos la bienvenida! 🚀",
      description: "Este breve recorrido interactivo te mostrará las herramientas del Sistema Droguería diseñadas para optimizar tu gestión comercial.",
      targetId: null, // Centro de la pantalla (bienvenida)
    },
    {
      title: "1. Comparativas de Precios",
      description: "El módulo principal donde podés revisar, filtrar y analizar comparativas cargadas históricamente, evaluando quién ganó y a qué precios.",
      targetId: "tour-comparativas",
    },
    {
      title: "2. Estadísticas y Métricas",
      description: "Un potente panel analítico con gráficos interactivos para evaluar el volumen de negocio ganado, eficacia por hospital y comportamiento de competidores.",
      targetId: "tour-estadisticas",
    },
    {
      title: "3. Seguimiento de Licitaciones",
      description: "Mantené el control sobre tus ofertas vigentes. Actualizá estados ('Presentada', 'Adjudicada', 'Perdida') y asigná renglones a tus droguerías.",
      targetId: "tour-seguimiento",
    },
    {
      title: "4. Asistente IA Integrado",
      description: "Consultá a nuestra Inteligencia Artificial para comparar marcas, encontrar equivalentes genéricos o analizar pliegos complejos en segundos.",
      targetId: "tour-ia",
    },
    {
      title: "5. Herramientas",
      description: "Haciendo click aquí accedés a: Inventario (stock y costos), Cotizador Predictivo (precios históricos) y el módulo de PM ANMAT.",
      targetId: "tour-herramientas",
    },
    {
      title: "6. Directorio de Contactos",
      description: "Directorio compartido para comunicarse rápidamente con compras de cada hospital, ahora unificado y con filtro por provincia.",
      targetId: "tour-contactos",
    }
  ];

  // Comprobar si ya se completó el tour
  useEffect(() => {
    const completed = localStorage.getItem('drogueria_tour_completed');
    if (!completed) {
      // Pequeño delay para dejar cargar el sistema
      const timer = setTimeout(() => {
        setIsActive(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Calcular la posición del tooltip dinámicamente según el elemento objetivo
  useEffect(() => {
    if (!isActive) return;

    const step = tourSteps[currentStep];
    if (!step.targetId) {
      // Centrar el tooltip en la pantalla para la bienvenida
      setTooltipStyle({
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
      });
      // Remover highlight previo si existe
      document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight', 'ring-4', 'ring-blue-500', 'ring-offset-2', 'relative', 'z-50');
      });
      return;
    }

    const targetEl = document.getElementById(step.targetId);
    if (targetEl) {
      // Remover highlight previo
      document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight', 'ring-4', 'ring-blue-500', 'ring-offset-2', 'relative', 'z-50');
      });

      // Añadir highlight al elemento actual
      targetEl.classList.add('tour-highlight', 'ring-4', 'ring-blue-500', 'ring-offset-2', 'relative', 'z-50');

      const rect = targetEl.getBoundingClientRect();
      setTooltipStyle({
        position: 'absolute',
        top: `${rect.bottom + window.scrollY + 12}px`,
        left: `${Math.max(20, rect.left + window.scrollX - 120)}px`,
        width: '320px',
        zIndex: 9999,
      });

      // Asegurar que el elemento destacado se desplace a la vista
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // Fallback si el elemento no está en la página actual
      setTooltipStyle({
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '320px',
        zIndex: 9999,
      });
    }
  }, [currentStep, isActive]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('drogueria_tour_completed', 'true');
    setIsActive(false);
    // Limpiar clases de destacado
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight', 'ring-4', 'ring-blue-500', 'ring-offset-2', 'relative', 'z-50');
    });
  };

  useEffect(() => {
    const handleStartEvent = () => {
      setCurrentStep(0);
      setIsActive(true);
    };
    window.addEventListener('start-drogueria-tour', handleStartEvent);
    return () => window.removeEventListener('start-drogueria-tour', handleStartEvent);
  }, []);

  if (!isActive) {
    return null;
  }

  const stepInfo = tourSteps[currentStep];

  return (
    <>
      {/* Backdrop oscuro selectivo para destacar el elemento actual */}
      <div 
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-[9990] transition-all duration-300"
        onClick={handleComplete}
      />

      {/* Tarjeta del Tooltip del Tour */}
      <div 
        style={tooltipStyle}
        className="bg-white/95 backdrop-blur-md border border-slate-100 rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-300 flex flex-col justify-between"
      >
        {/* Header */}
        <div className="flex justify-between items-start gap-4 mb-3">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider italic flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-ping"></span>
            {stepInfo.title}
          </h4>
          <button 
            onClick={handleComplete}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Cuerpo */}
        <p className="text-xs font-semibold text-slate-550 leading-relaxed mb-5">
          {stepInfo.description}
        </p>

        {/* Footer */}
        <div className="flex justify-between items-center border-t border-slate-50 pt-4 mt-2">
          {/* Indicador de pasos */}
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Paso {currentStep + 1} de {tourSteps.length}
          </span>

          {/* Botones de navegación */}
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button 
                onClick={handlePrev}
                className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <button 
              onClick={handleNext}
              className="bg-gradient-to-r from-blue-600 to-[#0059a3] hover:from-blue-750 hover:to-blue-800 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>{currentStep === tourSteps.length - 1 ? 'Finalizar' : 'Siguiente'}</span>
              {currentStep < tourSteps.length - 1 ? <ChevronRight size={12} /> : <Check size={12} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default GuidedTour;
