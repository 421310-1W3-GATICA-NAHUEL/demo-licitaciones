import React, { useState, useEffect } from 'react';
import api from '../api/api';
import {
    UploadCloud,
    FileSpreadsheet,
    FileText,
    Image,
    Loader2,
    Search,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Check,
    CheckCircle,
    DollarSign,
    Percent,
    Award,
    FileDown,
    RefreshCw,
    X,
    Activity,
    AlertTriangle,
    Boxes,
    User,
    Tag
} from 'lucide-react';
import * as XLSX from 'xlsx';

const Cotizador = () => {
    // Helper para determinar la empresa activa del usuario según permisos
    const getActiveEmpresa = () => {
        const acceso = sessionStorage.getItem('userEmpresaAcceso');
        let emp = sessionStorage.getItem('asistente_empresa');
        if (emp === 'SR') emp = 'DROGUERIA DEMO';
        return emp || 'DROGUERIA DEMO';
    };

    // Estado de archivos y carga
    const [file, setFile] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    
    // Lista de ítems extraídos del documento (Cargado dinámicamente desde sessionStorage si existe)
    const [items, setItems] = useState(() => {
        const saved = sessionStorage.getItem('cotizador_items');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedItemIdx, setSelectedItemIdx] = useState(() => {
        const saved = sessionStorage.getItem('cotizador_selectedIdx');
        return saved !== null ? Number(saved) : null;
    });

    // Estado para coincidencia de catálogo e historial del ítem seleccionado
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [matches, setMatches] = useState([]);
    const [historial, setHistorial] = useState([]);
    const [selectedAuditItem, setSelectedAuditItem] = useState(null);
    
    const userEmpresaAcceso = sessionStorage.getItem('userEmpresaAcceso');

    const calcularDiferencia = (precioPropio, precioGanador) => {
        const p1 = parseFloat(precioPropio);
        const pG = parseFloat(precioGanador);
        if (isNaN(p1) || isNaN(pG) || p1 === 0 || pG === 0) return null;
        return ((p1 - pG) / pG) * 100;
    };
    const [selectedProductId, setSelectedProductId] = useState('');
    const [precioCotizado, setPrecioCotizado] = useState('');
    
    // Búsqueda manual de productos en el catálogo
    const [busquedaManual, setBusquedaManual] = useState('');
    const [manualMatches, setManualMatches] = useState([]);
    const [searchingManual, setSearchingManual] = useState(false);
    const [selectedManualProduct, setSelectedManualProduct] = useState(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showFinalizarSuccess, setShowFinalizarSuccess] = useState(false);

    // Guardado de cotizaciones hechas en memoria
    const [cotizaciones, setCotizaciones] = useState(() => {
        const saved = sessionStorage.getItem('cotizador_cotizaciones');
        return saved ? JSON.parse(saved) : {};
    });

    // Hooks para guardar cambios en el sessionStorage en caliente
    useEffect(() => {
        sessionStorage.setItem('cotizador_items', JSON.stringify(items));
    }, [items]);

    useEffect(() => {
        if (selectedItemIdx !== null) {
            sessionStorage.setItem('cotizador_selectedIdx', selectedItemIdx);
        } else {
            sessionStorage.removeItem('cotizador_selectedIdx');
        }
    }, [selectedItemIdx]);

    useEffect(() => {
        sessionStorage.setItem('cotizador_cotizaciones', JSON.stringify(cotizaciones));
    }, [cotizaciones]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setErrorMsg('');
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        setProcessing(true);
        setErrorMsg('');
        setItems([]);
        setSelectedItemIdx(null);
        setCotizaciones({});

        const formData = new FormData();
        formData.append('archivo', file);

        try {
            const res = await api.post('/cotizador/procesar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setItems(res.data.items || []);
            if (res.data.items && res.data.items.length > 0) {
                setSelectedItemIdx(0);
            }
        } catch (err) {
            console.error(err);
            setErrorMsg(err.response?.data?.error || 'Error al procesar el archivo. Verifique el formato e intente de nuevo.');
        } finally {
            setProcessing(false);
        }
    };

    // Al cambiar de ítem o al cargar coincidencias
    useEffect(() => {
        if (selectedItemIdx === null || items.length === 0) return;
        const currentItem = items[selectedItemIdx];

        const cargarAnalisis = async () => {
            setLoadingAnalysis(true);
            setMatches([]);
            setHistorial([]);
            setManualMatches([]);
            setBusquedaManual('');
            setSelectedManualProduct(null);

            try {
                const activeEmpresa = getActiveEmpresa();
                const res = await api.post('/cotizador/buscar-matches', {
                    detalle: currentItem.detalle,
                    empresa: activeEmpresa
                });
                setMatches(res.data.matches || []);
                setHistorial(res.data.historial || []);

                // Si hay coincidencias y no se ha guardado una cotización previa para este ítem,
                // auto-seleccionar la primera coincidencia
                const prevCot = cotizaciones[selectedItemIdx];
                if (prevCot) {
                    setSelectedProductId(prevCot.productoId);
                    setPrecioCotizado(prevCot.precioCotizado);
                    if (prevCot.producto) {
                        setSelectedManualProduct(prevCot.producto);
                    }
                } else if (res.data.matches && res.data.matches.length > 0) {
                    const firstMatch = res.data.matches[0];
                    setSelectedProductId(firstMatch.id);
                    // Sugerir el último precio de licitación ganado si existe, o el precio final de sistema
                    const suggestedPrice = res.data.historial?.[0]?.precio_ganador || firstMatch.precio_final || '';
                    setPrecioCotizado(suggestedPrice);
                } else {
                    setSelectedProductId('');
                    setPrecioCotizado('');
                }
            } catch (err) {
                console.error('Error al cargar análisis de ítem:', err);
            } finally {
                setLoadingAnalysis(false);
            }
        };

        cargarAnalisis();
    }, [selectedItemIdx, items]);

    // Búsqueda manual de productos en caliente
    useEffect(() => {
        if (!busquedaManual || busquedaManual.trim().length < 3) {
            setManualMatches([]);
            return;
        }

        const buscarManual = async () => {
            setSearchingManual(true);
            try {
                // Hacemos una consulta rápida al catálogo del inventario
                const activeEmpresa = getActiveEmpresa();
                const res = await api.get(`/inventario?q=${busquedaManual}&limit=10&empresa=${activeEmpresa}`);
                // Filtrar marcas no comercializables (HLB y HLB PHARMA)
                const filtered = (res.data.data || []).filter(p => {
                    const m = p.marca?.toUpperCase().trim();
                    return m !== 'HLB' && m !== 'HLB PHARMA';
                });
                setManualMatches(filtered);
            } catch (err) {
                console.error(err);
            } finally {
                setSearchingManual(false);
            }
        };

        const delayDebounce = setTimeout(buscarManual, 300);
        return () => clearTimeout(delayDebounce);
    }, [busquedaManual]);

    // Guardar cotización del ítem activo
    const guardarItemCotizacion = () => {
        if (selectedItemIdx === null) return;
        setCotizaciones(prev => ({
            ...prev,
            [selectedItemIdx]: {
                productoId: Number(selectedProductId),
                precioCotizado: Number(precioCotizado) || 0,
                producto: activeProduct
            }
        }));

        // Pasar al siguiente ítem de forma automática si existe
        if (selectedItemIdx < items.length - 1) {
            setSelectedItemIdx(selectedItemIdx + 1);
        }
    };

    // Obtener el producto activo (desde matches automáticos, manuales, o el seleccionado de forma manual)
    const activeProduct = [...matches, ...manualMatches]
        .concat(selectedManualProduct ? [selectedManualProduct] : [])
        .find(p => p.id === Number(selectedProductId)) 
        || matches[0] 
        || null;

    // Clausura Check
    const isBrandClausurada = activeProduct 
        ? (activeProduct.marca?.toUpperCase().trim() === 'HLB' || activeProduct.marca?.toUpperCase().trim() === 'HLB PHARMA')
        : false;

    // Cálculos dinámicos
    const costo = activeProduct ? (activeProduct.costo || 0) : 0;
    const precio = Number(precioCotizado) || 0;
    const margen = costo > 0 ? (((precio - costo) / costo) * 100) : 0;

    // Comparar con el último precio ganador
    const ultimoPrecioGanador = historial?.[0]?.precio_ganador || 0;
    const comparacionGanador = precio > 0 && ultimoPrecioGanador > 0
        ? (precio <= ultimoPrecioGanador ? 'competitivo' : 'caro')
        : 'sin_historial';

    // Exportar todo a Excel
    const handleExport = () => {
        const dataExport = items.map((item, idx) => {
            const cot = cotizaciones[idx];
            const prod = cot ? (cot.producto || [...matches, ...manualMatches, ...items].find(p => p.id === cot.productoId)) : null;
            
            return {
                'Renglón': item.renglon,
                'Cantidad': item.cantidad,
                'Detalle Cotización (Original)': item.detalle,
                'Código Producto': prod ? prod.codigo : '',
                'Detalle Producto (Sistema)': prod ? prod.detalle : '',
                'Marca': prod ? prod.marca : '',
                'Costo': prod ? prod.costo : 0,
                'Precio Final Sistema': prod ? prod.precio_final : 0,
                'Precio Cotizado': cot ? cot.precioCotizado : 0,
                'Subtotal Cotizado': cot ? (cot.precioCotizado * item.cantidad) : 0,
                'Recargo %': (prod && prod.costo > 0 && cot) ? (((cot.precioCotizado - prod.costo) / prod.costo) * 100).toFixed(2) + '%' : '0%'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(dataExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Cotizacion IA');
        
        // Ajustar anchos de columnas
        const maxColWidth = [{wch: 8}, {wch: 10}, {wch: 45}, {wch: 15}, {wch: 45}, {wch: 15}, {wch: 12}, {wch: 15}, {wch: 15}, {wch: 18}, {wch: 10}];
        worksheet['!cols'] = maxColWidth;

        XLSX.writeFile(workbook, `Cotizacion_IA_${Date.now()}.xlsx`);
    };

    // Finalizar cotización (Exporta y limpia toda la memoria del cotizador)
    const handleFinalizar = () => {
        // 1. Exportar
        handleExport();
        // 2. Limpiar todo
        sessionStorage.removeItem('cotizador_items');
        sessionStorage.removeItem('cotizador_selectedIdx');
        sessionStorage.removeItem('cotizador_cotizaciones');
        setItems([]);
        setFile(null);
        setCotizaciones({});
        setSelectedItemIdx(null);
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] overflow-hidden font-sans page-transition">
            
            {/* Cabecera Principal */}
            <header className="bg-white border-b border-slate-100 p-6 shadow-sm z-10 shrink-0">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-100 text-white">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight leading-none mb-1">
                                Cotizador <span className="text-blue-600">Inteligente IA</span>
                            </h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                Análisis automático de cotizaciones médicas cruzado con inventarios y licitaciones históricas
                            </p>
                        </div>
                    </div>

                    {items.length > 0 && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowClearConfirm(true)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider leading-none transition cursor-pointer"
                            >
                                Limpiar
                            </button>
                            <button
                                onClick={handleExport}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider leading-none transition flex items-center gap-2 cursor-pointer"
                            >
                                <FileDown size={14} /> Exportar Parcial
                            </button>
                            <button
                                onClick={() => {
                                    handleFinalizar();
                                    setShowFinalizarSuccess(true);
                                }}
                                className="bg-[#8db92e] hover:bg-[#7ca328] text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider leading-none transition flex items-center gap-2 shadow-md shadow-green-100 cursor-pointer"
                            >
                                <Check size={14} /> Finalizar Cotización
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* CUERPO PRINCIPAL */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                
                {/* 1. VISTA DE CARGA INICIAL */}
                {items.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
                        <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-100 shadow-xl p-8 text-center space-y-6">
                            
                            <div className="bg-blue-50 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                <UploadCloud size={32} />
                            </div>

                            <div>
                                <h2 className="text-xl font-black text-slate-800 uppercase italic">Subir Cotización Médica</h2>
                                <p className="text-xs text-slate-400 font-semibold mt-1">
                                    Soporta planillas de Excel (.xlsx), documentos PDF o imágenes del presupuesto (JPG, PNG).
                                </p>
                            </div>

                            <form onSubmit={handleUpload} className="space-y-6">
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all relative flex flex-col items-center justify-center">
                                    <input 
                                        type="file" 
                                        accept=".xlsx,.xls,.pdf,.png,.jpg,.jpeg" 
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={processing}
                                    />
                                    <Boxes size={36} className="text-slate-300 mb-2" />
                                    <span className="text-xs font-black text-slate-600 uppercase">
                                        {file ? file.name : 'Arrastra o haz clic para seleccionar archivo'}
                                    </span>
                                </div>

                                {errorMsg && (
                                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-500 text-xs font-bold uppercase text-left flex items-start gap-2.5">
                                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                        <span>{errorMsg}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={!file || processing}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white py-4 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg shadow-blue-100 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            La IA está analizando tu documento...
                                        </>
                                    ) : (
                                        'Iniciar Cotización Inteligente'
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* 2. SPLIT-SCREEN ANALIZADOR */}
                {items.length > 0 && (
                    <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                        
                        {/* PANEL IZQUIERDO: LISTA DE RENGLONES */}
                        <div className="w-full md:w-5/12 border-r border-slate-100 bg-white flex flex-col min-h-0">
                            <div className="p-4 border-b border-slate-100 shrink-0 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Ítems detectados en la cotización ({items.length})
                                </span>
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black">
                                    {Object.keys(cotizaciones).length} / {items.length} Cotizados
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800 custom-scrollbar">
                                {items.map((item, idx) => {
                                    const estaCotizado = cotizaciones[idx] !== undefined;
                                    const esSeleccionado = selectedItemIdx === idx;
                                    
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedItemIdx(idx)}
                                            className={`w-full text-left p-4 transition-all flex items-start gap-3 outline-none cursor-pointer ${
                                                esSeleccionado 
                                                    ? 'bg-blue-50/70 border-l-4 border-blue-600' 
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-l-4 border-transparent'
                                            }`}
                                        >
                                            <span className={`text-[10px] font-black px-2 py-1 rounded-md shrink-0 mt-0.5 ${
                                                esSeleccionado 
                                                    ? 'bg-blue-600 text-white' 
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                R. {item.renglon}
                                            </span>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-800 uppercase italic truncate leading-snug">
                                                    {item.detalle}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase">
                                                        Cant: {item.cantidad}
                                                    </span>
                                                    {item.marca && (
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase">
                                                            Marca: {item.marca}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {estaCotizado && (
                                                <div className="bg-green-100 text-green-700 p-1 rounded-full shrink-0">
                                                    <Check size={12} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* PANEL DERECHO: ANALIZADOR DE IA, HISTORIAL Y CALCULADORA */}
                        <div className="flex-1 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col min-h-0 overflow-y-auto p-6 custom-scrollbar space-y-6">
                            
                            {selectedItemIdx !== null && items[selectedItemIdx] && (
                                <>
                                    {/* CABECERA ÍTEM ACTIVO */}
                                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm shrink-0">
                                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                            Renglón Seleccionado: {items[selectedItemIdx].renglon}
                                        </span>
                                        <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight mt-2.5 leading-snug">
                                            {items[selectedItemIdx].detalle}
                                        </h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                                            Cantidad Requerida: <span className="text-slate-800">{items[selectedItemIdx].cantidad} Unidades</span>
                                        </p>
                                    </div>

                                    {/* MAPPING CONTROLLER */}
                                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                                            <Boxes className="text-slate-400" size={16} />
                                            <span className="text-xs font-black text-slate-700 uppercase">
                                                Vincular con Producto de Catálogo
                                            </span>
                                        </div>

                                        {loadingAnalysis ? (
                                            <div className="py-6 flex items-center justify-center gap-2 text-xs font-black text-blue-600 uppercase">
                                                <Loader2 size={16} className="animate-spin" />
                                                Buscando matches en el Inventario...
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                
                                                {/* Selector de Matches Automáticos */}
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                                                        Coincidencias Sugeridas por la IA
                                                    </label>
                                                    {(() => {
                                                        let displayedMatches = [...matches];
                                                        if (selectedManualProduct) {
                                                            displayedMatches = displayedMatches.filter(x => x.id !== selectedManualProduct.id);
                                                            displayedMatches.unshift({
                                                                ...selectedManualProduct,
                                                                seleccionManual: true
                                                            });
                                                        }
                                                        return displayedMatches.length > 0 ? (
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {displayedMatches.map(m => (
                                                                    <button
                                                                        key={m.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedProductId(m.id);
                                                                            if (m.seleccionManual) {
                                                                                setSelectedManualProduct(m);
                                                                            }
                                                                        }}
                                                                        className={`w-full text-left p-3.5 rounded-2xl border text-xs transition-all flex flex-col gap-2 cursor-pointer ${
                                                                            Number(selectedProductId) === m.id
                                                                                ? 'border-blue-500 bg-blue-50/30'
                                                                                : m.seleccionManual
                                                                                    ? 'border-blue-200 bg-blue-50/10 hover:bg-blue-50/20'
                                                                                    : m.matchPerfecto 
                                                                                        ? 'border-green-200 bg-green-50/20 hover:bg-green-50/40'
                                                                                        : 'border-slate-100 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/60'
                                                                        }`}
                                                                    >
                                                                        <div className="flex justify-between items-start w-full gap-3">
                                                                            <div className="min-w-0">
                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                    <p className="font-bold text-slate-800 uppercase italic truncate max-w-[320px] md:max-w-md">{m.detalle}</p>
                                                                                    {m.seleccionManual && (
                                                                                        <span className="bg-blue-100 text-blue-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 tracking-wider">
                                                                                            🛠️ Selección Manual
                                                                                        </span>
                                                                                    )}
                                                                                    {m.matchPerfecto && !m.seleccionManual && (
                                                                                        <span className="bg-green-100 text-green-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 tracking-wider">
                                                                                            ✨ Match Perfecto IA
                                                                                        </span>
                                                                                    )}
                                                                                    {m.seleccionado_anteriormente && (
                                                                                        <span className="bg-[#e0e7ff] text-indigo-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 tracking-wider">
                                                                                            🧠 Entrenado Manual
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">
                                                                                    Cód: {m.codigo} / Marca: {m.marca} / Stock: {m.stock} U.
                                                                                </p>
                                                                            </div>
                                                                            <div className="text-right shrink-0">
                                                                                <span className="font-mono font-bold text-slate-700 block">Costo: ${(m.costo || 0).toLocaleString('es-AR')}</span>
                                                                                <span className="font-mono text-[10px] text-blue-600 font-black">Final: ${(m.precio_final || 0).toLocaleString('es-AR')}</span>
                                                                            </div>
                                                                        </div>
                                                                        {m.seleccionManual && (
                                                                            <p className="text-[10px] text-blue-800 bg-blue-50/50 p-2.5 rounded-xl font-medium italic border border-blue-100/30 w-full leading-relaxed">
                                                                                <strong>Selección Manual:</strong> Vinculado de forma manual por el usuario para corregir el match de la IA.
                                                                            </p>
                                                                        )}
                                                                        {m.matchPerfecto && m.explicacionMatch && !m.seleccionManual && (
                                                                            <p className="text-[10px] text-green-800 bg-green-50/80 p-2.5 rounded-xl font-medium italic border border-green-100/50 w-full leading-relaxed">
                                                                                <strong>Análisis de Equivalencia:</strong> {m.explicacionMatch}
                                                                            </p>
                                                                        )}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-amber-600 font-bold uppercase italic bg-amber-50 p-3 rounded-2xl">
                                                                ⚠️ No se encontraron coincidencias automáticas en el catálogo. Use el buscador manual abajo.
                                                            </p>
                                                        );
                                                    })()}
                                                </div>

                                                {/* Buscador Manual de Repuesto */}
                                                <div className="pt-2 border-t border-slate-50">
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                                                        ¿No es el producto correcto? Buscar manualmente
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            value={busquedaManual}
                                                            onChange={(e) => setBusquedaManual(e.target.value)}
                                                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-100 transition-all uppercase"
                                                            placeholder="Buscar por código o nombre de producto..."
                                                        />
                                                        <Search className="absolute left-3 top-2.5 text-slate-300" size={14} />
                                                    </div>

                                                    {searchingManual && (
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 animate-pulse">
                                                            Buscando...
                                                        </p>
                                                    )}

                                                    {manualMatches.length > 0 && (
                                                        <div className="mt-2 border border-slate-100 bg-white rounded-2xl p-2 max-h-48 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800 custom-scrollbar">
                                                            {manualMatches.map(m => (
                                                                <button
                                                                    key={m.id}
                                                                    type="button"
                                                                    onClick={async () => {
                                                                        setSelectedManualProduct(m);
                                                                        setSelectedProductId(m.id);
                                                                        setBusquedaManual('');
                                                                        setManualMatches([]);

                                                                        // Guardar el entrenamiento de mapeo
                                                                        try {
                                                                            const activeEmpresa = getActiveEmpresa();
                                                                            const currentItem = items[selectedItemIdx];
                                                                            await api.post('/cotizador/guardar-mapeo', {
                                                                                detalleOriginal: currentItem.detalle,
                                                                                codigoInventario: m.codigo,
                                                                                empresa: activeEmpresa
                                                                            });
                                                                        } catch (mapErr) {
                                                                            console.error('Error al guardar entrenamiento de mapeo:', mapErr);
                                                                        }
                                                                    }}
                                                                    className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between text-xs font-bold text-slate-600 cursor-pointer"
                                                                >
                                                                    <span className="uppercase truncate max-w-sm">{m.detalle} ({m.marca})</span>
                                                                    <span className="font-mono text-[10px] text-slate-400 shrink-0">Cód: {m.codigo}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                            </div>
                                        )}
                                    </div>

                                    {/* ALERTA DE CLAUSURA DE MARCA */}
                                    {isBrandClausurada && (
                                        <div className="bg-rose-50 border-2 border-rose-200 p-5 rounded-3xl flex items-start gap-4 animate-bounce shrink-0">
                                            <div className="bg-rose-500 text-white p-2 rounded-2xl shrink-0 shadow-lg shadow-rose-100">
                                                <AlertTriangle size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-rose-800 uppercase italic leading-none mb-1">
                                                    ¡Alerta de Bloqueo de Marca!
                                                </h4>
                                                <p className="text-xs font-bold text-rose-700 uppercase leading-snug">
                                                    La marca del producto asociado ({activeProduct.marca}) se encuentra CLAUSURADA. Queda estrictamente PROHIBIDA su comercialización y cotización en licitaciones.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* HISTORIAL COMPETITIVO */}
                                    {activeProduct && (
                                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                                            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                                                <Award className="text-slate-400" size={16} />
                                                <span className="text-xs font-black text-slate-700 uppercase">
                                                    Historial Competitivo de Licitaciones
                                                </span>
                                            </div>

                                            {loadingAnalysis ? (
                                                <div className="py-4 text-center text-xs text-slate-400 font-bold uppercase animate-pulse">
                                                    Cargando licitaciones previas...
                                                </div>
                                            ) : historial.length > 0 ? (
                                                <div className="space-y-4">
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                                                        Analizando últimas cotizaciones ganadas y perdidas:
                                                    </p>
                                                    <div className="divide-y divide-slate-50 dark:divide-slate-800 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/50">
                                                        {historial.map((hist, idx) => (
                                                            <div 
                                                                key={idx} 
                                                                onClick={() => setSelectedAuditItem(hist)}
                                                                className="p-3.5 text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:bg-blue-50/50 transition-colors cursor-pointer text-left"
                                                            >
                                                                <div>
                                                                    <p className="font-black text-slate-800 uppercase italic">
                                                                        {hist.nombre_hospital} ({hist.nro_proceso})
                                                                    </p>
                                                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                                                        Fecha: {hist.fecha_apertura ? new Date(hist.fecha_apertura).toLocaleDateString('es-AR') : 'S/F'} / Provincia: {hist.segmento_provincia || 'CBA'}
                                                                    </p>
                                                                </div>
                                                                <div className="text-left sm:text-right shrink-0">
                                                                    <p className="font-bold text-slate-600 block">
                                                                        Ganador: {hist.primer_oferente} (${hist.precio_ganador?.toLocaleString('es-AR')})
                                                                    </p>
                                                                    <p className="text-[10px] font-bold mt-1">
                                                                        Nuestra oferta anterior: <span className="font-mono text-slate-500">${(hist.nuestro_pu || hist.mi_pu || hist.mi_pu || 0).toLocaleString('es-AR')}</span>
                                                                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                                                            hist.ganamos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                        }`}>
                                                                            {hist.ganamos ? 'Ganado' : 'Perdido'}
                                                                        </span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 font-bold uppercase italic bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-center">
                                                    No hay antecedentes cargados de licitaciones previas para este producto.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* CALCULADORA DE PRECIO DE COTIZACIÓN */}
                                    {activeProduct && (
                                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
                                            
                                            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                                                <TrendingUp className="text-slate-400" size={16} />
                                                <span className="text-xs font-black text-slate-700 uppercase">
                                                    Calculadora de Cotización y Margen
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Costo Insumo (ARS)</span>
                                                    <span className="text-lg font-mono font-black text-slate-700 mt-1 block">${costo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Último Ganador</span>
                                                    <span className="text-lg font-mono font-black text-slate-700 mt-1 block">
                                                        {ultimoPrecioGanador > 0 ? `$${ultimoPrecioGanador.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : 'S/D'}
                                                    </span>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Stock Total</span>
                                                    <span className="text-lg font-black text-slate-700 mt-1 block">{activeProduct.stock} U.</span>
                                                </div>
                                            </div>

                                            {/* Formulario de simulación de precio */}
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">
                                                        Precio Unitario a Cotizar (ARS)
                                                    </label>
                                                    <div className="relative max-w-xs">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={precioCotizado}
                                                            onChange={(e) => setPrecioCotizado(e.target.value)}
                                                            className="w-full pl-9 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-mono"
                                                            placeholder="0.00"
                                                        />
                                                        <DollarSign className="absolute left-3 top-3.5 text-slate-400" size={16} />
                                                    </div>
                                                </div>

                                                {/* Indicadores de margen en caliente */}
                                                {precio > 0 && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        
                                                        {/* Margen */}
                                                        <div className={`p-4 rounded-2xl border ${
                                                            margen >= 25 
                                                                ? 'bg-green-50 border-green-200 text-green-700' 
                                                                : margen >= 10 
                                                                    ? 'bg-amber-50 border-amber-200 text-amber-700' 
                                                                    : 'bg-rose-50 border-rose-200 text-rose-700'
                                                        }`}>
                                                            <span className="block text-[9px] font-black uppercase tracking-wider opacity-70">Recargo sobre el Costo</span>
                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                <Percent size={14} />
                                                                <span className="text-lg font-black">{margen.toFixed(2)}%</span>
                                                            </div>
                                                            <span className="text-[9px] block mt-1 font-bold">
                                                                {margen >= 25 ? '¡Excelente margen de recargo!' : margen >= 10 ? 'Recargo regular.' : '⚠️ Recargo de riesgo.'}
                                                            </span>
                                                        </div>

                                                        {/* Competitividad */}
                                                        {ultimoPrecioGanador > 0 && (
                                                            <div className={`p-4 rounded-2xl border ${
                                                                comparacionGanador === 'competitivo'
                                                                    ? 'bg-green-50 border-green-200 text-green-700'
                                                                    : 'bg-amber-50 border-amber-200 text-amber-700'
                                                            }`}>
                                                                <span className="block text-[9px] font-black uppercase tracking-wider opacity-70">Posición frente al Ganador</span>
                                                                <span className="text-sm font-black mt-2 block uppercase italic">
                                                                    {comparacionGanador === 'competitivo' ? 'Precio Competitivo' : 'Precio No Competitivo'}
                                                                </span>
                                                                <span className="text-[9px] block mt-1 font-bold">
                                                                    {comparacionGanador === 'competitivo' 
                                                                        ? 'Tu precio es menor/igual al anterior ganador.' 
                                                                        : 'Estás cobrando más caro de lo que cotizó la competencia.'}
                                                                </span>
                                                            </div>
                                                        )}

                                                    </div>
                                                )}
                                            </div>

                                            {/* Confirmar */}
                                            <div className="pt-2">
                                                <button
                                                    onClick={guardarItemCotizacion}
                                                    disabled={!selectedProductId || isBrandClausurada}
                                                    className="w-full bg-slate-900 hover:bg-blue-600 disabled:bg-slate-100 disabled:text-slate-400 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md hover:shadow-blue-100 flex items-center justify-center gap-2 cursor-pointer"
                                                >
                                                    <Check size={14} /> Guardar Precio y Continuar
                                                </button>
                                            </div>

                                        </div>
                                    )}
                                </>
                            )}

                        </div>
                    </div>
                )}
            </div>

            {/* AUDIT MODAL FROM HISTORY - Rendered at root level of page wrapper to fix clipping and backdrop positioning */}
            {selectedAuditItem && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedAuditItem(null)} />
                    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col relative z-10 animate-in zoom-in-95 duration-200">
                        
                        {/* Cabecera */}
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="bg-[#0059a3] text-white p-3 rounded-2xl shadow-lg">
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight leading-none mb-1">
                                        Auditoría de Historial
                                        <span className="text-blue-600"> #{selectedAuditItem.nro_renglon_item}</span>
                                    </h2>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">
                                        Proceso Nro: {selectedAuditItem.nro_proceso}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedAuditItem(null)}
                                className="bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 p-2.5 rounded-full transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Detalle Producto */}
                        <div className="px-8 py-5 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 shrink-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Producto Analizado</p>
                            <h3 className="text-base font-bold text-slate-800 uppercase italic leading-snug">
                                {selectedAuditItem.nombre_detalle}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-tight">
                                {selectedAuditItem.nombre_hospital}
                            </p>
                        </div>

                        {/* Cards det */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <CardDetalle
                                    titulo="1º Oferente"
                                    prov={selectedAuditItem.primer_oferente}
                                    marca={selectedAuditItem.marca_1}
                                    precio={selectedAuditItem.precio_1}
                                    color="oro"
                                />

                                <CardDetalle
                                    titulo="2º Oferente"
                                    prov={selectedAuditItem.segundo_oferente}
                                    marca={selectedAuditItem.marca_2}
                                    precio={selectedAuditItem.precio_2}
                                    color="plata"
                                />

                                <CardDetalle
                      titulo="Nuestra Cotización"
                      prov={(selectedAuditItem.nuestro_pu || selectedAuditItem.mi_pu || selectedAuditItem.mi_pu) > 0 ? "Cotización Propia" : "No Cotizado"}
                      marca={selectedAuditItem.nuestra_marca || selectedAuditItem.mi_marca || selectedAuditItem.mi_marca}
                      precio={selectedAuditItem.nuestro_pu || selectedAuditItem.mi_pu || selectedAuditItem.mi_pu}
                      color="nuestro"
                      dif={calcularDiferencia(selectedAuditItem.nuestro_pu || selectedAuditItem.mi_pu || selectedAuditItem.mi_pu, selectedAuditItem.precio_1)}
                      noCotizado={!(selectedAuditItem.nuestro_pu || selectedAuditItem.mi_pu || selectedAuditItem.mi_pu) || parseFloat(selectedAuditItem.nuestro_pu || selectedAuditItem.mi_pu || selectedAuditItem.mi_pu) === 0}
                    />

                                
                            </div>
                        </div>

                        <div className="px-8 py-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 flex justify-end shrink-0">
                            <button
                                onClick={() => setSelectedAuditItem(null)}
                                className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all"
                            >
                                Cerrar Auditoría
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* MODAL CONFIRMACION DE LIMPIAR */}
            {showClearConfirm && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-white p-8 rounded-[2rem] text-center shadow-2xl animate-in zoom-in duration-300 w-full max-w-md border border-slate-100/50">
                        <div className="bg-amber-50 text-amber-600 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase italic mb-2">¿Limpiar Cotización?</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase leading-relaxed mb-6">
                            ¿Está seguro de que desea limpiar la cotización actual? Se perderán todos los progresos que no hayan sido exportados.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    sessionStorage.removeItem('cotizador_items');
                                    sessionStorage.removeItem('cotizador_selectedIdx');
                                    sessionStorage.removeItem('cotizador_cotizaciones');
                                    setItems([]);
                                    setFile(null);
                                    setCotizaciones({});
                                    setSelectedItemIdx(null);
                                    setShowClearConfirm(false);
                                }}
                                className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-rose-100 cursor-pointer"
                            >
                                Sí, Limpiar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE EXITO FINALIZAR */}
            {showFinalizarSuccess && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-white p-8 rounded-[2rem] text-center shadow-2xl animate-in zoom-in duration-300 w-full max-w-md border border-slate-100/50">
                        <div className="bg-green-50 text-green-600 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                            <CheckCircle size={24} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase italic mb-2">¡Cotización Finalizada!</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase leading-relaxed mb-6">
                            La cotización ha sido finalizada con éxito. El archivo Excel se ha descargado y el cotizador se ha reiniciado para la siguiente carga.
                        </p>
                        <button
                            onClick={() => setShowFinalizarSuccess(false)}
                            className="bg-[#8db92e] hover:bg-[#7ca328] text-white px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-green-100 cursor-pointer"
                        >
                            Aceptar
                        </button>
                    </div>
                </div>
            )}
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
  const tienePrecio = !isNaN(precioNumerico) && precioNumerico > 0;

  const getStyles = () => {
    if (noCotizado) {
      return {
        bg: 'bg-slate-50 dark:bg-slate-800 opacity-40',
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

export default Cotizador;
