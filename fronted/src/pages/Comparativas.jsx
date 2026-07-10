import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/api';

import {
  Search,
  Activity,
  User,
  Tag,
  TrendingDown,
  TrendingUp,
  MapPin,
  Calendar,
  Filter,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

const getGanadorLabel = (item) => { 
  if (item.ganamos) return "Ganado"; 
  if (item.mi_pu == null || Number(item.mi_pu) === 0) return "No Cotizado";
  return "Perdido"; 
};
const Comparativas = () => {
  const [searchParams] = useSearchParams();
  const querySearch = searchParams.get('search') || '';
  // =========================
  // STATES
  // =========================

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // =========================
  // FILTROS
  // =========================

  const [filtros, setFiltros] = useState({
    busqueda: querySearch,
    provincia: 'Todas',
    tipo: 'Todos',
    fechaDesde: '',
    fechaHasta: '',
    ganamos: 'todos',
    competidor: '',
    posicionCompetidor: 'todos'
  });

  // Sincronizar parámetro de búsqueda de la URL
  useEffect(() => {
    if (querySearch !== filtros.busqueda) {
      setFiltros(prev => ({ ...prev, busqueda: querySearch }));
      setSearchQuery(querySearch);
    }
  }, [querySearch]);

  const [competidores, setCompetidores] = useState([]);
  const [loadingCompetidores, setLoadingCompetidores] = useState(false);
  const [competidorInput, setCompetidorInput] = useState('');
  const [showCompetidoresDropdown, setShowCompetidoresDropdown] = useState(false);

  // Buscador con debounce en frontend
  const [searchQuery, setSearchQuery] = useState(filtros.busqueda);
  const [sugerencias, setSugerencias] = useState([]);
  const [showSugerencias, setShowSugerencias] = useState(false);

  // =========================
  // PAGINACIÓN
  // =========================

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1
  });

  // Debounce para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltros(prev => {
        if (prev.busqueda === searchQuery) return prev;
        return { ...prev, busqueda: searchQuery };
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Obtener sugerencias de productos para el buscador
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSugerencias([]);
      return;
    }

    const fetchSugerencias = async () => {
      try {
        const res = await api.get(`/comparativas/sugerencias-productos?q=${searchQuery}`);
        setSugerencias(res.data || []);
      } catch (err) {
        console.error('Error al obtener sugerencias:', err);
      }
    };

    const timer = setTimeout(fetchSugerencias, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sincronizar input local si los filtros se limpian externamente
  useEffect(() => {
    setSearchQuery(filtros.busqueda);
  }, [filtros.busqueda]);

  // Obtener listado de competidores único al montar
  useEffect(() => {
    const fetchCompetidores = async () => {
      setLoadingCompetidores(true);
      try {
        const res = await api.get('/comparativas/competidores');
        setCompetidores(res.data || []);
      } catch (err) {
        console.error('Error al obtener competidores:', err);
      } finally {
        setLoadingCompetidores(false);
      }
    };
    fetchCompetidores();
  }, []);

  // Restablecer la página a 1 cuando cambian los filtros
  useEffect(() => {
    setPagination(prev => {
      if (prev.page === 1) return prev;
      return { ...prev, page: 1 };
    });
  }, [
    filtros.provincia,
    filtros.tipo,
    filtros.fechaDesde,
    filtros.fechaHasta,
    filtros.ganamos,
    filtros.busqueda,
    filtros.competidor,
    filtros.posicionCompetidor
  ]);

  // =========================
  // FETCH DATOS
  // =========================

  const fetchDatos = useCallback(async (abortController) => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      // BUSCADOR
      if (filtros.busqueda) {
        params.append('q', filtros.busqueda);
      }

      // PROVINCIA
      if (filtros.provincia !== 'Todas') {
        params.append('provincia', filtros.provincia);
      }

      // TIPO
      if (filtros.tipo !== 'Todos') {
        params.append('tipo', filtros.tipo);
      }

      // FECHAS
      if (filtros.fechaDesde) {
        params.append('fechaDesde', filtros.fechaDesde);
      }

      if (filtros.fechaHasta) {
        params.append('fechaHasta', filtros.fechaHasta);
      }

      if (filtros.ganamos !== 'todos') {
        params.append('ganamos', filtros.ganamos);
      }

      // COMPETIDOR Y POSICION
      if (filtros.competidor) {
        params.append('competidor', filtros.competidor);
      }
      if (filtros.posicionCompetidor) {
        params.append('posicionCompetidor', filtros.posicionCompetidor);
      }

      // PAGINACIÓN
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);

      // Empresa activa del usuario para filtrar Ganamos
      const activeEmpresa = sessionStorage.getItem('userEmpresaAcceso') || 'DROGUERIA DEMO';
      params.append('empresa', activeEmpresa);

      const res = await api.get(`/comparativas?${params.toString()}`, {
        signal: abortController?.signal
      });

      setData(res.data.data || []);
      setPagination(prev => ({
        ...prev,
        total: res.data.total || 0,
        totalPages: res.data.totalPages || 1
      }));

    } catch (err) {
      if (err.name === 'CanceledError' || err.message === 'canceled') {
        // Silenciosamente ignorar peticiones abortadas
        return;
      }
      console.error('Error al obtener datos:', err);
    } finally {
      setLoading(false);
    }

  }, [filtros, pagination.page, pagination.limit]);

  // =========================
  // EFFECT DE CARGA
  // =========================

  useEffect(() => {
    const controller = new AbortController();
    fetchDatos(controller);

    return () => {
      controller.abort();
    };
  }, [fetchDatos]);

  // =========================
  // DIFERENCIA %
  // =========================

  const calcularDiferencia = (precioPropio, precioGanador) => {
    const p1 = parseFloat(precioPropio);
    const pG = parseFloat(precioGanador);

    if (isNaN(p1) || isNaN(pG) || p1 === 0 || pG === 0) return null;

    return ((p1 - pG) / pG) * 100;
  };

  // =========================
  // RENDER
  // =========================

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] overflow-hidden font-sans page-transition">

      {/* ========================= */}
      {/* HEADER CON FILTROS */}
      {/* ========================= */}
      <header className="bg-white border-b border-slate-100 p-6 shadow-sm z-30 shrink-0 relative">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">

          {/* TITULO */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight uppercase italic leading-none">
              <div className="bg-[#0059a3] p-2 rounded-lg shadow-lg shadow-blue-100">
                <Activity className="text-white" size={24} />
              </div>
              Comparativas
              <span className="text-[#0059a3]">de Mercado</span>
            </h1>

            <div className="text-[11px] font-black text-slate-400 uppercase bg-slate-50 px-4 py-2 rounded-full border border-slate-100 tracking-widest leading-none">
              {pagination.total} REGISTROS ENCONTRADOS
            </div>
          </div>

          {/* FILTROS RESPONSIVE REESTRUCTURADOS EN 2 FILAS DE 4 COLUMNAS PARA MAXIMIZAR ESPACIO Y LEGUIBILIDAD */}
          <div className={`relative z-30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm transition-all duration-300 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            
            {/* BUSCADOR (FILA 1 - COLUMNAS 1 Y 2) */}
            <div className="relative sm:col-span-2 lg:col-span-2">
              <input
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-100 text-xs font-bold text-slate-600 transition-all uppercase"
                placeholder="PRODUCTO, PROCESO O HOSPITAL..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSugerencias(true);
                }}
                onFocus={() => setShowSugerencias(true)}
                onBlur={() => setTimeout(() => setShowSugerencias(false), 200)}
              />
              <Search className="absolute left-3 top-3.5 text-slate-300" size={16} />

              {/* DROPDOWN DE SUGERENCIAS DE PRODUCTOS */}
              {showSugerencias && sugerencias.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto divide-y divide-slate-50">
                  {sugerencias.map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSearchQuery(sug);
                        setShowSugerencias(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-[11px] font-bold text-slate-600 uppercase transition-colors block cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* FECHAS (FILA 1 - COLUMNAS 3 Y 4) */}
            <div className="flex gap-2 sm:col-span-2 lg:col-span-2">
              <div className="relative flex-1">
                <input
                  type="date"
                  value={filtros.fechaDesde}
                  onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
                  className="w-full pl-8 pr-2 py-3 bg-slate-50 border-none rounded-xl outline-none text-[10px] font-black text-slate-500 uppercase"
                />
                <Calendar className="absolute left-2.5 top-3.5 text-slate-300" size={14} />
              </div>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={filtros.fechaHasta}
                  onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
                  className="w-full pr-4 py-3 bg-slate-50 border-none rounded-xl outline-none text-[10px] font-black text-slate-500 uppercase"
                />
              </div>
            </div>

            {/* PROVINCIA (FILA 2 - COLUMNA 1) */}
            <div className="relative col-span-1">
              <select
                value={filtros.provincia}
                onChange={(e) => setFiltros({ ...filtros, provincia: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-100 text-xs font-bold text-slate-600 uppercase appearance-none cursor-pointer"
              >
                <option value="Todas">TODAS LAS REGIONES</option>
                <option value="Córdoba">CÓRDOBA</option>
                <option value="Buenos Aires">BUENOS AIRES</option>
                <option value="Santa Fe">SANTA FE</option>
                <option value="Mendoza">MENDOZA</option>
                <option value="Tucumán">TUCUMÁN</option>
                <option value="Catamarca">CATAMARCA</option>
                <option value="La Pampa">LA PAMPA</option>
                <option value="Entre Ríos">ENTRE RÍOS</option>
                <option value="San Juan">SAN JUAN</option>
                <option value="Salta">SALTA</option>
                <option value="Neuquén">NEUQUÉN</option>
                <option value="Río Negro">RÍO NEGRO</option>
                <option value="Chaco">CHACO</option>
                <option value="Corrientes">CORRIENTES</option>
              </select>
              <MapPin className="absolute left-3 top-3.5 text-slate-300" size={16} />
            </div>

            {/* TIPO (FILA 2 - COLUMNA 2) */}
            <div className="relative col-span-1">
              <select
                value={filtros.tipo}
                onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-100 text-xs font-bold text-slate-600 uppercase appearance-none cursor-pointer"
              >
                <option value="Todos">TODOS LOS SEGMENTOS</option>
                <option value="PUBLICO">PÚBLICO</option>
                <option value="PRIVADO">PRIVADO</option>
                <option value="MUNICIPALIDAD">MUNICIPALIDAD</option>
              </select>
              <Filter className="absolute left-3 top-3.5 text-slate-300" size={16} />
            </div>

            {/* ESTADO (FILA 2 - COLUMNA 3) */}
            <div className="relative col-span-1">
              <select
                value={filtros.ganamos}
                onChange={(e) => setFiltros({ ...filtros, ganamos: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-100 text-xs font-bold text-slate-600 uppercase appearance-none cursor-pointer"
              >
                <option value="todos">TODOS LOS ESTADOS</option>
                <option value="ganados">GANADOS</option>
                <option value="perdidos">PERDIDOS</option>
                <option value="nocotizados">NO COTIZADOS</option>
              </select>
              <Activity className="absolute left-3 top-3.5 text-slate-300" size={16} />
            </div>

            {/* PUESTO COMPETIDOR (FILA 2 - COLUMNA 4) */}
            <div className="relative col-span-1">
              <select
                value={filtros.posicionCompetidor}
                onChange={(e) => setFiltros({ ...filtros, posicionCompetidor: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-100 text-xs font-bold text-slate-600 uppercase appearance-none cursor-pointer"
              >
                <option value="todos">CUALQUIER PUESTO</option>
                <option value="1">1º PUESTO (GANADOR)</option>
                <option value="2">2º PUESTO</option>
              </select>
              <Tag className="absolute left-3 top-3.5 text-slate-300" size={16} />
            </div>

            {/* SELECCIONAR COMPETIDOR (FILA 3 - COLUMNAS 1, 2 Y 3) */}
            <div className="relative col-span-1 sm:col-span-2 lg:col-span-3">
              <input
                type="text"
                placeholder={loadingCompetidores ? 'CARGANDO COMPETIDORES...' : 'BUSCAR COMPETIDOR...'}
                value={competidorInput}
                onChange={(e) => {
                  setCompetidorInput(e.target.value);
                  setShowCompetidoresDropdown(true);
                  if (e.target.value === '') {
                    setFiltros(prev => ({ ...prev, competidor: '' }));
                  }
                }}
                onFocus={() => setShowCompetidoresDropdown(true)}
                disabled={loadingCompetidores}
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-100 text-xs font-bold text-slate-600 uppercase placeholder-slate-400"
              />
              <User className="absolute left-3 top-3.5 text-slate-300" size={16} />
              
              {competidorInput && (
                <button
                  type="button"
                  onClick={() => {
                    setCompetidorInput('');
                    setFiltros(prev => ({ ...prev, competidor: '' }));
                    setShowCompetidoresDropdown(false);
                  }}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <X size={14} />
                </button>
              )}

              {showCompetidoresDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => {
                      setShowCompetidoresDropdown(false);
                      setCompetidorInput(filtros.competidor);
                    }}
                  />
                  <div className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white border border-slate-100 rounded-2xl shadow-xl z-40 py-2 custom-scrollbar">
                    {competidores.filter(c => c.toLowerCase().includes(competidorInput.toLowerCase())).length > 0 ? (
                      competidores
                        .filter(c => c.toLowerCase().includes(competidorInput.toLowerCase()))
                        .map((c, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setFiltros(prev => ({ ...prev, competidor: c }));
                              setCompetidorInput(c);
                              setShowCompetidoresDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase transition-colors hover:bg-blue-50 hover:text-blue-600 ${
                              filtros.competidor === c ? 'bg-blue-50 text-blue-600' : 'text-slate-600'
                            }`}
                          >
                            {c}
                          </button>
                        ))
                    ) : (
                      <div className="px-4 py-3 text-xs text-slate-400 uppercase font-black italic">
                        Sin resultados
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* LIMPIAR FILTROS (FILA 3 - COLUMNA 4) */}
            <button
              onClick={() => {
                setFiltros({
                  busqueda: '',
                  provincia: 'Todas',
                  tipo: 'Todos',
                  fechaDesde: '',
                  fechaHasta: '',
                  ganamos: 'todos',
                  competidor: '',
                  posicionCompetidor: 'todos'
                });
                setCompetidorInput('');
              }}
              className="bg-slate-800 hover:bg-red-600 text-white p-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest leading-none col-span-1 cursor-pointer shadow-md hover:shadow-red-100"
            >
              <X size={14} />
              LIMPIAR FILTROS
            </button>
          </div>
        </div>
      </header>

      {/* ========================= */}
      {/* CUERPO PRINCIPAL */}
      {/* ========================= */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* CONTENEDOR DE TABLA + PAGINACIÓN (OCUPA TODO EL ANCHO) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          
          {/* TABLA CON SCROLL INDEPENDIENTE */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="max-w-7xl mx-auto overflow-x-auto">
              <table className="w-full min-w-[900px] bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm overflow-hidden border-separate border-spacing-0 border border-slate-100 dark:border-slate-800">
                <thead className="sticky top-0 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-50 dark:border-slate-800 leading-none z-10">
                  <tr>
                    <th className="px-8 py-5 text-left border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900">
                      FECHA / PROCESO
                    </th>
                    <th className="px-8 py-5 text-left border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900">
                      INSTITUCIÓN
                    </th>
                    <th className="px-8 py-5 text-left border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900">
                      PRODUCTO ANALIZADO
                    </th>
                    <th className="px-8 py-5 text-right border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900">
                      ESTADO
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="text-center py-32 animate-pulse text-blue-600 font-black uppercase text-xs">
                        Sincronizando...
                      </td>
                    </tr>
                  ) : data.length > 0 ? (
                    data.map((item) => (
                      <tr
                        key={item.id_renglon}
                        onClick={() => setSelectedItem(item)}
                        className={`group cursor-pointer transition-all ${
                          selectedItem?.id_renglon === item.id_renglon
                            ? 'bg-blue-50/50 dark:bg-blue-900/20'
                            : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        {/* FECHA */}
                        <td className="px-8 py-5 leading-none">
                          <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mb-1">
                            {item.fecha_apertura
                              ? item.fecha_apertura
                                  .split('T')[0]
                                  .split('-')
                                  .reverse()
                                  .join('/')
                              : 'S/F'}
                          </p>
                          <p className="text-sm font-black text-slate-700 dark:text-slate-200 italic tracking-tight">
                            {item.nro_proceso}
                          </p>
                        </td>

                        {/* HOSPITAL */}
                        <td className="px-8 py-5 leading-none">
                          <p className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase truncate w-64 mb-1">
                            {item.nombre_hospital}
                          </p>
                          <p className="text-[10px] font-black text-slate-300 dark:text-slate-500 uppercase italic tracking-wider">
                            {item.tipo_segmento} - {item.provincia}
                          </p>
                        </td>

                        {/* PRODUCTO */}
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <span className="bg-slate-800 dark:bg-slate-700 text-white px-2 py-1 rounded-lg text-[9px] font-black">
                              R{item.nro_renglon_item}
                            </span>
                            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm uppercase truncate max-w-md italic tracking-tight leading-none">
                              {item.nombre_detalle}
                            </p>
                          </div>
                        </td>

                        {/* ESTADO */}
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-3 leading-none">
                            <span
                              className={`text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-widest shadow-sm ${
                                item.ganamos
                                  ? 'bg-[#8db92e] dark:bg-[#729623] text-white shadow-sm'
                                  : getGanadorLabel(item) === 'No Cotizado'
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                    : 'bg-[#e30613] dark:bg-[#b8040f] text-white shadow-sm'
                              }`}
                            >
                               {getGanadorLabel(item)}
                             </span>
                            <ChevronRight
                              size={16}
                              className={`text-slate-200 transition-all ${
                                selectedItem?.id_renglon === item.id_renglon
                                  ? 'rotate-90 text-blue-600'
                                  : ''
                              }`}
                            />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center py-32 text-slate-300 font-black uppercase text-xs italic">
                        Sin registros
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* BARRA DE PAGINACIÓN FIJA ABAJO */}
          <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-10 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
            
            {/* Info de registros y selector de límite */}
            <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>
                Mostrando {data.length > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} registros
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 dark:text-slate-500">Mostrar:</span>
                <select
                  value={pagination.limit}
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value);
                    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
                  }}
                  className="bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Controles de página */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                disabled={pagination.page === 1 || loading}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                title="Primera página"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page === 1 || loading}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 dark:text-slate-400 transition-colors flex items-center gap-1 text-xs font-black uppercase cursor-pointer"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>

              <div className="flex items-center px-4 text-xs font-black text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl py-1.5 shadow-inner">
                Pág {pagination.page} / {pagination.totalPages || 1}
              </div>

              <button
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                disabled={pagination.page === pagination.totalPages || pagination.totalPages === 0 || loading}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 dark:text-slate-400 transition-colors flex items-center gap-1 text-xs font-black uppercase cursor-pointer"
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: pagination.totalPages }))}
                disabled={pagination.page === pagination.totalPages || pagination.totalPages === 0 || loading}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                title="Última página"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ============================================== */}
        {/* MODAL CENTRADO PREMIUM (EN REEMPLAZO DEL SIDE DRAWER) */}
        {/* ============================================== */}
        {selectedItem && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            
            {/* Fondo translúcido con desenfoque */}
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300" 
              onClick={() => setSelectedItem(null)}
            />
            
            {/* Contenido del Modal */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col relative z-10 animate-in zoom-in-95 duration-200">
              
              {/* Cabecera del Modal */}
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-4">
                  <div className="bg-[#0059a3] text-white p-3 rounded-2xl shadow-lg">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight leading-none mb-1">
                      Auditoría de Renglón 
                      <span className="text-blue-600"> #{selectedItem.nro_renglon_item}</span>
                    </h2>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">
                      Proceso Nro: {selectedItem.nro_proceso}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 p-2.5 rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Detalle del Producto */}
              <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 shrink-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Producto Analizado</p>
                <h3 className="text-base font-bold text-slate-800 uppercase italic leading-snug">
                  {selectedItem.nombre_detalle}
                </h3>
                <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-tight">
                  {selectedItem.nombre_hospital}
                </p>
              </div>

              {/* Grid de 4 Cards de Comparación */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <CardDetalle
                    titulo="1º Oferente"
                    prov={selectedItem.primer_oferente}
                    marca={selectedItem.marca_1}
                    precio={selectedItem.precio_1}
                    color="oro"
                  />

                  <CardDetalle
                    titulo="2º Oferente"
                    prov={(!selectedItem.precio_2 || parseFloat(selectedItem.precio_2) === 0 || selectedItem.segundo_oferente === 'S/D') ? 'ÚNICO OFERENTE' : selectedItem.segundo_oferente}
                    marca={(!selectedItem.precio_2 || parseFloat(selectedItem.precio_2) === 0 || selectedItem.segundo_oferente === 'S/D') ? '---' : selectedItem.marca_2}
                    precio={selectedItem.precio_2}
                    color="plata"
                    dif={calcularDiferencia(selectedItem.precio_2, selectedItem.precio_1)}
                  />

                  <CardDetalle
                      titulo="Nuestra Cotización"
                      prov={(selectedItem.nuestro_pu || selectedItem.mi_pu || selectedItem.mi_pu) > 0 ? "Cotización Propia" : "No Cotizado"}
                      marca={selectedItem.nuestra_marca || selectedItem.mi_marca || selectedItem.mi_marca}
                      precio={selectedItem.nuestro_pu || selectedItem.mi_pu || selectedItem.mi_pu}
                      color="nuestro"
                      dif={calcularDiferencia(selectedItem.nuestro_pu || selectedItem.mi_pu || selectedItem.mi_pu, selectedItem.precio_1)}
                      noCotizado={!(selectedItem.nuestro_pu || selectedItem.mi_pu || selectedItem.mi_pu) || parseFloat(selectedItem.nuestro_pu || selectedItem.mi_pu || selectedItem.mi_pu) === 0}
                    />

                  
                </div>
              </div>
              
              {/* Botón de cierre en el pie */}
              <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all"
                >
                  Cerrar Auditoría
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

/* ========================= */
/* CARD DETALLE */
/* ========================= */

const CardDetalle = ({
  titulo,
  prov,
  marca,
  precio,
  color,
  dif,
  noCotizado
}) => {

  const precioNumerico = parseFloat(precio);

  const tienePrecio =
    !isNaN(precioNumerico) &&
    precioNumerico > 0;

  const getStyles = () => {

    if (noCotizado) {
      return {
        bg: 'bg-slate-50 opacity-40',
        border: 'border-slate-200',
        text: 'text-slate-400',
        icon: 'text-slate-300'
      };
    }

    switch (color) {
      case 'oro':
        return {
          bg: 'bg-amber-50/70',
          border: 'border-amber-400',
          text: 'text-amber-700',
          icon: 'text-amber-500'
        };

      case 'plata':
        return {
          bg: 'bg-slate-100/70',
          border: 'border-slate-400',
          text: 'text-slate-600',
          icon: 'text-slate-500'
        };

      case 'nuestro':
          return {
            bg: 'bg-blue-50/70',
            border: 'border-[#0059a3]',
            text: 'text-slate-700',
            icon: 'text-[#0059a3]'
          };

      case 'sr':
        // Azul Marino / Indigo para DROGUERIA DEMO
        return {
          bg: 'bg-indigo-50/70',
          border: 'border-indigo-400',
          text: 'text-indigo-700',
          icon: 'text-indigo-500'
        };

      default:
        return {
          bg: 'bg-white',
          border: 'border-slate-100',
          text: 'text-slate-800',
          icon: 'text-slate-400'
        };
    }
  };

  const style = getStyles();

  return (
    <div className={`p-5 rounded-[2rem] border-2 shadow-sm flex flex-col justify-between transition-all duration-300 ${style.bg} ${style.border} ${noCotizado ? 'grayscale' : 'hover:shadow-xl hover:-translate-y-1'}`}>
      
      <div>
        <div className="flex justify-between items-start mb-4 leading-none">
          <p className={`text-[10px] font-black uppercase tracking-[0.15em] leading-none ${style.text}`}>
            {titulo}
          </p>

          {dif !== undefined && dif !== null && !noCotizado && tienePrecio && (
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm leading-none ${
              parseFloat(dif) > 0 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-green-600 text-white'
            }`}>
              {parseFloat(dif) > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {parseFloat(dif) > 0 ? `+${parseFloat(dif).toFixed(1)}%` : `${parseFloat(dif).toFixed(1)}%`}
            </span>
          )}
        </div>

        <div className="space-y-3 leading-none">
          <div className="flex items-center gap-3 leading-none">
            <div className="p-1.5 bg-white/60 rounded-lg shadow-sm leading-none">
              <User size={13} className={style.icon} />
            </div>
            <p className="text-xs font-black uppercase truncate leading-none text-slate-700">
              {prov || 'N/D'}
            </p>
          </div>

          <div className="flex items-center gap-3 leading-none">
            <div className="p-1.5 bg-white/60 rounded-lg shadow-sm leading-none">
              <Tag size={13} className={style.icon} />
            </div>
            <p className="text-xs font-bold uppercase truncate leading-none text-slate-500">
              {marca || 'S/M'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-white/60 leading-none text-left">
        <p className={`text-2xl font-black italic tracking-tighter leading-none ${!tienePrecio ? 'text-slate-200' : 'text-slate-900'}`}>
          {tienePrecio
            ? `$${precioNumerico.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
            : '---'}
        </p>
      </div>

    </div>
  );
};

export default Comparativas;