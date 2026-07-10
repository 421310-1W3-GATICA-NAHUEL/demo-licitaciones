import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/api';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { 
  Activity, Calendar, Filter, TrendingUp, Target, Percent, 
  Award, Tag, Hospital, MapPin, Building2 
} from 'lucide-react';

// Importar el mapa vectorial SVG limpio de Argentina
import mapaArgentinaSvg from '../assets/mapa_argentina.svg';

// =========================================================================
// CONFIGURACIÓN DE COORDENADAS PORCENTUALES Y ZOOM DEL MAPA
// Puedes ajustar los valores de 'x' (0 a 100% de izquierda a derecha)
// e 'y' (0 a 100% de arriba a abajo) para ubicar los puntos con precisión.
// El valor 'zoom' define la escala (s) y translación al filtrar por esa provincia.
// =========================================================================
const PROVINCIA_MAP = {
  'Córdoba': { 
    nombre: 'Córdoba', 
    x: 49.28, 
    y: 26.80, 
    s: 2.2, 
    zoom: 'scale(2.2) translate(0.72%, 13.20%)' 
  },
  'Buenos Aires': { 
    nombre: 'Buenos Aires', 
    x: 62.00, 
    y: 42.00, 
    s: 2.0, 
    zoom: 'scale(2) translate(-12.00%, 8.00%)' 
  },
  'Santa Fe': { 
    nombre: 'Santa Fe', 
    x: 63.76, 
    y: 24.09, 
    s: 2.2, 
    zoom: 'scale(2.2) translate(-13.76%, 15.91%)' 
  },
  'Mendoza': { 
    nombre: 'Mendoza', 
    x: 25.28, 
    y: 33.76, 
    s: 2.5, 
    zoom: 'scale(2.5) translate(24.72%, 16.24%)' 
  },
  'Tucumán': { 
    nombre: 'Tucumán', 
    x: 41.32, 
    y: 13.20, 
    s: 2.8, 
    zoom: 'scale(2.8) translate(8.68%, 36.80%)' 
  },
  'Catamarca': { 
    nombre: 'Catamarca', 
    x: 32.96, 
    y: 14.76, 
    s: 3.0, 
    zoom: 'scale(3) translate(17.04%, 35.24%)' 
  },
  'La Pampa': { 
    nombre: 'La Pampa', 
    x: 38.82, 
    y: 40.48, 
    s: 2.2, 
    zoom: 'scale(2.2) translate(11.18%, 9.52%)' 
  },
  'Entre Ríos': { 
    nombre: 'Entre Ríos', 
    x: 71.66, 
    y: 26.43, 
    s: 2.5, 
    zoom: 'scale(2.5) translate(-21.66%, 13.57%)' 
  },
  'San Juan': { 
    nombre: 'San Juan', 
    x: 24.68, 
    y: 21.82, 
    s: 2.5, 
    zoom: 'scale(2.5) translate(25.32%, 28.18%)' 
  },
  'Salta': { 
    nombre: 'Salta', 
    x: 40.73, 
    y: 5.99, 
    s: 3.0, 
    zoom: 'scale(3) translate(9.27%, 44.01%)' 
  },
  'Neuquén': {
    nombre: 'Neuquén',
    x: 18.06,
    y: 44.70,
    s: 2.2,
    zoom: 'scale(2.2) translate(31.94%, 5.30%)'
  },
  'Río Negro': {
    nombre: 'Río Negro',
    x: 31.18,
    y: 48.13,
    s: 2.0,
    zoom: 'scale(2) translate(18.82%, 1.87%)'
  },
  'Chaco': {
    nombre: 'Chaco',
    x: 63.68,
    y: 10.68,
    s: 2.5,
    zoom: 'scale(2.5) translate(-13.68%, 39.32%)'
  },
  'Corrientes': {
    nombre: 'Corrientes',
    x: 79.85,
    y: 18.23,
    s: 2.5,
    zoom: 'scale(2.5) translate(-29.85%, 31.77%)'
  }
};

