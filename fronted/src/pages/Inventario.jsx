import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/api';
import {
    Package,
    Search,
    Filter,
    UploadCloud,
    RefreshCw,
    X,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    DollarSign,
    Boxes,
    FileSpreadsheet,
    Calendar,
    User,
    Tag,
    Layers,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';

const Inventario = () => {
    const puedeImportar = sessionStorage.getItem('userPuedeImportar') === '1' || sessionStorage.getItem('userPuedeImportar') === 'true';

    const [empresaActiva, setEmpresaActiva] = useState('TODAS');
    // Datos y Loading
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        totalArticulos: 0,
        stockTotal: 0,
        valorizadoCosto: 0,
        valorizadoVenta: 0
    });

    // Estado para guardar la variante seleccionada para cada producto agrupado
    const [selectedVariants, setSelectedVariants] = useState({});

    // Filtros y búsqueda
    const [busqueda, setBusqueda] = useState('');
    const [filtroMarca, setFiltroMarca] = useState('');
    const [filtroLinea, setFiltroLinea] = useState('');
    const [marcas, setMarcas] = useState([]);
    const [lineas, setLineas] = useState([]);

    // Paginación
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Modal de Importación
    const [showImportModal, setShowImportModal] = useState(false);
    const [empresaImportar, setEmpresaImportar] = useState('DROGUERIA DEMO');
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState('');
    const [importSuccess, setImportSuccess] = useState('');

    // Fetch de datos de la API
    const fetchDatos = useCallback(async () => {
        setLoading(true);
        try {
            // Obtener lista paginada y filtrada
            const params = new URLSearchParams({
                empresa: empresaActiva,
                page,
                limit,
                q: busqueda,
                marca: filtroMarca,
                linea: filtroLinea
            });

            const res = await api.get(`/inventario?${params.toString()}`);
            setProductos(res.data.data || []);
            setTotal(res.data.total || 0);
            setTotalPages(res.data.totalPages || 1);
            setMarcas(res.data.marcas || []);
            setLineas(res.data.lineas || []);
        } catch (err) {
            console.error('Error al cargar datos del inventario:', err);
        } finally {
            setLoading(false);
        }
    }, [empresaActiva, page, limit, busqueda, filtroMarca, filtroLinea]);

    // Ejecutar fetch al cambiar filtros clave
    useEffect(() => {
        fetchDatos();
    }, [fetchDatos]);

    useEffect(() => {
        setPage(1);
    }, [busqueda, filtroMarca, filtroLinea]);

    // Auto-seleccionar variante si se busca por código exacto
    useEffect(() => {
        if (!busqueda) return;
        const searchClean = busqueda.trim().toLowerCase();
        
        const newSelections = { ...selectedVariants };
        let changed = false;

        productos.forEach(prod => {
            if (prod.codigo.toLowerCase().trim() === searchClean) {
                if (newSelections[prod.detalle] !== prod.id) {
                    newSelections[prod.detalle] = prod.id;
                    changed = true;
                }
            }
        });

        if (changed) {
            setSelectedVariants(newSelections);
        }
    }, [productos, busqueda]);

    // Función para agrupar productos con el mismo nombre (detalle)
    const agruparProductos = (list) => {
        const groups = {};
        list.forEach(item => {
            const key = item.detalle.toUpperCase().trim();
            if (!groups[key]) {
                groups[key] = {
                    detalle: item.detalle,
                    variantes: []
                };
            }
            groups[key].variantes.push(item);
        });
        return Object.values(groups);
    };

    // Manejar subida de archivo para importar
    const handleImportSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setImportError('Por favor seleccione un archivo Excel (.xlsx, .xls) o CSV.');
            return;
        }

        setImporting(true);
        setImportError('');
        setImportSuccess('');

        const formData = new FormData();
        formData.append('archivo', file);

        try {
            const res = await api.post('/inventario/importar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setImportSuccess(res.data.message || 'Importación completada con éxito.');
            setFile(null);
            fetchDatos(); // Refrescar los datos mostrados
            setTimeout(() => {
                setShowImportModal(false);
                setImportSuccess('');
            }, 3000);
        } catch (err) {
            console.error(err);
            setImportError(err.response?.data?.error || 'Error al procesar el archivo. Verifique el formato e intente nuevamente.');
        } finally {
            setImporting(false);
        }
    };

    const productosAgrupados = agruparProductos(productos);

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] overflow-hidden font-sans page-transition">
            
            {/* Cabecera Principal */}
            <header className="bg-white border-b border-slate-100 p-6 shadow-sm z-10 shrink-0">
                <div className="max-w-7xl mx-auto flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        
                        {/* Título de la pestaña */}
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-100 text-white">
                                <Boxes size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-800 uppercase italic tracking-tight leading-none mb-1">
                                    Inventario <span className="text-blue-600">y Costos</span>
                                </h1>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                    Control de stock, códigos de barra y cotizaciones diferenciales
                                </p>
                            </div>
                        </div>

                        {/* Botón de Importación */}
                        {puedeImportar && (
                            <button
                                onClick={() => {
                                    setEmpresaImportar(empresaActiva);
                                    setShowImportModal(true);
                                }}
                                className="bg-slate-900 hover:bg-blue-600 text-white px-5 py-3 rounded-2xl transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider leading-none shadow-md shadow-slate-200 hover:shadow-blue-100 cursor-pointer"
                            >
                                <UploadCloud size={16} />
                                Importar Stock / Precios
                            </button>
                        )}
                    </div>

                    {/* Selector de Empresas Eliminado */}
                </div>
            </header>

            {/* Contenedor Principal de Filtros y Tabla */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                
                {/* FILTROS DE BÚSQUEDA */}
                <div className="bg-[#f8fafc] dark:bg-slate-900/50 px-6 py-4 shrink-0">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        
                        {/* Buscador de Producto */}
                        <div className="relative md:col-span-2 col-span-1">
                            <input
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/30 text-xs font-bold text-slate-600 dark:text-slate-300 transition-all uppercase"
                                placeholder="Buscar por código o nombre..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                            <Search className="absolute left-3 top-3 text-slate-300" size={16} />
                        </div>

                        {/* Filtro por Marca */}
                        <div className="relative col-span-1">
                            <select
                                value={filtroMarca}
                                onChange={(e) => setFiltroMarca(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/30 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase appearance-none cursor-pointer"
                            >
                                <option value="">TODAS LAS MARCAS</option>
                                {marcas.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                            <Tag className="absolute left-3 top-3 text-slate-300" size={16} />
                        </div>

                        {/* Filtro por Línea */}
                        <div className="relative col-span-1">
                            <select
                                value={filtroLinea}
                                onChange={(e) => setFiltroLinea(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-500/30 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase appearance-none cursor-pointer"
                            >
                                <option value="">TODAS LAS LÍNEAS</option>
                                {lineas.map(l => (
                                    <option key={l} value={l}>{l}</option>
                                ))}
                            </select>
                            <Layers className="absolute left-3 top-3 text-slate-300" size={16} />
                        </div>

                    </div>
                </div>

                {/* TABLA DE PRODUCTOS */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
                    <div className="max-w-7xl mx-auto overflow-x-auto rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <table className="w-full min-w-[900px] bg-white dark:bg-slate-900 border-separate border-spacing-0">
                            <thead className="text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-50 dark:border-slate-800 leading-none">
                                <tr>
                                    <th className="sticky top-0 bg-white dark:bg-slate-900 px-6 py-4 text-left border-b border-slate-50 dark:border-slate-800 z-20 rounded-tl-3xl">CÓDIGO</th>
                                    <th className="sticky top-0 bg-white dark:bg-slate-900 px-6 py-4 text-left border-b border-slate-50 dark:border-slate-800 z-20">DETALLE / PRODUCTO</th>
                                    <th className="sticky top-0 bg-white dark:bg-slate-900 px-6 py-4 text-left border-b border-slate-50 dark:border-slate-800 z-20">MARCA / CATEGORÍA</th>
                                    <th className="sticky top-0 bg-white dark:bg-slate-900 px-6 py-4 text-right border-b border-slate-50 dark:border-slate-800 z-20">STOCK</th>
                                    <th className="sticky top-0 bg-white dark:bg-slate-900 px-6 py-4 text-right border-b border-slate-50 dark:border-slate-800 z-20">COSTO (ARS)</th>
                                    <th className="sticky top-0 bg-white dark:bg-slate-900 px-6 py-4 text-right border-b border-slate-50 dark:border-slate-800 z-20 rounded-tr-3xl">PRECIO FINAL</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="text-center py-24 animate-pulse text-blue-600 font-black uppercase text-xs">
                                            Cargando catálogo...
                                        </td>
                                    </tr>
                                ) : productosAgrupados.length > 0 ? (
                                    productosAgrupados.map((group) => {
                                        // Obtener variante activa seleccionada para este grupo
                                        const activeId = selectedVariants[group.detalle] || group.variantes[0]?.id;
                                        const activeVariant = group.variantes.find(v => v.id === activeId) || group.variantes[0];

                                        const marcaLimpia = activeVariant.marca?.toUpperCase().trim() || '';
                                        const isClausurada = marcaLimpia === 'HLB' || marcaLimpia === 'HLB PHARMA';

                                        return (
                                            <tr key={group.detalle} className={`transition-colors ${isClausurada ? 'bg-rose-50/40 dark:bg-rose-900/10 hover:bg-rose-100/30 dark:hover:bg-rose-900/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'}`}>
                                                
                                                {/* CÓDIGO */}
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400 font-bold bg-slate-100/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
                                                        {activeVariant.codigo}
                                                    </span>
                                                </td>

                                                {/* DETALLE */}
                                                <td className="px-6 py-4 leading-normal">
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase italic tracking-tight">
                                                        {group.detalle}
                                                    </p>
                                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
                                                        <Calendar size={10} /> Actualizado: {activeVariant.fecha_actualizacion ? new Date(activeVariant.fecha_actualizacion).toLocaleDateString('es-AR') : 'S/F'}
                                                    </p>
                                                </td>

                                                {/* MARCA (DESPLEGABLE SI HAY MÁS DE UNA VARIANTE) */}
                                                <td className="px-6 py-4 leading-none">
                                                    {group.variantes.length > 1 ? (
                                                        <div className="relative inline-block text-left">
                                                            <select
                                                                value={activeVariant.id}
                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value);
                                                                    setSelectedVariants(prev => ({ ...prev, [group.detalle]: val }));
                                                                }}
                                                                className={`pl-3 pr-8 py-1.5 border rounded-lg text-xs font-bold uppercase appearance-none cursor-pointer outline-none focus:ring-2 ${
                                                                    isClausurada 
                                                                        ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 focus:ring-rose-100'
                                                                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 focus:ring-blue-100/50'
                                                                }`}
                                                            >
                                                                {group.variantes.map(v => {
                                                                    const optMarca = v.marca?.toUpperCase().trim() || '';
                                                                    const isOptClausurada = optMarca === 'HLB' || optMarca === 'HLB PHARMA';
                                                                    return (
                                                                        <option key={v.id} value={v.id}>
                                                                            {v.marca || 'SIN MARCA'} {isOptClausurada ? '⚠️ (CLAUSURADO)' : ''}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>
                                                            <Filter className={`absolute right-2.5 top-2.5 pointer-events-none ${isClausurada ? 'text-rose-500' : 'text-slate-400'}`} size={10} />
                                                        </div>
                                                    ) : (
                                                        <p className={`text-xs font-bold uppercase mb-1 ${isClausurada ? 'text-rose-600' : 'text-slate-600'}`}>
                                                            {activeVariant.marca || 'S/M'}
                                                        </p>
                                                    )}

                                                    {isClausurada && (
                                                        <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/50 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider mt-1.5 w-fit animate-pulse">
                                                            <AlertCircle size={10} className="shrink-0" />
                                                            <span>No Comercializar (Clausurado)</span>
                                                        </div>
                                                    )}

                                                    <p className="text-[10px] font-black text-slate-300 uppercase italic mt-1">
                                                        {activeVariant.linea || 'VARIOS'} / {activeVariant.sublinea || 'VARIOS'}
                                                    </p>
                                                </td>

                                                {/* STOCK */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="inline-flex flex-col items-end">
                                                        <span className={`text-sm font-black ${activeVariant.stock > 0 ? 'text-slate-800 dark:text-slate-200' : 'text-rose-500 dark:text-rose-400'}`}>
                                                            {activeVariant.stock} U.
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                                                            Disp: {activeVariant.disponible}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* COSTO */}
                                                <td className="px-6 py-4 text-right font-mono text-sm font-bold text-slate-700 dark:text-slate-300">
                                                    ${(activeVariant.costo || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                </td>

                                                {/* PRECIO FINAL */}
                                                <td className="px-6 py-4 text-right font-mono text-sm font-black text-blue-600 dark:text-blue-400 italic">
                                                    ${(activeVariant.precio_final || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                                </td>

                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="text-center py-24 text-slate-300 font-black uppercase text-xs italic">
                                            No se encontraron productos en el inventario.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* BARRA DE PAGINACIÓN */}
                <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-10 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <span>
                            Mostrando {productos.length > 0 ? ((page - 1) * limit) + 1 : 0} - {Math.min(page * limit, total)} de {total} productos
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400">Mostrar:</span>
                            <select
                                value={limit}
                                onChange={(e) => {
                                    setLimit(parseInt(e.target.value, 10));
                                    setPage(1);
                                }}
                                className="bg-slate-50 dark:bg-slate-800 border-none rounded-lg px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(1)}
                            disabled={page === 1 || loading}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                        >
                            <ChevronsLeft size={16} />
                        </button>
                        <button
                            onClick={() => setPage(prev => Math.max(1, prev - 1))}
                            disabled={page === 1 || loading}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 dark:text-slate-400 transition-colors flex items-center gap-1 text-xs font-black uppercase cursor-pointer"
                        >
                            <ChevronLeft size={16} /> Anterior
                        </button>

                        <div className="flex items-center px-4 text-xs font-black text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl py-1.5 shadow-inner">
                            Pág {page} / {totalPages || 1}
                        </div>

                        <button
                            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={page === totalPages || totalPages === 0 || loading}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 dark:text-slate-400 transition-colors flex items-center gap-1 text-xs font-black uppercase cursor-pointer"
                        >
                            Siguiente <ChevronRight size={16} />
                        </button>
                        <button
                            onClick={() => setPage(totalPages)}
                            disabled={page === totalPages || totalPages === 0 || loading}
                            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition-colors"
                        >
                            <ChevronsRight size={16} />
                        </button>
                    </div>
                </div>

            </div>

            {/* MODAL DE IMPORTACIÓN (MODAL CENTRADO PREMIUM) */}
            {showImportModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
                        onClick={() => !importing && setShowImportModal(false)}
                    />

                    {/* Card del Modal */}
                    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col relative z-10 animate-in zoom-in-95 duration-200">
                        
                        {/* Cabecera */}
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="bg-[#0059a3] text-white p-2.5 rounded-xl">
                                    <FileSpreadsheet size={20} />
                                </div>
                                <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tight">
                                    Importar Precios y Stock
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowImportModal(false)}
                                disabled={importing}
                                className="bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 p-2 rounded-full transition-all disabled:opacity-50 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Formulario */}
                        <form onSubmit={handleImportSubmit} className="p-8 space-y-6">
                            
                            {/* Selector Eliminado */}

                            {/* Dropzone de archivo */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Archivo Excel (.xlsx, .xls)
                                </label>
                                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 hover:border-blue-400 transition-all relative flex flex-col items-center justify-center">
                                    <input 
                                        type="file" 
                                        accept=".xlsx,.xls,.csv" 
                                        onChange={(e) => {
                                            setFile(e.target.files[0]);
                                            setImportError('');
                                            setImportSuccess('');
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        disabled={importing}
                                    />
                                    <UploadCloud size={40} className="text-slate-300 mb-3" />
                                    <span className="text-xs font-black text-slate-600 uppercase tracking-wide">
                                        {file ? file.name : 'Arrastra o haz clic para subir el archivo'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold mt-1">
                                        Formatos soportados: Excel (.xlsx, .xls)
                                    </span>
                                </div>
                            </div>

                            {/* Alertas */}
                            {importError && (
                                <div className="bg-red-50 text-red-500 border border-red-100 p-4 rounded-2xl flex items-start gap-3">
                                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                                    <p className="text-xs font-bold leading-normal uppercase">{importError}</p>
                                </div>
                            )}

                            {importSuccess && (
                                <div className="bg-green-50 text-green-600 border border-green-100 p-4 rounded-2xl flex items-start gap-3 animate-pulse">
                                    <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                                    <p className="text-xs font-bold leading-normal uppercase">{importSuccess}</p>
                                </div>
                            )}

                            {/* Acciones */}
                            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowImportModal(false)}
                                    disabled={importing}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition flex-1 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={importing || !file}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition flex-1 shadow-md shadow-blue-100 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {importing ? (
                                        <>
                                            <RefreshCw size={14} className="animate-spin" />
                                            Procesando...
                                        </>
                                    ) : (
                                        'Iniciar Importación'
                                    )}
                                </button>
                            </div>

                        </form>

                    </div>

                </div>
            )}

        </div>
    );
};

export default Inventario;
