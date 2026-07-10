import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Receipt,
  PackageCheck,
  CheckCircle,
  XCircle,
  Clock3,
  Search,
  Filter,
  Download,
  Upload,
  Calendar,
  AlertCircle,
  Building2,
  Trash2,
  Save,
  Link as LinkIcon,
  HelpCircle,
  Loader2,
  MapPin,
  Tag,
  AlertTriangle,
  X,
  Eye,
  UploadCloud
} from 'lucide-react';

const formatInputNumber = (val) => {
  if (val === undefined || val === null || val === '') return '0,00';
  const num = parseFloat(val);
  if (isNaN(num)) return '0,00';
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

const Seguimiento = ({ setIsDirty }) => {
  const navigate = useNavigate();
  const puedeImportar = sessionStorage.getItem('userPuedeImportar') === '1' || sessionStorage.getItem('userPuedeImportar') === 'true';
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState(null); // Proceso seleccionado para el modal
  const [detalle, setDetalle] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);

  // Filtros
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [provinciaFiltro, setProvinciaFiltro] = useState('Todas');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Paginación
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Modales e Importación
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importType, setImportType] = useState('diarias'); // 'diarias' o 'seguimiento'
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importError, setImportError] = useState(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // Modales e Importación PDF con IA
  const [isPdfImportOpen, setIsPdfImportOpen] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfAnalyzing, setPdfAnalyzing] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [pdfData, setPdfData] = useState(null);
  const [pdfSaving, setPdfSaving] = useState(false);

  // Lista de hospitales en la DB
  const [hospitalesDisponibles, setHospitalesDisponibles] = useState([]);
  const [hospSearch, setHospSearch] = useState('');
  const [hospDropdownOpen, setHospDropdownOpen] = useState(false);
  const hospRef = React.useRef(null);

  const fetchHospitales = async () => {
    try {
      const res = await api.get('/contactos/destinatarios');
      setHospitalesDisponibles(res.data);
    } catch (err) {
      console.error('Error al cargar destinatarios:', err);
    }
  };

  useEffect(() => {
    fetchHospitales();
  }, []);

  // Controlar click fuera del dropdown de búsqueda de hospitales
  useEffect(() => {
    const handleOutside = (e) => {
      if (hospRef.current && !hospRef.current.contains(e.target)) {
        setHospDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Controlar antes de cerrar/recargar página con datos sin guardar
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (pdfData) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pdfData]);

  useEffect(() => {
    if (setIsDirty) {
      setIsDirty(!!pdfData);
    }
  }, [pdfData, setIsDirty]);

  const [showPdfConfirmDiscard, setShowPdfConfirmDiscard] = useState(false);
  const [pdfConfirmDiscardAction, setPdfConfirmDiscardAction] = useState(null); // 'close' or 'reload'

  const handleCancelPdfImport = () => {
    if (pdfData) {
      setPdfConfirmDiscardAction('close');
      setShowPdfConfirmDiscard(true);
    } else {
      setIsPdfImportOpen(false);
    }
  };

  const handleReloadPdfImport = () => {
    setPdfConfirmDiscardAction('reload');
    setShowPdfConfirmDiscard(true);
  };

  // Usabilidad y Modales de Confirmación
  const [showCancelImportConfirm, setShowCancelImportConfirm] = useState(false);
  const [showCommercialSuccess, setShowCommercialSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('¡Datos comerciales actualizados!');
  const [commercialError, setCommercialError] = useState(null);


  // Formulario de edición
  const [editForm, setEditForm] = useState({});

  const [displayCotizado, setDisplayCotizado] = useState('');
  const [displayAdjudicado, setDisplayAdjudicado] = useState('');
  const [displayBajas, setDisplayBajas] = useState('');

  const handleDisplayChange = (val, setDisplay, fieldName) => {
    let clean = val.replace(/[^\d,]/g, '');
    const parts = clean.split(',');
    if (parts.length > 2) {
      clean = parts[0] + ',' + parts.slice(1).join('');
    }
    if (clean === ',') {
      clean = '0,';
    }
    if (clean.length > 1 && clean.startsWith('0') && clean[1] !== ',') {
      clean = clean.replace(/^0+/, '');
      if (clean === '') clean = '0';
    }
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    let formattedInteger = integerPart;
    if (integerPart && integerPart !== '0') {
      const rawInt = parseInt(integerPart.replace(/\./g, ''), 10);
      if (!isNaN(rawInt)) {
        formattedInteger = new Intl.NumberFormat('es-AR').format(rawInt);
      }
    }
    let finalVal = formattedInteger;
    if (clean.includes(',')) {
      finalVal += ',' + (decimalPart !== undefined ? decimalPart : '');
    }
    setDisplay(finalVal);
    const numericVal = parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
    setEditForm(prev => ({ ...prev, [fieldName]: numericVal }));
  };

  const handleDisplayFocus = (val, setDisplay) => {
    if (val === '0' || val === '0,00' || val === '0.00') {
      setDisplay('');
    }
  };

  const handleDisplayBlur = (val, setDisplay, fieldName) => {
    const numericVal = parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
    const formatted = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numericVal);
    setDisplay(formatted);
    setEditForm(prev => ({ ...prev, [fieldName]: numericVal }));
  };

  // Auto-dismiss commercial success toast
  useEffect(() => {
    if (showCommercialSuccess) {
      const timer = setTimeout(() => {
        setShowCommercialSuccess(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [showCommercialSuccess]);

  // =========================
  // CARGAR SEGUIMIENTOS
  // =========================
  const fetchSeguimientos = async () => {
    try {
      setLoading(true);
      const params = {
        provincia: provinciaFiltro,
        hospital: 'Todos',
        estado: estadoFiltro,
        fechaDesde,
        fechaHasta,
        q: debouncedSearch,
        page,
        limit
      };
      
      const res = await api.get('/seguimiento', { params });
      setData(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Resetear página al cambiar filtros
  useEffect(() => {
    setPage(1);
  }, [estadoFiltro, provinciaFiltro, fechaDesde, fechaHasta, debouncedSearch]);

  // Recargar al cambiar de página o filtros (si ya se reseteó la página)
  useEffect(() => {
    fetchSeguimientos();
    setSelectedProcess(null); // Cerrar modal al cambiar de empresa o filtros
  }, [estadoFiltro, provinciaFiltro, fechaDesde, fechaHasta, debouncedSearch, page]);

  

  const handleClearFilters = () => {
    setSearch('');
    setEstadoFiltro('Todos');
    setProvinciaFiltro('Todas');
    setFechaDesde('');
    setFechaHasta('');
  };

  // =========================
  // ABRIR DETALLE EN MODAL
  // =========================
  const handleOpenModal = async (item) => {
    setSelectedProcess(item);
    const idProceso = item.id_proceso_db;

    if (detalle[idProceso]) {
      // Cargar formulario con datos existentes
      const seg = detalle[idProceso].seguimiento || {};
      setEditForm({
        estado: seg.estado || 'PRESENTADA',
        importe_cotizado: seg.importe_cotizado || 0,
        importe_adjudicado: seg.importe_adjudicado || 0,
        monto_bajas: seg.monto_bajas || 0,
        nro_oc: seg.nro_oc || '',
        fecha_recibida_oc: seg.fecha_recibida_oc ? seg.fecha_recibida_oc.split('T')[0] : '',
        nro_nv: seg.nro_nv || '',
        nro_factura: seg.nro_factura || '',
        link_drive: seg.link_drive || '',
        observaciones: seg.observaciones || '',
        comparativa_solicitada: seg.comparativa_solicitada || false,
        comparativa_cargada: seg.comparativa_cargada || false
      });
      setDisplayCotizado(formatInputNumber(seg.importe_cotizado || 0));
      setDisplayAdjudicado(formatInputNumber(seg.importe_adjudicado || 0));
      setDisplayBajas(formatInputNumber(seg.monto_bajas || 0));
      return;
    }

    try {
      const res = await api.get(`/seguimiento/detalle/${idProceso}`, );
      setDetalle(prev => ({ ...prev, [idProceso]: res.data }));
      
      const seg = res.data.seguimiento || {};
      const impCot = seg.importe_cotizado || res.data.diarias?.reduce((acc, r) => acc + (r.cantidad * r.precio_unitario), 0) || 0;

      setEditForm({
        estado: seg.estado || 'PRESENTADA',
        importe_cotizado: impCot,
        importe_adjudicado: seg.importe_adjudicado || 0,
        monto_bajas: seg.monto_bajas || 0,
        nro_oc: seg.nro_oc || '',
        fecha_recibida_oc: seg.fecha_recibida_oc ? seg.fecha_recibida_oc.split('T')[0] : '',
        nro_nv: seg.nro_nv || '',
        nro_factura: seg.nro_factura || '',
        link_drive: seg.link_drive || '',
        observaciones: seg.observaciones || '',
        comparativa_solicitada: seg.comparativa_solicitada || false,
        comparativa_cargada: seg.comparativa_cargada || false
      });
      setDisplayCotizado(formatInputNumber(impCot));
      setDisplayAdjudicado(formatInputNumber(seg.importe_adjudicado || 0));
      setDisplayBajas(formatInputNumber(seg.monto_bajas || 0));
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // ACTUALIZAR SEGUIMIENTO
  // =========================
  const handleUpdate = async (idProceso) => {
    try {
      setSaveLoading(true);
      setCommercialError(null);
      await api.put(`/seguimiento/${idProceso}`, {
        ...editForm
      });
      
      // Recargar detalle en memoria y listado
      const res = await api.get(`/seguimiento/detalle/${idProceso}`, );
      setDetalle(prev => ({ ...prev, [idProceso]: res.data }));
      
      // Actualizar registro en lista principal sin perder filtros
      setData(prev => prev.map(item => {
        if (item.id_proceso_db === idProceso) {
          return {
            ...item,
            estado: editForm.estado,
            importe_cotizado: editForm.importe_cotizado,
            nro_oc: editForm.nro_oc,
            nro_factura: editForm.nro_factura,
            nro_nv: editForm.nro_nv
          };
        }
        return item;
      }));

      setSuccessMessage('¡Datos comerciales actualizados!');
      setShowCommercialSuccess(true);
      setSelectedProcess(null); // Cerrar modal al guardar con éxito
    } catch (err) {
      console.error(err);
      setCommercialError('Error al actualizar datos comerciales.');
    } finally {
      setSaveLoading(false);
    }
  };

  // =========================
  // IMPORTACIÓN DE PLANILLAS
  // =========================
  const handleFileChange = (e) => {
    setImportFile(e.target.files[0]);
    setImportError(null);
    setImportSuccess(false);
    setImportPreview(null);
  };

  const analizarArchivo = async () => {
    if (!importFile) return;
    setImportLoading(true);
    setImportError(null);

    const formData = new FormData();
    formData.append('archivo', importFile);

    try {
      const endpoint = importType === 'diarias' ? '/importar/analizar-diarias' : '/importar/analizar-seguimiento';
      const res = await api.post(endpoint, formData);
      setImportPreview(res.data.renglones);
    } catch (err) {
      setImportError(err.response?.data?.error || 'Error analizando el archivo.');
    } finally {
      setImportLoading(false);
    }
  };

  const guardarImportacion = async () => {
    if (!importPreview) return;

    // VALIDACIÓN DE CADA FILA DETECTADA
    for (let idx = 0; idx < importPreview.length; idx++) {
      const r = importPreview[idx];
      const filaLabel = `fila ${idx + 1}`;
      
      if (!r.nro_proceso || r.nro_proceso.trim() === '' || r.nro_proceso === 'S/D') {
        setImportError(`Debe ingresar o controlar el número de proceso (${filaLabel}).`);
        return;
      }
      if (!r.fecha || r.fecha.trim() === '') {
        setImportError(`Debe ingresar la fecha (${filaLabel}).`);
        return;
      }
      if (!r.hospital || r.hospital.trim() === '' || r.hospital === 'S/D') {
        setImportError(`Debe ingresar el hospital (${filaLabel}).`);
        return;
      }
    }

    setImportLoading(true);
    setImportError(null);

    try {
      const endpoint = importType === 'diarias' ? '/importar/guardar-diarias' : '/importar/guardar-seguimiento';
      await api.post(endpoint, {
        defaultEmpresa: 'Nuestra Empresa',
        renglones: importPreview
      });
      setImportSuccess(true);
      setImportFile(null);
      setImportPreview(null);
      fetchSeguimientos(); // Recargar listado principal
    } catch (err) {
      setImportError(err.response?.data?.error || 'Error al guardar los registros en SQL Server.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCloseImportClick = () => {
    if (importPreview || importFile) {
      setShowCancelImportConfirm(true);
    } else {
      resetImportState();
    }
  };

  const resetImportState = () => {
    setIsImportOpen(false);
    setImportFile(null);
    setImportPreview(null);
    setImportError(null);
    setImportSuccess(false);
    setShowCancelImportConfirm(false);
  };

  // =========================
  // EXPORTAR A CSV
  // =========================
  const exportarCSV = () => {
    const headers = ['Fecha Apertura', 'Numero Proceso', 'Hospital', 'Provincia', 'Segmento', 'Estado', 'Importe Cotizado', 'Nro OC', 'Factura', 'NV'];
    
    const filteredData = data;

    const rows = filteredData.map(item => [
      item.fecha_apertura?.split('T')[0] || '',
      item.nro_proceso || '',
      item.nombre_hospital || '',
      item.provincia || '',
      item.tipo_segmento || '',
      item.estado || 'PRESENTADA',
      item.importe_cotizado || 0,
      item.nro_oc || '',
      item.nro_factura || '',
      item.nro_nv || ''
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Seguimiento_Empresa_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================
  // HELPERS DE DISEÑO
  // =========================
  const getEstadoColor = (estado) => {
    if (!estado) return 'bg-slate-100 text-slate-500';
    switch (estado.toUpperCase()) {
      case 'GANADA':
      case 'GANADA TOTAL':
      case 'ADJUDICADA':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'GANADA PARCIAL':
      case 'ADJUDICADA PARCIAL':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'PERDIDA':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'DADA DE BAJA':
      case 'CANCELADA':
        return 'bg-slate-100 text-slate-600 border border-slate-200';
      case 'EN ESPERA DE OC':
      case 'ESPERA OC':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
      default:
        return 'bg-blue-50 text-blue-700 border border-blue-200';
    }
  };

  const getTemaClases = () => {
    if (false) {
      return {
        text: 'text-indigo-600',
        bg: 'bg-indigo-600',
        bgLight: 'bg-indigo-50',
        border: 'border-indigo-200',
        borderFocus: 'focus:border-indigo-500 focus:ring-indigo-500/20',
        tabActive: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20',
        btnHover: 'hover:bg-indigo-700'
      };
    }
    return {
      text: 'text-blue-600',
      bg: 'bg-blue-600',
      bgLight: 'bg-blue-50',
      border: 'border-blue-200',
      borderFocus: 'focus:border-blue-500 focus:ring-blue-500/20',
      tabActive: 'bg-blue-600 text-white shadow-lg shadow-blue-600/20',
      btnHover: 'hover:bg-blue-700'
    };
  };

  const tema = getTemaClases();

  // Agrupar cotizaciones por día
  const groupedData = {};
  data.forEach(item => {
    const fecha = item.fecha_apertura?.split('T')[0] || 'Sin Fecha';
    if (!groupedData[fecha]) {
      groupedData[fecha] = [];
    }
    groupedData[fecha].push(item);
  });

  const formatearFechaLarga = (fechaStr) => {
    if (fechaStr === 'Sin Fecha') return 'Fecha No Definida';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    const fecha = new Date(partes[0], partes[1] - 1, partes[2]);
    return fecha.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] overflow-hidden page-transition">
      
      {/* SECCIÓN FIJA: CABECERA Y FILTROS */}
      <div className="px-8 pt-5 pb-1 shrink-0 bg-[#f8fafc] z-10 flex flex-col gap-1">
      
      {/* CABECERA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 uppercase italic flex items-center gap-3">
            Seguimiento de Cotizaciones
          </h1>
          <p className="text-slate-400 text-[10px] uppercase tracking-[0.3em] mt-1 font-bold flex items-center gap-1">
            <Clock3 size={11} /> Gestión del Estado Comercial y Cotizaciones Diarias
          </p>
        </div>

        {/* CONTROLES RÁPIDOS */}
        <div className="flex items-center gap-3">
          {puedeImportar && (
            <button
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition"
            >
              <Upload size={14} />
              <span>Importar Planilla</span>
            </button>
          )}

          {puedeImportar && (
            <button
              onClick={() => setIsPdfImportOpen(true)}
              className="flex items-center gap-2 bg-[#0059a3] hover:bg-blue-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition"
            >
              <UploadCloud size={14} />
              <span>Importar PDF (Cotización)</span>
            </button>
          )}
          
          <button
            onClick={exportarCSV}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-wider">
          <Filter size={12} /> Filtros de Búsqueda
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-5 gap-3 transition-all duration-300 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
          
          {/* BUSCADOR */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Buscar por proceso..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-slate-100 transition"
            />
          </div>

          {/* ESTADO */}
          <div>
            <select
              value={estadoFiltro}
              onChange={e => setEstadoFiltro(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-slate-100 transition"
            >
              <option value="Todos">Estado (Todos)</option>
              <option value="PRESENTADA">Presentada</option>
              <option value="GANADA TOTAL">Ganada Total</option>
              <option value="GANADA PARCIAL">Ganada Parcial</option>
              <option value="PERDIDA">Perdida</option>
              <option value="DADA DE BAJA">Dada de Baja</option>
              <option value="EN ESPERA DE OC">En Espera de OC</option>
              <option value="DESCONOCIDO">Desconocido</option>
            </select>
          </div>

          {/* PROVINCIA */}
          <div>
            <select
              value={provinciaFiltro}
              onChange={e => setProvinciaFiltro(e.target.value)}
              
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-slate-100 transition disabled:opacity-60"
            >
              <option value="Todas">Provincia (Todas)</option>
                  <option value="CBA">Córdoba</option>
                  <option value="BS AS">Buenos Aires</option>
                  <option value="SANTA FE">Santa Fe</option>
                  <option value="MENDOZA">Mendoza</option>
                  <option value="TUCUMAN">Tucumán</option>
                  <option value="CATAMARCA">Catamarca</option>
                  <option value="LA PAMPA">La Pampa</option>
                  <option value="ENTRE RIOS">Entre Ríos</option>
                  <option value="SAN JUAN">San Juan</option>
                  <option value="SALTA">Salta</option>
            </select>
          </div>

          {/* DESDE */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Calendar size={12} />
            </span>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-slate-100 transition"
              title="Fecha apertura desde"
            />
          </div>

          {/* HASTA */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
              <Calendar size={12} />
            </span>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-slate-100 transition"
              title="Fecha apertura hasta"
            />
          </div>

        </div>

        <div className="flex justify-end border-t border-slate-100/50 pt-3 mt-1">
          <button
            onClick={handleClearFilters}
            className="text-[10px] font-black uppercase text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 border border-rose-100 transition px-3.5 py-1.5 rounded-xl flex items-center gap-1.5"
          >
            ✕ Limpiar Filtros
          </button>
        </div>

        {/* PANEL INFORMATIVO DE DROGUERIA DEMO */}
        {false && (
          <div className="bg-indigo-50/50 border border-indigo-100 p-2.5 px-4 rounded-xl flex items-center gap-3 text-indigo-700 text-[10px] font-black uppercase tracking-wider animate-in fade-in duration-300">
            <MapPin size={14} />
            <span>DROGUERIA DEMO sólo cotiza en Córdoba. Búsquedas restringidas a CBA.</span>
          </div>
        )}
      </div>

      </div>

      {/* SECCIÓN SCROLLABLE: LISTADO DE PROCESOS */}
      <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">

      {/* LISTADO DE PROCESOS AGRUPADOS */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-24 text-center">
          <Loader2 className="animate-spin text-slate-400 mx-auto mb-4" size={40} />
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Cargando cotizaciones...</p>
        </div>
      ) : Object.keys(groupedData).length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-24 text-center">
          <AlertCircle className="text-slate-300 mx-auto mb-4" size={48} />
          <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">No se encontraron cotizaciones</p>
          <p className="text-slate-400 text-xs mt-2">Prueba modificando los filtros o realiza una nueva importación.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedData)
            .sort((a, b) => new Date(b) - new Date(a))
            .map(fecha => (
              <div key={fecha} className="space-y-3">
                
                {/* DIVIDER DE FECHA */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-[1px] bg-slate-200"></div>
                  <span className="bg-slate-100 border border-slate-200/50 text-slate-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                    <Calendar size={12} />
                    {formatearFechaLarga(fecha)}
                  </span>
                  <div className="flex-1 h-[1px] bg-slate-200"></div>
                </div>

                {/* FILAS DE PROCESO */}
                {groupedData[fecha].map(item => (
                  <div
                    key={item.id_proceso_db}
                    className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition duration-300"
                  >
                    
                    {/* ENCABEZADO DE FILA */}
                    <div 
                      onClick={() => handleOpenModal(item)}
                      className="p-6 flex flex-wrap md:flex-nowrap items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50 transition select-none"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-5 flex-1 gap-4 items-center">
                        
                        {/* PROCESO */}
                        <div>
                          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Proceso</div>
                          <div className={`font-black text-sm ${tema.text}`}>{item.nro_proceso}</div>
                        </div>

                        {/* HOSPITAL */}
                        <div className="col-span-2">
                          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Hospital / Destinatario</div>
                          <div className="font-bold text-sm text-slate-700 truncate max-w-[320px]">{item.nombre_hospital}</div>
                        </div>

                        {/* PROVINCIA */}
                        <div>
                          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Ubicación / Segmento</div>
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">{item.provincia}</span>
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">{item.tipo_segmento}</span>
                          </div>
                        </div>

                        {/* IMPORTE */}
                        <div>
                          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Importe Cotizado</div>
                          <div className="font-black text-sm text-slate-700">
                            ${parseFloat(item.importe_cotizado || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>

                      </div>

                      {/* BADGES COMERCIALES */}
                      <div className="flex items-center md:w-[260px] md:justify-end shrink-0 gap-3">
                        
                        {/* ESTADO COMPARATIVA */}
                        <div>
                          {item.comparativa_cargada === 1 ? (
                            <span 
                              onClick={() => navigate(`/?search=${encodeURIComponent(item.nro_proceso)}`)}
                              className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-emerald-100 hover:text-emerald-800 transition block text-center"
                              title="Ver Comparativa"
                            >
                              Comparativa OK
                            </span>
                          ) : (
                            <span className="bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-200 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap">
                              Sin Comparativa
                            </span>
                          )}
                        </div>

                        {/* ESTADO COMERCIAL */}
                        <div>
                          <span className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${getEstadoColor(item.estado)}`}>
                            {item.estado || 'PRESENTADA'}
                          </span>
                        </div>

                        {/* ICONO */}
                        <div className="p-1 text-slate-400">
                          <Eye size={18} />
                        </div>

                      </div>

                    </div>

                  </div>
                ))}

              </div>
            ))}
      </div>
      )}

      </div>

      {/* BARRA DE PAGINACIÓN FIJA ABAJO */}
      {!loading && data.length > 0 && (
        <div className="bg-white border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-10 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
          
          {/* Info de registros y selector de límite */}
          <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
            <span>
              Mostrando {data.length > 0 ? ((page - 1) * limit) + 1 : 0} - {Math.min(page * limit, total)} de {total} seguimientos
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Mostrar:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-2 py-1 text-xs font-bold text-slate-600 outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Controles de página */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1 || loading}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition-colors cursor-pointer"
              title="Primera página"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1 || loading}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition-colors flex items-center gap-1 text-xs font-black uppercase cursor-pointer"
            >
              <ChevronLeft size={16} />
              Anterior
            </button>

            <div className="flex items-center px-4 text-xs font-black text-slate-700 bg-slate-50 dark:bg-slate-800 border border-slate-100 rounded-xl py-1.5 shadow-inner">
              Pág {page} / {totalPages || 1}
            </div>

            <button
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages || totalPages === 0 || loading}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition-colors flex items-center gap-1 text-xs font-black uppercase cursor-pointer"
            >
              Siguiente
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages || totalPages === 0 || loading}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition-colors cursor-pointer"
              title="Última página"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTACIÓN */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-3xl text-left shadow-2xl animate-in zoom-in duration-300 w-full max-w-4xl border border-slate-100 max-h-[85vh] flex flex-col">
            
            {/* CABECERA MODAL */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-xl font-black text-slate-800 uppercase italic flex items-center gap-2">
                <Upload size={20} className="text-slate-600" />
                Importador de Planillas
              </h2>
              <button onClick={handleCloseImportClick} className="text-slate-400 hover:text-slate-600 font-black text-sm">
                Cerrar
              </button>
            </div>

            {/* CONTENIDO SCROLLABLE */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-6">
              
              {/* SELECTORES DE CONFIGURACIÓN */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/50">
                
                {/* TIPO */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Tipo de Planilla</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setImportType('diarias'); setImportPreview(null); }}
                      className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs uppercase transition ${importType === 'diarias' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      Diarias (Detallada)
                    </button>
                    <button
                      onClick={() => { setImportType('seguimiento'); setImportPreview(null); }}
                      className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs uppercase transition ${importType === 'seguimiento' ? 'bg-slate-800 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      Seguimiento (Resumen)
                    </button>
                  </div>
                </div>

                {/* EMPRESA DESTINATARIA */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Empresa</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setImportEmpresa('PHARMA CENTER')}
                      
                      className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs uppercase transition ${'Nuestra Empresa' === 'PHARMA CENTER' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'} disabled:opacity-50`}
                    >
                      Pharma Center
                    </button>
                    <button
                      onClick={() => setImportEmpresa('DROGUERIA DEMO')}
                      className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs uppercase transition ${'Nuestra Empresa' === 'DROGUERIA DEMO' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      DROGUERIA DEMO
                    </button>
                  </div>
                </div>

                {/* ARCHIVO */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Archivo (.xlsx, .xls, .csv)</label>
                  <div className="relative">
                    <input
                      type="file"
                      id="importFileInput"
                      onChange={handleFileChange}
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                    />
                    <button
                      onClick={() => document.getElementById('importFileInput').click()}
                      className="w-full bg-white border border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 border-dashed"
                    >
                      <Search size={14} />
                      <span>{importFile ? 'Cambiar Archivo' : 'Seleccionar Archivo'}</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* ARCHIVO CARGADO INFO */}
              {importFile && (
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 border border-slate-100 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-800 text-white p-2 rounded-xl">
                      <FileText size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-700">{importFile.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{(importFile.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                  {!importPreview && (
                    <button
                      onClick={analizarArchivo}
                      disabled={importLoading}
                      className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition"
                    >
                      {importLoading ? <Loader2 className="animate-spin" size={14} /> : null}
                      <span>Analizar Archivo</span>
                    </button>
                  )}
                </div>
              )}

              {/* ALERTA DE ERROR */}
              {importError && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl flex items-center gap-3 text-rose-700 text-xs font-bold">
                  <AlertCircle size={16} />
                  <span>{importError}</span>
                </div>
              )}

              {/* VISTA PREVIA DE DATOS ANALIZADOS */}
              {importPreview && (
                <div className="space-y-3">
                  <div className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                    <span>Vista Previa del Archivo ({importPreview.length} filas detectadas)</span>
                    <span className="text-slate-500 font-bold">Mostrando las primeras 5 filas</span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 font-black text-slate-500 dark:text-slate-400 uppercase text-[9px] tracking-wider">
                          <th className="p-3">Fecha</th>
                          <th className="p-3">Proceso</th>
                          <th className="p-3">Hospital</th>
                          {importType === 'diarias' ? (
                            <>
                              <th className="p-3">Reng</th>
                              <th className="p-3">Cant</th>
                              <th className="p-3">Detalle</th>
                              <th className="p-3">Marca</th>
                              <th className="p-3 text-right">Precio</th>
                            </>
                          ) : (
                            <>
                              <th className="p-3 text-right">Total Cotizado</th>
                              <th className="p-3">Estado</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                        {importPreview.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 dark:hover:bg-slate-800/50">
                            <td className="p-3">{row.fecha}</td>
                            <td className="p-3 font-bold text-slate-700">{row.nro_proceso}</td>
                            <td className="p-3 truncate max-w-[150px]">{row.hospital}</td>
                            {importType === 'diarias' ? (
                              <>
                                <td className="p-3">{row.renglon}</td>
                                <td className="p-3">{row.cantidad}</td>
                                <td className="p-3 truncate max-w-[180px]">{row.detalle}</td>
                                <td className="p-3 font-black text-[10px] text-slate-500">{row.marca}</td>
                                <td className="p-3 text-right font-bold text-slate-800">${parseFloat(row.precio_unitario || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                              </>
                            ) : (
                              <>
                                <td className="p-3 text-right font-bold text-slate-800">${parseFloat(row.total_cotizado || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getEstadoColor(row.estado)}`}>
                                    {row.estado}
                                  </span>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-amber-50 border border-amber-200/50 p-4 rounded-xl flex items-center gap-3 text-amber-800 text-xs font-medium">
                    <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
                    <span>Se creará o actualizará automáticamente el Proceso y el Hospital si no existen en la base de datos de Droguería.</span>
                  </div>
                </div>
              )}

            </div>

            {/* BOTONES DE ACCIÓN MODAL */}
            <div className="border-t border-slate-100 pt-6 mt-6 flex justify-end gap-3">
              <button
                onClick={handleCloseImportClick}
                className="bg-white border border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition"
              >
                Cerrar
              </button>
              {importPreview && (
                <button
                  onClick={guardarImportacion}
                  disabled={importLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center gap-1.5"
                >
                  {importLoading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                  <span>Guardar en SQL Server</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* FEEDBACK DE EXITO DE IMPORTACION */}
      {importSuccess && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-3xl text-center shadow-2xl animate-in zoom-in duration-300">
            <CheckCircle size={60} className="text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-slate-800 uppercase italic">¡Planilla Guardada!</h2>
            <p className="text-slate-500 mb-6 text-sm font-semibold">Los registros fueron cargados exitosamente en la base de datos SQL Server.</p>
            <button onClick={() => setImportSuccess(false)} className="bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-sm transition">
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* FLOATING TOASTS PARA SEGUIMIENTO COMERCIAL */}
      {showCommercialSuccess && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white py-4 px-6 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-800 animate-in slide-in-from-bottom duration-300 z-[250]">
          <CheckCircle className="text-emerald-500" size={20} />
          <span className="text-xs font-bold uppercase tracking-wider">{successMessage}</span>
          <button onClick={() => setShowCommercialSuccess(false)} className="text-slate-400 hover:text-white font-black text-xs ml-2">×</button>
        </div>
      )}

      {commercialError && (
        <div className="fixed bottom-6 right-6 bg-rose-600 text-white py-4 px-6 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-300 z-50">
          <XCircle size={20} />
          <span className="text-xs font-bold uppercase tracking-wider">{commercialError}</span>
          <button onClick={() => setCommercialError(null)} className="text-slate-200 hover:text-white font-black text-xs ml-2">×</button>
        </div>
      )}

      {/* MODAL CONFIRMACION DESCARTAR IMPORTACION */}
      {showCancelImportConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in duration-300 text-center">
            <div className="bg-amber-50 text-amber-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 border border-amber-100">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase italic mb-2">Descartar Importación</h3>
            <p className="text-slate-500 text-sm font-semibold mb-6">
              ¿Estás seguro de que quieres descartar los cambios sin guardar?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowCancelImportConfirm(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition flex-1"
              >
                No, Volver
              </button>
              <button
                onClick={resetImportState}
                className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-md flex-1"
              >
                Sí, Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CENTRADO DE DETALLE DE DIARIA */}
      {selectedProcess && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          {/* Fondo translúcido con desenfoque */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300" 
            onClick={() => setSelectedProcess(null)}
          />
          
          {/* Contenido del Modal */}
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col relative z-10 animate-in zoom-in-95 duration-200">
            
            {/* Cabecera del Modal */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className={`${tema.bg} text-white p-3 rounded-2xl shadow-lg`}>
                  <Receipt size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight leading-none mb-1">
                    Seguimiento de Cotización
                    <span className={`text-blue-600`}> #{selectedProcess.nro_proceso}</span>
                  </h2>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">
                    {selectedProcess.nombre_hospital}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProcess(null)}
                className="bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 p-2.5 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sub-Cabecera de Información de Ubicación */}
            <div className="px-8 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 flex flex-wrap gap-4 items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Región:</span>
                <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                  {selectedProcess.provincia}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Segmento:</span>
                <span className="bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                  {selectedProcess.tipo_segmento}
                </span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comparativa:</span>
                {selectedProcess.comparativa_cargada === 1 ? (
                  <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                    Comparativa Cargada (OK)
                  </span>
                ) : (
                  <span className="bg-slate-200 text-slate-500 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                    Sin Comparativa
                  </span>
                )}
              </div>
            </div>

            {/* Contenido principal en scroll (2 columnas en desktop) */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                
                {/* PANEL EDITABLE COMERCIAL */}
                <div className="lg:col-span-2 bg-slate-50/50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 p-6 flex flex-col gap-4">
                  <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest border-b border-slate-200/60 pb-3 flex items-center gap-1.5">
                    <Tag size={14} /> Gestión Comercial
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    
                    {/* ESTADO */}
                    <div className="col-span-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Estado del Proceso</label>
                      <select
                        value={editForm.estado || 'PRESENTADA'}
                        onChange={e => setEditForm({ ...editForm, estado: e.target.value })}
                        className="w-full bg-white border border-slate-200 py-2.5 px-3 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-100 transition"
                      >
                        <option value="PRESENTADA">Presentada</option>
                        <option value="GANADA TOTAL">Ganada Total</option>
                        <option value="GANADA PARCIAL">Ganada Parcial</option>
                        <option value="PERDIDA">Perdida</option>
                        <option value="DADA DE BAJA">Dada de Baja</option>
                        <option value="EN ESPERA DE OC">En Espera de OC</option>
                        <option value="DESCONOCIDO">Desconocido</option>
                      </select>
                    </div>

                    {/* IMPORTE COTIZADO */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Importe Cotizado ($)</label>
                      <input
                        type="text"
                        value={displayCotizado}
                        onChange={e => handleDisplayChange(e.target.value, setDisplayCotizado, 'importe_cotizado')}
                        onFocus={() => handleDisplayFocus(displayCotizado, setDisplayCotizado)}
                        onBlur={() => handleDisplayBlur(displayCotizado, setDisplayCotizado, 'importe_cotizado')}
                        className="w-full bg-white border border-slate-200 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-100 transition"
                      />
                    </div>

                    {/* IMPORTE ADJUDICADO */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Importe Adjudicado ($)</label>
                      <input
                        type="text"
                        value={displayAdjudicado}
                        onChange={e => handleDisplayChange(e.target.value, setDisplayAdjudicado, 'importe_adjudicado')}
                        onFocus={() => handleDisplayFocus(displayAdjudicado, setDisplayAdjudicado)}
                        onBlur={() => handleDisplayBlur(displayAdjudicado, setDisplayAdjudicado, 'importe_adjudicado')}
                        className="w-full bg-white border border-slate-200 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-100 transition"
                      />
                    </div>

                    {/* MONTO BAJAS */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Monto Bajas ($)</label>
                      <input
                        type="text"
                        value={displayBajas}
                        onChange={e => handleDisplayChange(e.target.value, setDisplayBajas, 'monto_bajas')}
                        onFocus={() => handleDisplayFocus(displayBajas, setDisplayBajas)}
                        onBlur={() => handleDisplayBlur(displayBajas, setDisplayBajas, 'monto_bajas')}
                        className="w-full bg-white border border-slate-200 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-100 transition"
                      />
                    </div>

                    {/* NRO OC */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Número OC</label>
                      <input
                        type="text"
                        placeholder="S/D"
                        value={editForm.nro_oc || ''}
                        onChange={e => setEditForm({ ...editForm, nro_oc: e.target.value })}
                        className="w-full bg-white border border-slate-200 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-100 transition"
                      />
                    </div>

                    {/* FECHA OC */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Fecha Recibida OC</label>
                      <input
                        type="date"
                        value={editForm.fecha_recibida_oc || ''}
                        onChange={e => setEditForm({ ...editForm, fecha_recibida_oc: e.target.value })}
                        className="w-full bg-white border border-slate-200 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-100 transition"
                      />
                    </div>

                    {/* NRO FACTURA */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Número Factura</label>
                      <input
                        type="text"
                        placeholder="S/D"
                        value={editForm.nro_factura || ''}
                        onChange={e => setEditForm({ ...editForm, nro_factura: e.target.value })}
                        className="w-full bg-white border border-slate-200 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-100 transition"
                      />
                    </div>

                    {/* NRO NV */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Número Nota Venta (NV)</label>
                      <input
                        type="text"
                        placeholder="S/D"
                        value={editForm.nro_nv || ''}
                        onChange={e => setEditForm({ ...editForm, nro_nv: e.target.value })}
                        className="w-full bg-white border border-slate-200 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-100 transition"
                      />
                    </div>

                    {/* LINK DRIVE */}
                    <div className="col-span-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Link Carpeta Drive</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="https://drive.google.com/..."
                          value={editForm.link_drive || ''}
                          onChange={e => setEditForm({ ...editForm, link_drive: e.target.value })}
                          className="w-full bg-white border border-slate-200 py-2 pl-3 pr-10 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-100 transition"
                        />
                        {editForm.link_drive && (
                          <a
                            href={editForm.link_drive}
                            target="_blank"
                            rel="noreferrer"
                            className={`absolute right-3.5 top-2.5 ${tema.text}`}
                          >
                            <LinkIcon size={14} />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* OBSERVACIONES */}
                    <div className="col-span-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Observaciones</label>
                      <textarea
                        placeholder="Agregar comentarios de seguimiento..."
                        rows={3}
                        value={editForm.observaciones || ''}
                        onChange={e => setEditForm({ ...editForm, observaciones: e.target.value })}
                        className="w-full bg-white border border-slate-200 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-slate-100 transition"
                      />
                    </div>

                  </div>

                  <button
                    onClick={() => handleUpdate(selectedProcess.id_proceso_db)}
                    disabled={saveLoading}
                    className={`w-full text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition flex items-center justify-center gap-2 mt-2 ${tema.bg} ${tema.btnHover} shadow-md`}
                  >
                    {saveLoading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                    <span>Guardar Cambios</span>
                  </button>
                </div>

                {/* PANEL DE PRODUCTOS / RENGLONES */}
                <div className="lg:col-span-3 flex flex-col h-full">
                  
                  <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest border-b border-slate-200 pb-3 mb-4 flex items-center gap-1.5 shrink-0">
                    <PackageCheck size={14} /> Detalle de Cotización (Renglón por Renglón)
                  </h3>

                  <div className="flex-1 overflow-x-auto min-h-[350px]">
                    {!detalle[selectedProcess.id_proceso_db]?.diarias || detalle[selectedProcess.id_proceso_db].diarias.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200">
                        <HelpCircle className="text-slate-300 mb-2" size={32} />
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">No hay cotización diaria cargada</p>
                        <p className="text-slate-400 text-[10px] mt-1 max-w-[280px]">Importa la planilla detallada para asociar los renglones cotizados.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                            <th className="py-2.5 w-10">R</th>
                            <th className="py-2.5">Producto</th>
                            <th className="py-2.5 text-center">Cant.</th>
                            <th className="py-2.5">Marca</th>
                            <th className="py-2.5 text-right">Precio</th>
                            <th className="py-2.5 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                          {detalle[selectedProcess.id_proceso_db].diarias.map((d, index) => {
                            const isMatch = search.trim() !== '' && d.nombre_detalle?.toLowerCase().includes(search.toLowerCase());
                            return (
                              <tr 
                                key={index} 
                                className={`transition duration-200 ${isMatch ? 'bg-amber-50 hover:bg-amber-100/70 font-semibold border-l-4 border-l-amber-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30 dark:hover:bg-slate-800/50'}`}
                              >
                                <td className={`py-3 font-black text-slate-400 ${isMatch ? 'pl-2' : ''}`}>{d.nro_renglon_item}</td>
                                <td className={`py-3 font-bold truncate max-w-[200px] ${isMatch ? 'text-amber-900 font-extrabold' : ''}`} title={d.nombre_detalle}>
                                  {d.nombre_detalle}
                                </td>
                                <td className="py-3 text-center font-bold text-slate-500">{d.cantidad}</td>
                                <td className="py-3 text-center">
                                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase inline-block ${isMatch ? 'bg-amber-100 text-amber-800' : 'text-slate-500'}`}>
                                    {d.marca || 'S/M'}
                                  </span>
                                </td>
                                <td className="py-3 text-right">
                                  <span className={`px-2 py-1 rounded-lg font-black inline-block ${isMatch ? 'bg-amber-100 text-amber-950 font-black' : 'text-slate-800'}`}>
                                    ${parseFloat(d.precio_unitario || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                  </span>
                                </td>
                                <td className="py-3 text-right font-black text-slate-800 pr-2">
                                  ${parseFloat(d.total_linea || (d.cantidad * d.precio_unitario) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL IMPORTACIÓN PDF (COTIZACIÓN) */}
      {isPdfImportOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <UploadCloud size={20} className="text-[#0059a3]" />
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                  Importar Cotización (PDF) con IA
                </h3>
              </div>
              <button 
                onClick={handleCancelPdfImport}
                className="text-slate-400 hover:text-slate-650 p-1 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
              {!pdfData ? (
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition relative">
                  <input 
                    type="file" 
                    accept=".pdf"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      setPdfFile(file);
                      setPdfAnalyzing(true);
                      setPdfError('');
                      
                      const formData = new FormData();
                      formData.append('file', file);
                      
                      try {
                        const res = await api.post('/importar/pdf/analizar', formData, {
                          headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        // Buscar coincidencia aproximada de hospital en la lista local
                        const extractedHosp = (res.data.hospital || '').toUpperCase();
                        const matchedHosp = hospitalesDisponibles.find(h => 
                          h.nombre_hospital.toUpperCase().includes(extractedHosp) || 
                          extractedHosp.includes(h.nombre_hospital.toUpperCase())
                        );
                        
                        setPdfData({
                          ...res.data,
                          hospital: matchedHosp ? matchedHosp.nombre_hospital : (hospitalesDisponibles.length > 0 ? hospitalesDisponibles[0].nombre_hospital : res.data.hospital),
                          fecha: new Date().toISOString().split('T')[0]
                        });
                      } catch (err) {
                        setPdfError(err.response?.data?.error || 'Error al analizar el PDF con IA.');
                        setPdfFile(null);
                      } finally {
                        setPdfAnalyzing(false);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={pdfAnalyzing}
                  />
                  {pdfAnalyzing ? (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <Loader2 size={40} className="text-[#0059a3] animate-spin" />
                      <p className="text-sm font-bold text-slate-600 animate-pulse uppercase tracking-wider">
                        Analizando cotización con IA...
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <UploadCloud size={48} className="text-slate-450" />
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-700">Arrastrá tu PDF de cotización aquí o hacé clic para buscar</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">Límite de tamaño: 10MB (Solo archivos PDF)</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* METADATOS EXTRAIDOS */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-blue-50/20 border border-blue-100 p-4 rounded-2xl">
                    <div className="relative" ref={hospRef}>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Hospital / Destinatario</label>
                      <input 
                        type="text"
                        placeholder="Buscar o escribir hospital..."
                        value={pdfData.hospital || hospSearch}
                        onChange={(e) => {
                          setHospSearch(e.target.value);
                          setHospDropdownOpen(true);
                          setPdfData({ ...pdfData, hospital: e.target.value });
                        }}
                        onFocus={() => {
                          setHospSearch('');
                          setHospDropdownOpen(true);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-500 outline-none"
                      />
                      {hospDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-50 py-1">
                          {hospitalesDisponibles
                            .filter(h => h.nombre_hospital.toUpperCase().includes((hospSearch || pdfData.hospital || '').toUpperCase()))
                            .map(h => (
                              <button
                                key={h.id_destinatario}
                                type="button"
                                onClick={() => {
                                  setPdfData({ ...pdfData, hospital: h.nombre_hospital });
                                  setHospSearch('');
                                  setHospDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-750 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                              >
                                {h.nombre_hospital}
                              </button>
                            ))
                          }
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Nro de Proceso</label>
                      <input 
                        type="text" 
                        value={pdfData.nro_proceso}
                        onChange={(e) => setPdfData({ ...pdfData, nro_proceso: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-750 font-mono focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Fecha Cotización</label>
                      <input 
                        type="date" 
                        value={pdfData.fecha}
                        onChange={(e) => setPdfData({ ...pdfData, fecha: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Monto Total Cotizado ($)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={pdfData.importe_cotizado}
                        onChange={(e) => setPdfData({ ...pdfData, importe_cotizado: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* TABLA DE RENGLONES */}
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-2">Detalle Renglón por Renglón</h4>
                    <div className="border border-slate-100 rounded-2xl max-h-64 overflow-y-auto overflow-x-auto custom-scrollbar">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-100 dark:border-slate-700">
                            <th className="py-2.5 px-4 w-16">Renglon</th>
                            <th className="py-2.5 px-4">Detalle / Producto</th>
                            <th className="py-2.5 px-4 w-20">Cant</th>
                            <th className="py-2.5 px-4 w-32">Marca</th>
                            <th className="py-2.5 px-4 w-32 text-right">P. Unitario</th>
                            <th className="py-2.5 px-4 w-32 text-right">Total</th>
                            <th className="py-2.5 px-2 w-12 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800 font-semibold text-slate-650">
                          {pdfData.items.map((item, index) => (
                            <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-800/50">
                              <td className="py-2 px-4">
                                <input 
                                  type="text" 
                                  value={item.renglon}
                                  onChange={(e) => {
                                    const updated = [...pdfData.items];
                                    updated[index].renglon = e.target.value;
                                    setPdfData({ ...pdfData, items: updated });
                                  }}
                                  className="w-full bg-transparent border-0 font-bold focus:ring-1 focus:ring-blue-500 rounded p-1"
                                />
                              </td>
                              <td className="py-2 px-4">
                                <input 
                                  type="text" 
                                  value={item.detalle}
                                  onChange={(e) => {
                                    const updated = [...pdfData.items];
                                    updated[index].detalle = e.target.value;
                                    setPdfData({ ...pdfData, items: updated });
                                  }}
                                  className="w-full bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded p-1"
                                />
                              </td>
                              <td className="py-2 px-4">
                                <input 
                                  type="number" 
                                  value={item.cantidad}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    const updated = [...pdfData.items];
                                    updated[index].cantidad = val;
                                    const total = updated.reduce((sum, it) => sum + (it.cantidad * it.precio_unitario), 0);
                                    setPdfData({ ...pdfData, items: updated, importe_cotizado: total });
                                  }}
                                  className="w-full bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded p-1"
                                />
                              </td>
                              <td className="py-2 px-4">
                                <input 
                                  type="text" 
                                  value={item.marca}
                                  onChange={(e) => {
                                    const updated = [...pdfData.items];
                                    updated[index].marca = e.target.value;
                                    setPdfData({ ...pdfData, items: updated });
                                  }}
                                  className="w-full bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded p-1"
                                />
                              </td>
                              <td className="py-2 px-4 text-right">
                                <input 
                                  type="number" 
                                  step="0.01"
                                  value={item.precio_unitario}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    const updated = [...pdfData.items];
                                    updated[index].precio_unitario = val;
                                    const total = updated.reduce((sum, it) => sum + (it.cantidad * it.precio_unitario), 0);
                                    setPdfData({ ...pdfData, items: updated, importe_cotizado: total });
                                  }}
                                  className="w-full bg-transparent border-0 text-right focus:ring-1 focus:ring-blue-500 rounded p-1 font-mono"
                                />
                              </td>
                              <td className="py-2 px-4 text-right font-mono font-bold text-slate-800">
                                ${(item.cantidad * item.precio_unitario).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = pdfData.items.filter((_, i) => i !== index);
                                    const total = updated.reduce((sum, it) => sum + (it.cantidad * it.precio_unitario), 0);
                                    setPdfData({ ...pdfData, items: updated, importe_cotizado: total });
                                  }}
                                  className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-50 transition"
                                  title="Eliminar Renglón"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between items-center mt-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...pdfData.items];
                            updated.push({
                              renglon: String(updated.length + 1),
                              detalle: '',
                              cantidad: 1,
                              marca: '',
                              precio_unitario: 0
                            });
                            setPdfData({ ...pdfData, items: updated });
                          }}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                        >
                          + Agregar Renglón
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const sorted = [...pdfData.items].sort((a, b) => {
                              return String(a.renglon || '').localeCompare(String(b.renglon || ''), undefined, {
                                numeric: true,
                                sensitivity: 'base'
                              });
                            });
                            setPdfData({ ...pdfData, items: sorted });
                          }}
                          className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#0059a3] text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Ordenar Renglones
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {pdfError && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={14} /> {pdfError}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 shrink-0">
              {pdfData ? (
                <button
                  onClick={handleReloadPdfImport}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Volver a cargar
                </button>
              ) : <div />}
              
              <div className="flex gap-2">
                <button
                  onClick={handleCancelPdfImport}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancelar
                </button>
                {pdfData && (
                  <button
                    onClick={async () => {
                      setPdfSaving(true);
                      setPdfError('');
                      try {
                        await api.post('/importar/pdf/confirmar', {
                          ...pdfData // Enviar la empresa activa
                        });
                        setIsPdfImportOpen(false);
                        setPdfFile(null);
                        setPdfData(null);
                        
                        // Recargar el listado principal
                        fetchSeguimientos();
                        setSuccessMessage('¡Cotización importada y cargada en Diarias con éxito!');
                        setShowCommercialSuccess(true);
                      } catch (err) {
                        setPdfError(err.response?.data?.error || 'Error al guardar los datos.');
                      } finally {
                        setPdfSaving(false);
                      }
                    }}
                    disabled={pdfSaving}
                    className="px-4 py-2 bg-[#0059a3] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {pdfSaving ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Save size={12} />
                        <span>Confirmar y Guardar</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL PREMIUM DE CONFIRMACIÓN DE DESCARTAR CAMBIOS DEL IMPORTADOR PDF */}
      {showPdfConfirmDiscard && (
        <div className="fixed inset-0 bg-slate-905/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 p-8 shadow-2xl animate-in zoom-in duration-300 text-center">
            <div className="bg-amber-50 text-amber-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 border border-amber-100">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase italic mb-2">¿Descartar Cambios?</h3>
            <p className="text-slate-500 text-sm font-semibold mb-6">
              Tenés datos cargados y modificados en la previsualización de la cotización. Si continuás, perderás todas las correcciones realizadas.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setShowPdfConfirmDiscard(false);
                  setPdfConfirmDiscardAction(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-650 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowPdfConfirmDiscard(false);
                  if (pdfConfirmDiscardAction === 'close') {
                    setIsPdfImportOpen(false);
                    setPdfFile(null);
                    setPdfData(null);
                    setPdfError('');
                  } else if (pdfConfirmDiscardAction === 'reload') {
                    setPdfData(null);
                  }
                  setPdfConfirmDiscardAction(null);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition flex-1 animate-pulse"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Seguimiento;