const Dashboard = () => {
  const [resumen, setResumen] = useState([]);
  const [mensual, setMensual] = useState([]);
  const [competidores, setCompetidores] = useState([]);
  const [productosPerdidos, setProductosPerdidos] = useState([]);
  const [productosGanados, setProductosGanados] = useState([]);
  const [gap, setGap] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hospitales, setHospitales] = useState([]);
  
  // Estados para eficacia por hospital y provincias (Mapa de Calor)
  const [eficacia, setEficacia] = useState([]); 
  const [provinciasData, setProvinciasData] = useState([]);
  const [hoveredProvincia, setHoveredProvincia] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  const [selectedCompetitor, setSelectedCompetitor] = useState(null);
  const [selectedCompetitorDetails, setSelectedCompetitorDetails] = useState(null);
  const [loadingCompetitorDetails, setLoadingCompetitorDetails] = useState(false);

  const [filtros, setFiltros] = useState({
    fechaDesde: '',
    fechaHasta: '',
    provincia: 'Todas',
    hospital: 'Todos'
  });

  // Fetch detail data for selected competitor
  useEffect(() => {
    if (!selectedCompetitor) {
      setSelectedCompetitorDetails(null);
      return;
    }
    const fetchCompetitorDetails = async () => {
      setLoadingCompetitorDetails(true);
      try {
        const params = new URLSearchParams();
        params.append('competidor', selectedCompetitor.nombre);
        if (filtros.provincia !== 'Todas') params.append('provincia', filtros.provincia);
        if (filtros.hospital !== 'Todos') params.append('hospital', filtros.hospital);
        if (filtros.fechaDesde.trim() !== '') params.append('fechaDesde', filtros.fechaDesde);
        if (filtros.fechaHasta.trim() !== '') params.append('fechaHasta', filtros.fechaHasta);

        const res = await api.get(`/stats/competidor-detalle?${params.toString()}`);
        setSelectedCompetitorDetails(res.data);
      } catch (err) {
        console.error("Error al obtener detalle de competidor:", err);
      } finally {
        setLoadingCompetitorDetails(false);
      }
    };
    fetchCompetitorDetails();
  }, [selectedCompetitor, filtros]);

  // Fetch detail data for selected critical product
  useEffect(() => {
    if (!selectedProduct) {
      setSelectedProductDetails(null);
      return;
    }
    const fetchProductDetails = async () => {
      setLoadingDetails(true);
      try {
        const params = new URLSearchParams();
        params.append('producto', selectedProduct.producto);
        if (selectedProduct.tipo) {
          params.append('tipo', selectedProduct.tipo);
        }
        if (filtros.provincia !== 'Todas') params.append('provincia', filtros.provincia);
        if (filtros.hospital !== 'Todos') params.append('hospital', filtros.hospital);
        if (filtros.fechaDesde.trim() !== '') params.append('fechaDesde', filtros.fechaDesde);
        if (filtros.fechaHasta.trim() !== '') params.append('fechaHasta', filtros.fechaHasta);

        const res = await api.get(`/stats/producto-detalle?${params.toString()}`);
        setSelectedProductDetails(res.data);
      } catch (err) {
        console.error("Error al obtener detalle de producto:", err);
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchProductDetails();
  }, [selectedProduct, filtros]);

  const COLORS = ['#e30613', '#8db92e'];
  const AZUL_DPC = '#0059a3';

  

  // =========================
  // CARGAR DATOS
  // =========================

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.provincia !== 'Todas') params.append('provincia', filtros.provincia);
      if (filtros.hospital !== 'Todos') params.append('hospital', filtros.hospital);
      if (filtros.fechaDesde.trim() !== '') params.append('fechaDesde', filtros.fechaDesde);
      if (filtros.fechaHasta.trim() !== '') params.append('fechaHasta', filtros.fechaHasta);

      const queryString = params.toString();
      const [resRes, resMen, resComp, resProd, resProdGanados, resGap, resEficacia, resProvincias] = await Promise.all([
        api.get(`/stats/resumen?${queryString}`),
        api.get(`/stats/mensual?${queryString}`),
        api.get(`/stats/competidores?${queryString}`),
        api.get(`/stats/productos-perdidos?${queryString}`),
        api.get(`/stats/productos-ganados?${queryString}`),
        api.get(`/stats/price-gap?${queryString}`),
        api.get(`/stats/eficacia-hospital?${queryString}`),
        api.get(`/stats/provincias?${queryString}`)
      ]);

      setResumen(resRes.data || []);
      setMensual(resMen.data || []);
      setCompetidores(resComp.data || []);
      setProductosPerdidos(resProd.data || []);
      setProductosGanados(resProdGanados.data || []);
      setGap(resGap.data.gap_promedio || 0);
      setEficacia(resEficacia.data || []);
      
      const pData = resProvincias.data || [];
      setProvinciasData(pData);
      
      // Inicializar provincia seleccionada para el panel del mapa
      if (pData.length > 0) {
        setHoveredProvincia(pData[0]);
      } else {
        setHoveredProvincia(null);
      }
    } catch (err) {
      console.error("Error cargando BI:", err);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  // Cargar lista de hospitales según provincia seleccionada
  useEffect(() => {
    const fetchHospitales = async () => {
      try {
        const res = await api.get(
          `/stats/hospitales?provincia=${filtros.provincia}`
        );
        setHospitales(res.data);
      } catch (err) {
        console.error('Error hospitales:', err);
      }
    };
    fetchHospitales();
  }, [filtros.provincia]);

  const totalGanados = resumen.find(r => r.label?.toUpperCase() === 'GANADOS')?.value || 0;
  const totalPerdidos = resumen.find(r => r.label?.toUpperCase() === 'PERDIDOS')?.value || 0;
  const totalProcesos = totalGanados + totalPerdidos;
  const winRate = totalProcesos > 0 ? ((totalGanados / totalProcesos) * 100).toFixed(1) : 0;

  const datosTorta = [
    { name: 'Perdidos', value: totalPerdidos },
    { name: 'Ganados', value: totalGanados }
  ];

  const traducirMes = (mes) => {
    const meses = {
      January: 'ENE',
      February: 'FEB',
      March: 'MAR',
      April: 'ABR',
      May: 'MAY',
      June: 'JUN',
      July: 'JUL',
      August: 'AGO',
      September: 'SEP',
      October: 'OCT',
      November: 'NOV',
      December: 'DIC'
    };
    return meses[mes] || mes;
  };

  // =========================
  // TOOLTIPS PERSONALIZADOS
  // =========================

  const MonthlyTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-100 text-left">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-3 mt-1.5 text-xs font-bold">
              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: entry.name.includes('Logrados') ? '#8db92e' : '#e30613' }}></div>
              <span className="text-slate-500 uppercase">{entry.name}:</span>
              <span className="text-slate-800 ml-auto font-black">{entry.value} items</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const HospitalTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const row = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-100 text-left">
          <p className="text-xs font-black text-slate-800 uppercase mb-2 truncate max-w-[220px]">{row.hospital}</p>
          <div className="space-y-1 text-xs font-bold text-slate-500">
            <p className="flex justify-between gap-6"><span>Logrados:</span> <strong className="text-slate-800">{row.ganados}</strong></p>
            <p className="flex justify-between gap-6"><span>Total Cotizado:</span> <strong className="text-slate-800">{row.total}</strong></p>
            <p className="flex justify-between gap-6 border-t border-slate-100 pt-1 mt-1 font-black" style={{ color: primaryColor }}>
              <span>Efectividad:</span> <span>{row.porcentaje_exito}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const DefaultTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-100 text-left">
          {label && <p className="text-xs font-black text-slate-800 mb-1.5 truncate max-w-[200px]">{label}</p>}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="uppercase">{payload[0].name}:</span>
            <strong className="font-black" style={{ color: payload[0].color || primaryColor }}>{payload[0].value}</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  // Escalar los círculos del mapa según volumen
  const maxTotal = provinciasData.length > 0 ? Math.max(...provinciasData.map(p => p.total)) : 1;

  // Transformación del mapa (zoom/panning) al aplicar el filtro de provincia
  const getMapTransform = () => {
    const selectedFilterProv = filtros.provincia;
    if (selectedFilterProv !== 'Todas' && PROVINCIA_MAP[selectedFilterProv]) {
      return PROVINCIA_MAP[selectedFilterProv].zoom;
    }
    return 'scale(1) translate(0%, 0%)';
  };

  // Obtener el factor de escala actual para contrarrestar el tamaño del hotspot
  const activeProv = filtros.provincia;
  const currentScale = (activeProv !== 'Todas' && PROVINCIA_MAP[activeProv]) ? PROVINCIA_MAP[activeProv].s : 1;

  const primaryColor = '#0059a3';

  // Pantalla de carga premium
  if (loading && resumen.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center font-sans">
        <div className="relative flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4" style={{ borderColor: `${primaryColor} transparent ${primaryColor} transparent` }}></div>
          <div className="absolute h-8 w-8 rounded-full bg-blue-100 animate-ping"></div>
        </div>
        <p className="mt-6 text-sm font-black text-slate-500 uppercase tracking-[0.25em] animate-pulse">
          Cargando Business Intelligence...
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-10 bg-[#f8fafc] font-sans page-transition custom-scrollbar">
      
      {/* CABECERA ESTRATÉGICA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic flex items-center gap-3">
            <div className="p-2 rounded-xl shadow-lg" style={{ backgroundColor: primaryColor, shadowColor: primaryColor }}>
                <TrendingUp className="text-white" size={28} />
            </div>
            Business <span style={{ color: primaryColor }}>Intelligence</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 italic">
            ESTADISTICAS
          </p>
        </div>
        
        <div className="bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`}></span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">
                {loading ? 'Consultando SQL Server...' : 'Sincronización Exitosa'}
            </span>
        </div>
      </div>

      {/* FILTROS CLEAN */}
      <div className="bg-white p-3 rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-100 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
        
        {/* Provincia */}
        <div className="flex items-center gap-3 pl-4 border-r border-slate-100">
          <Filter style={{ color: primaryColor }} className="shrink-0" size={18} />
          <select 
            value={filtros.provincia}
            onChange={(e) => setFiltros({...filtros, provincia: e.target.value, hospital: 'Todos'})}
            
            className="bg-transparent border-none py-2 text-sm font-black text-slate-700 outline-none uppercase cursor-pointer w-full tracking-tight disabled:opacity-60"
          >
            <option value="Todas">Jurisdicción (Todas)</option>
                <option value="Córdoba">Córdoba</option>
                <option value="Santa Fe">Santa Fe</option>
                <option value="Buenos Aires">Buenos Aires</option>
                <option value="Mendoza">Mendoza</option>
                <option value="Tucumán">Tucumán</option>
                <option value="Catamarca">Catamarca</option>
                <option value="La Pampa">La Pampa</option>
                <option value="Entre Ríos">Entre Ríos</option>
                <option value="San Juan">San Juan</option>
                <option value="Salta">Salta</option>
                <option value="Neuquén">Neuquén</option>
                <option value="Río Negro">Río Negro</option>
                <option value="Chaco">Chaco</option>
                <option value="Corrientes">Corrientes</option>
          </select>
        </div>

        {/* Hospital */}
        <div className="flex items-center gap-3 pl-2 lg:col-span-1">
          <Hospital className="text-slate-400 shrink-0" size={16} />
          <select 
            value={filtros.hospital}
            onChange={(e) => setFiltros({ ...filtros, hospital: e.target.value })}
            className="bg-transparent border-none py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer w-full uppercase"
          > 
            <option value="Todos">TODOS LOS HOSPITALES</option>
            {hospitales.map((h, i) => (
              <option key={i} value={h.nombre_hospital}>
                {h.nombre_hospital}
              </option>
            ))}
          </select>
        </div>

        {/* Fechas */}
        <div className="flex items-center gap-2 px-3 border-l border-slate-100 lg:col-span-2">
          <div className="flex items-center gap-2 flex-1">
            <Calendar className="text-slate-300" size={14} />
            <input 
              type="date" 
              value={filtros.fechaDesde} 
              onChange={(e) => setFiltros({...filtros, fechaDesde: e.target.value})} 
              className="bg-slate-50 border-none rounded-xl p-2 text-[10px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-100 w-full" 
            />
          </div>
          <span className="text-slate-300 font-bold">/</span>
          <div className="flex items-center gap-2 flex-1">
            <input 
              type="date" 
              value={filtros.fechaHasta} 
              onChange={(e) => setFiltros({...filtros, fechaHasta: e.target.value})} 
              className="bg-slate-50 border-none rounded-xl p-2 text-[10px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-100 w-full" 
            />
          </div>
        </div>

        {/* Botón Recalcular */}
        <button 
          onClick={fetchData} 
          className="active:scale-95 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg"
          style={{ backgroundColor: primaryColor }}
        >
          RECALCULAR
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard title="Items Auditados" value={totalProcesos} icon={<Activity />} color="text-slate-700 bg-slate-50" gradient="bg-slate-500" />
        <KPICard title="Eficacia (Win Rate)" value={`${winRate}%`} icon={<Target />} color="text-[#8db92e] bg-green-50/50" gradient="bg-green-500" customStyle={{ color: '#8db92e' }} />
        <KPICard title="Desvío (Price Gap)" value={`+${parseFloat(gap).toFixed(1)}%`} icon={<Percent />} color="text-amber-500 bg-amber-50" gradient="bg-amber-500" customStyle={{ color: '#f59e0b' }} />
        <KPICard title="Items Ganados" value={totalGanados} icon={<Award />} color="text-blue-500 bg-blue-50" gradient="bg-blue-500" customStyle={{ color: primaryColor }} />
      </div>

      {/* PANEL DE GRÁFICOS ASIMÉTRICOS (DISEÑO ESPACIADO Y COLORES SÓLIDOS SIN DIFUMINADOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* GRÁFICO PRINCIPAL DE EVOLUCIÓN MENSUAL (ANCHO COMPLETO Y COLORES SÓLIDOS) */}
        <div className="lg:col-span-2">
          <ChartContainer title="Evolución Mensual de Ofertas" primaryColor={primaryColor}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={mensual}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mes" tickFormatter={traducirMes} axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '800', fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} content={<MonthlyTooltip />} />
                <Bar dataKey="ganados" fill="#8db92e" radius={[8, 8, 0, 0]} name="Logrados" barSize={20} />
                <Bar dataKey="perdidos" fill="#e30613" radius={[8, 8, 0, 0]} name="Perdidos" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* DONUT CHART DE BALANCE (CON LOGO/RATIO AL CENTRO) */}
        <ChartContainer title="Balance Logrados vs Perdidos" primaryColor={primaryColor}>
          <div className="relative flex justify-center items-center">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie 
                  data={datosTorta} 
                  cx="50%" 
                  cy="45%" 
                  innerRadius={78} 
                  outerRadius={98} 
                  paddingAngle={8} 
                  dataKey="value" 
                  stroke="none"
                >
                  {datosTorta.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{fontWeight: 'bold', fontSize: '11px'}} />
              </PieChart>
            </ResponsiveContainer>

            {/* WinRate exacto en el centro del Donut */}
            <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{winRate}%</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Éxito</span>
            </div>
          </div>
        </ChartContainer>

        {/* MAPA DE CALOR INTERACTIVO CON IMAGEN VECTORIAL SVG TRANSPARENTE Y ZOOM DE ENFOQUE PROPORCIONAL */}
        <ChartContainer title="Mapa de Calor Licitatorio (Provincia)" primaryColor={primaryColor}>
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            
            {/* Contenedor del Mapa con overflow-hidden para soportar el Zoom de Enfoque */}
            <div className="relative shrink-0 flex justify-center items-center bg-slate-50/50 p-4 rounded-3xl border border-slate-100/50 shadow-inner overflow-hidden w-[210px] h-[460px]">
              
              {/* Contenedor interno que se escala y desplaza de forma fluida, con el aspect ratio exacto del SVG (800x1752) */}
              <div 
                className="relative w-[180px] aspect-[800/1752] transition-all duration-700 ease-out"
                style={{
                  transform: getMapTransform(),
                  transformOrigin: 'center center'
                }}
              >
                {/* Imagen del mapa vectorial SVG transparente */}
                <img 
                  src={mapaArgentinaSvg} 
                  alt="Mapa de Argentina" 
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none opacity-85" 
                />
                
                {/* Capa de hotspots posicionada al 100% sobre la imagen */}
                <div className="absolute inset-0">
                  {provinciasData.map((item, idx) => {
                    const conf = PROVINCIA_MAP[item.provincia];
                    if (!conf) return null;
                    
                    // Calcular tamaño proporcional al volumen (más pequeños para no tapar provincias)
                    const r = 3.5 + (item.total / maxTotal) * 4.5;
                    
                    // Colores del heatmap por efectividad
                    const eff = parseFloat(item.porcentaje_exito);
                    let heatColor = 'bg-amber-500';
                    let glowColor = 'bg-amber-500/30';
                    if (eff >= 50) {
                      heatColor = 'bg-emerald-500';
                      glowColor = 'bg-emerald-500/30';
                    } else if (eff < 30) {
                      heatColor = 'bg-rose-500';
                      glowColor = 'bg-rose-500/30';
                    }
                    
                    const isSelected = hoveredProvincia?.provincia === item.provincia;
                    const isFiltered = filtros.provincia === item.provincia;

                    return (
                      <div 
                        key={idx}
                        onClick={() => {
                          setFiltros(prev => ({
                            ...prev,
                            provincia: item.provincia,
                            hospital: 'Todos'
                          }));
                        }}
                        className="absolute cursor-pointer transition-all duration-700 ease-out z-10"
                        style={{ 
                          left: `${conf.x}%`, 
                          top: `${conf.y}%`,
                          // Aplicamos la escala inversa para mantener el hotspot del mismo tamaño visual al hacer zoom!
                          transform: `translate(-50%, -50%) scale(${1 / currentScale})`
                        }}
                        onMouseEnter={() => setHoveredProvincia(item)}
                      >
                        {/* Anillo de onda expansiva animada */}
                        <div className={`absolute -inset-2 rounded-full animate-ping ${isSelected ? 'opacity-40' : 'opacity-10'} ${heatColor}`}></div>
                        
                        {/* Burbuja táctil de interacción */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center -m-4 transition-all duration-300 hover:scale-125 ${isSelected || isFiltered ? glowColor : ''}`}>
                          {/* Punto central del mapa de calor */}
                          <div 
                            className={`rounded-full border-2 border-white shadow-md ${heatColor} transition-all ${
                              isSelected || isFiltered ? 'ring-4 ring-offset-0 ring-white/50 animate-pulse' : ''
                            }`}
                            style={{ 
                              width: `${r * 2}px`, 
                              height: `${r * 2}px` 
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Leyenda del Mapa de Calor */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-center items-center space-x-6 bg-white/90 backdrop-blur-sm py-2 px-4 rounded-full shadow-sm text-[10px] font-bold text-slate-500">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2 shadow-sm"></div>
                  <span>Éxito &gt; 50%</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-amber-500 mr-2 shadow-sm"></div>
                  <span>Regular (30% - 50%)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-rose-500 mr-2 shadow-sm"></div>
                  <span>Bajo &lt; 30%</span>
                </div>
              </div>
            </div>

            {/* Panel de información detallada de la provincia seleccionada */}
            <div className="flex-1 w-full bg-slate-50 rounded-[2rem] p-5 border border-slate-100 flex flex-col justify-between h-[340px]">
              {hoveredProvincia ? (
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 font-mono">Jurisdicción Seleccionada</span>
                    <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight mb-4 flex items-center gap-2">
                      <MapPin size={16} style={{ color: primaryColor }} />
                      {PROVINCIA_MAP[hoveredProvincia.provincia]?.nombre || hoveredProvincia.provincia}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white p-3 rounded-2xl border border-slate-100/80 shadow-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Cotizadas</span>
                        <span className="text-lg font-black text-slate-700">{hoveredProvincia.total}</span>
                      </div>
                      <div className="bg-white p-3 rounded-2xl border border-slate-100/80 shadow-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">Logradas</span>
                        <span className="text-lg font-black text-green-600">{hoveredProvincia.ganados}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-500 uppercase text-[10px]">Tasa de Éxito</span>
                        <span className="text-slate-800 font-black">{hoveredProvincia.porcentaje_exito}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${hoveredProvincia.porcentaje_exito}%`,
                            backgroundColor: parseFloat(hoveredProvincia.porcentaje_exito) >= 50 ? '#8db92e' : parseFloat(hoveredProvincia.porcentaje_exito) < 30 ? '#e30613' : '#f59e0b' 
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-[9.5px] text-slate-400 italic mt-auto pt-3 border-t border-slate-200/50 leading-normal">
                    Haz clic en una provincia para aplicar el filtro general, o usa el selector dropdown. El mapa hará zoom automático de enfoque.
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 text-xs font-bold p-8">
                  <MapPin size={24} className="text-slate-300 mb-2" />
                  Pasa el mouse sobre el mapa o selecciona una provincia en el filtro dropdown.
                </div>
              )}
            </div>

          </div>
        </ChartContainer>

        {/* GRÁFICO: EFICACIA POR HOSPITAL (COLOR SÓLIDO) */}
        <ChartContainer title="Eficacia por Hospital (Top 5 Vol.)" primaryColor={primaryColor}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart layout="vertical" data={eficacia.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, 100]} unit="%" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
              <YAxis dataKey="hospital" type="category" width={140} axisLine={false} tickLine={false} tick={{fontSize: 9, fontStyle: 'italic', fontWeight: 'bold', fill: '#64748b'}} />
              <Tooltip content={<HospitalTooltip />} />
              <Bar dataKey="porcentaje_exito" fill="#8db92e" radius={[0, 8, 8, 0]} name="Efectividad" barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* RANKING DE COMPETIDORES CLAVE */}
        <ChartContainer title="Competidores Clave (Ranking de Ventas Perdidas)" primaryColor={primaryColor}>
          <div className="space-y-4 max-h-[320px] overflow-y-auto custom-scrollbar pr-2">
            {competidores.map((comp, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedCompetitor(comp)}
                className="group bg-white p-5 rounded-[2rem] border border-slate-55/50 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer hover:border-slate-300"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400 group-hover:text-white transition-all shadow-inner group-hover:bg-[#0059a3]`}>
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm leading-none mb-1.5">{comp.nombre}</h3>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Tag size={10} className="text-slate-400" />
                        <span>Marca más vendida:</span>
                        <span className="text-slate-800 font-black">{comp.marca_frecuente || 'VARÍAN'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end justify-center">
                    <div className="text-xs font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full mb-1.5 uppercase tracking-wide">
                      {comp.victorias} renglones perdidos
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold">
                      Precio Prom. Ganador: <strong className="text-slate-800 font-black">${parseFloat(comp.precio_promedio || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartContainer>

        {/* PRODUCTOS CRÍTICOS (OPORTUNIDADES DE GANAR) */}
        <div className="lg:col-span-1">
          <ChartContainer title="Productos Críticos (Frecuencia de Pérdidas)" primaryColor={primaryColor}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart layout="vertical" data={productosPerdidos}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="producto" 
                  type="category" 
                  width={180} 
                  tick={{fontSize: 9, fontStyle: 'italic', fontWeight: 'bold', fill: '#64748b'}} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => val && val.length > 25 ? val.substring(0, 22) + '...' : val}
                />
                <Tooltip content={<DefaultTooltip />} />
                <Bar 
                  dataKey="veces_perdido" 
                  fill={primaryColor} 
                  radius={[0, 8, 8, 0]} 
                  name="Frecuencia" 
                  barSize={12} 
                  onClick={(data) => { if (data && data.payload) setSelectedProduct(data.payload); }}
                  className="cursor-pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* TOP PRODUCTOS GANADOS */}
        <div className="lg:col-span-1">
          <ChartContainer title="Top Productos Ganados (Nuestra Fortaleza)" primaryColor="#8db92e">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart layout="vertical" data={productosGanados}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="producto" 
                  type="category" 
                  width={180} 
                  tick={{fontSize: 9, fontStyle: 'italic', fontWeight: 'bold', fill: '#64748b'}} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => val && val.length > 25 ? val.substring(0, 22) + '...' : val}
                />
                <Tooltip content={<DefaultTooltip />} />
                <Bar 
                  dataKey="veces_ganado" 
                  fill="#8db92e" 
                  radius={[0, 8, 8, 0]} 
                  name="Victorias" 
                  barSize={12} 
                  onClick={(data) => { if (data && data.payload) setSelectedProduct({ ...data.payload, tipo: 'ganado' }); }}
                  className="cursor-pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

      </div>

      {/* MODAL DE DETALLE DE PRODUCTO */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 animate-in zoom-in duration-300">
            <h3 className="text-lg font-black text-slate-800 uppercase italic mb-4 flex items-center gap-2">
              <Tag style={{ color: selectedProduct.tipo === 'ganado' ? '#8db92e' : primaryColor }} />
              {selectedProduct.tipo === 'ganado' ? 'Detalle de Producto Ganador' : 'Detalle del Producto Crítico'}
            </h3>
            
            {/* Nombre Completo del Producto */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-5 relative group">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1 font-mono">Nombre Completo</span>
              <p className="text-slate-700 text-sm font-black leading-relaxed pr-20">{selectedProduct.producto}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedProduct.producto);
                  setCopiedText('nombre');
                  setTimeout(() => setCopiedText(''), 2000);
                }}
                className="absolute right-4 top-4 bg-white p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 transition flex items-center gap-1.5 shadow-sm"
                title="Copiar Nombre"
              >
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  {copiedText === 'nombre' ? '¡Copiado!' : 'Copiar'}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              </button>
            </div>

            {loadingDetails ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-slate-800 mb-3"></div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cargando métricas detalladas...</span>
              </div>
            ) : selectedProductDetails ? (
              <div className="space-y-4">
                {/* Métricas Principales */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedProductDetails.tipo === 'ganado' ? (
                    <div className="bg-green-50 border border-green-100 p-4 rounded-2xl">
                      <span className="text-[9px] font-black text-green-600 uppercase tracking-wider block mb-0.5">Total de Victorias</span>
                      <strong className="text-lg font-black text-green-700">{selectedProductDetails.total_veces} veces</strong>
                    </div>
                  ) : (
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl">
                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider block mb-0.5">Total de Pérdidas</span>
                      <strong className="text-lg font-black text-rose-700">{selectedProductDetails.total_veces} veces</strong>
                    </div>
                  )}
                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider block mb-0.5">
                      {selectedProductDetails.tipo === 'ganado' ? 'Diferencia Ganadora' : 'Desvío (Price Gap)'}
                    </span>
                    <strong className="text-lg font-black text-amber-700">
                      {selectedProductDetails.tipo === 'ganado' ? (
                        selectedProductDetails.precio_ganador_prom > 0
                          ? `-${(((selectedProductDetails.precio_ganador_prom - selectedProductDetails.nuestro_precio_prom) / selectedProductDetails.precio_ganador_prom) * 100).toFixed(1)}%`
                          : '0%'
                      ) : (
                        selectedProductDetails.precio_ganador_prom > 0 
                          ? `+${(((selectedProductDetails.nuestro_precio_prom - selectedProductDetails.precio_ganador_prom) / selectedProductDetails.precio_ganador_prom) * 100).toFixed(1)}%`
                          : '0%'
                      )}
                    </strong>
                  </div>
                </div>

                {/* Comparación de Precios */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-mono">Comparativa de Precios Promedio</span>
                  <div className="flex justify-between items-center text-xs font-bold border-b border-slate-200/50 pb-2">
                    <span className="text-slate-500">
                      {selectedProductDetails.tipo === 'ganado' ? 'Nuestro Precio Ganador:' : 'Nuestro Precio Cotizado:'}
                    </span>
                    <span className="text-slate-800 font-black">${parseFloat(selectedProductDetails.nuestro_precio_prom).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold pt-1">
                    <span className="text-slate-500">
                      {selectedProductDetails.tipo === 'ganado' ? 'Precio 2º Competidor:' : 'Precio Ganador Competidor:'}
                    </span>
                    <span className="text-slate-800 font-black">${parseFloat(selectedProductDetails.precio_ganador_prom).toFixed(2)}</span>
                  </div>
                </div>

                {/* Competidor y Hospital Principal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 font-mono">
                      {selectedProductDetails.tipo === 'ganado' ? 'Principal Competidor (2º Puesto)' : 'Principal Competidor'}
                    </span>
                    <p className="text-xs font-black text-slate-800 uppercase truncate" title={selectedProductDetails.competidor_principal}>
                      {selectedProductDetails.competidor_principal || 'Sin Datos'}
                    </p>
                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                      {selectedProductDetails.tipo === 'ganado'
                        ? `Quedó segundo en ${selectedProductDetails.competidor_veces} cotizaciones`
                        : `Ganó ${selectedProductDetails.competidor_veces} cotizaciones`
                      }
                    </span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 font-mono">
                      {selectedProductDetails.tipo === 'ganado' ? 'Hospital con más Victorias' : 'Hospital con más Pérdidas'}
                    </span>
                    <p className="text-xs font-black text-slate-800 uppercase truncate" title={selectedProductDetails.hospital_principal}>
                      {selectedProductDetails.hospital_principal || 'Sin Datos'}
                    </p>
                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                      {selectedProductDetails.tipo === 'ganado'
                        ? `Ganamos ${selectedProductDetails.hospital_veces} cotizaciones`
                        : `Perdimos ${selectedProductDetails.hospital_veces} cotizaciones`
                      }
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs font-bold text-slate-400">
                No se pudieron cargar los detalles adicionales.
              </div>
            )}

            <div className="flex gap-3 justify-end mt-6">
              <button
                disabled={!selectedProductDetails || loadingDetails}
                onClick={() => {
                  if (!selectedProductDetails) return;
                  const isGanado = selectedProductDetails.tipo === 'ganado';
                  const gapVal = isGanado
                    ? (selectedProductDetails.precio_ganador_prom > 0
                        ? `-${(((selectedProductDetails.precio_ganador_prom - selectedProductDetails.nuestro_precio_prom) / selectedProductDetails.precio_ganador_prom) * 100).toFixed(1)}%`
                        : '0%')
                    : (selectedProductDetails.precio_ganador_prom > 0
                        ? `+${(((selectedProductDetails.nuestro_precio_prom - selectedProductDetails.precio_ganador_prom) / selectedProductDetails.precio_ganador_prom) * 100).toFixed(1)}%`
                        : '0%');
                  const textToCopy = isGanado
                    ? `Resumen de Producto Destacado Ganador :\n• Producto: ${selectedProductDetails.producto}\n• Victorias Totales: ${selectedProductDetails.total_veces} veces\n• Ventaja de Precio: ${gapVal}\n• Nuestro Precio Ganador Promedio: $${parseFloat(selectedProductDetails.nuestro_precio_prom).toFixed(2)}\n• Precio Promedio del 2º Competidor: $${parseFloat(selectedProductDetails.precio_ganador_prom).toFixed(2)}\n• Principal Competidor (2º): ${selectedProductDetails.competidor_principal || 'N/A'} (Quedó segundo ${selectedProductDetails.competidor_veces} veces)\n• Hospital con más victorias: ${selectedProductDetails.hospital_principal || 'N/A'} (Ganamos ${selectedProductDetails.hospital_veces} veces)`
                    : `Resumen de Producto Crítico Perdido :\n• Producto: ${selectedProductDetails.producto}\n• Pérdidas Totales: ${selectedProductDetails.total_veces} veces\n• Desvío Promedio (Price Gap): ${gapVal}\n• Nuestro Precio Promedio Cotizado: $${parseFloat(selectedProductDetails.nuestro_precio_prom).toFixed(2)}\n• Precio Promedio Ganador: $${parseFloat(selectedProductDetails.precio_ganador_prom).toFixed(2)}\n• Principal Competidor: ${selectedProductDetails.competidor_principal || 'N/A'} (Ganó ${selectedProductDetails.competidor_veces} veces)\n• Hospital con más pérdidas: ${selectedProductDetails.hospital_principal || 'N/A'} (Perdimos ${selectedProductDetails.hospital_veces} veces)`;
                  
                  navigator.clipboard.writeText(textToCopy);
                  setCopiedText('resumen');
                  setTimeout(() => setCopiedText(''), 2000);
                }}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition ${copiedText === 'resumen' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} disabled:opacity-50`}
              >
                {copiedText === 'resumen' ? '¡Resumen Copiado!' : 'Copiar Resumen'}
              </button>
              <button
                onClick={() => setSelectedProduct(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLE DE COMPETIDOR CLAVE */}
      {selectedCompetitor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 animate-in zoom-in duration-300">
            <h3 className="text-lg font-black text-slate-800 uppercase italic mb-2 flex items-center gap-2">
              <Building2 style={{ color: primaryColor }} /> Análisis de Competencia
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
              Oferente: <span className="text-slate-800 font-black">{selectedCompetitor.nombre}</span>
            </p>

            {loadingCompetitorDetails ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-slate-800 mb-3"></div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Analizando comportamiento del competidor...</span>
              </div>
            ) : selectedCompetitorDetails && selectedCompetitorDetails.productos && selectedCompetitorDetails.productos.length > 0 ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 font-bold leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  A continuación se detallan los productos donde <strong className="text-slate-700">{selectedCompetitor.nombre}</strong> nos gana con mayor frecuencia, junto a la comparativa de precios promedio:
                </p>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {selectedCompetitorDetails.productos.map((prod, idx) => {
                    const diffGap = prod.precio_ganador_prom > 0
                      ? (((prod.nuestro_precio_prom - prod.precio_ganador_prom) / prod.precio_ganador_prom) * 100).toFixed(1)
                      : 0;
                    return (
                      <div key={idx} className="bg-slate-50/50 hover:bg-slate-50 p-4 rounded-2xl border border-slate-100 transition">
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <p className="text-xs font-black text-slate-800 leading-tight flex-1">{prod.producto}</p>
                          <span className="bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0">
                            {prod.veces_perdido} pérdidas
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-500 uppercase">
                          <div>
                            Nuestro Promedio: <strong className="text-slate-700 block">${parseFloat(prod.nuestro_precio_prom).toFixed(2)}</strong>
                          </div>
                          <div>
                            Su Promedio Ganador: <strong className="text-slate-700 block">${parseFloat(prod.precio_ganador_prom).toFixed(2)}</strong>
                          </div>
                          <div className="text-right">
                            Diferencia (Gap): <strong className="text-amber-600 block">+{diffGap}%</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-xs font-bold text-slate-400">
                No se registraron productos perdidos específicos frente a este oferente con los filtros actuales.
              </div>
            )}

            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedCompetitor(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition"
              >
                Cerrar Análisis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================
// TARJETA KPI (PREMIUM GLOW)
// =========================

const KPICard = ({ title, value, icon, color, gradient, customStyle }) => (
  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 flex items-center gap-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-slate-100 relative overflow-hidden group">
    
    {/* Glow decorativo de fondo */}
    <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-[0.04] blur-xl group-hover:scale-125 transition-transform duration-500 ${gradient}`}></div>
    
    <div className={`p-4 rounded-2xl shadow-inner ${color}`} style={customStyle ? { backgroundColor: `${customStyle.color}15`, color: customStyle.color } : {}}>
      {React.cloneElement(icon, { size: 28 })}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-3xl font-black tracking-tighter" style={customStyle ? customStyle : {color: '#475569'}}>{value}</p>
    </div>
  </div>
);

// =========================
// CONTENEDOR DE GRÁFICO
// =========================

const ChartContainer = ({ title, children, primaryColor }) => (
  <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-50">
    <h2 className="text-[11px] font-black text-slate-400 uppercase mb-6 tracking-[0.25em] flex items-center gap-3">
        <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: primaryColor || '#0059a3' }}></div> {title}
    </h2>
    {children}
  </div>
);

export default Dashboard;