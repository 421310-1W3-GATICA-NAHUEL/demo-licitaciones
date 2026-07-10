import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/api';
import * as XLSX from 'xlsx';
import {
    Search, Plus, Upload, Edit2, Trash2, Copy, Check,
    ShieldCheck, X, AlertTriangle, Loader2, ChevronLeft,
    ChevronRight, ChevronsLeft, ChevronsRight, FileSpreadsheet,
    ClipboardCheck, Info
} from 'lucide-react';

// ============================
// MODAL DE CONFIRMACION
// ============================
const ModalConfirmacion = ({ titulo, mensaje, onConfirm, onCancel, loading }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
                    <AlertTriangle size={28} className="text-rose-500" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-800">{titulo}</h3>
                    <p className="text-sm text-slate-500 mt-1">{mensaje}</p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                    <button onClick={onCancel} className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all cursor-pointer">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-3 rounded-2xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    </div>
);

// ============================
// MODAL DE FORMULARIO (Crear/Editar)
// ============================
const ModalFormulario = ({ editando, onClose, onSaved }) => {
    const isAdmin = sessionStorage.getItem('userRol') === 'admin';

    const [form, setForm] = useState({
        detalle:       editando?.detalle       || '',
        marca:         editando?.marca         || '',
        pm:            editando?.pm            || '',
        observaciones: editando?.observaciones || ''
    });
    const [loading, setLoading]         = useState(false);
    const [errors, setErrors]           = useState({});           // por campo
    const [isDirty, setIsDirty]         = useState(false);
    const [showDiscardModal, setShowDiscardModal] = useState(false);

    // Autocomplete inventario
    const [detalleQuery, setDetalleQuery]       = useState(editando?.detalle || '');
    const [sugerencias, setSugerencias]         = useState([]);
    const [loadingSuger, setLoadingSuger]       = useState(false);
    const [showSuger, setShowSuger]             = useState(false);
    const detalleRef = useRef(null);
    const sugerRef   = useRef(null);

    // Buscar en inventario al tipear
    useEffect(() => {
        if (!detalleQuery.trim() || detalleQuery.length < 2) {
            setSugerencias([]);
            setShowSuger(false);
            return;
        }
        const t = setTimeout(async () => {
            setLoadingSuger(true);
            try {
                const res = await api.get(`/anmat/productos?q=${encodeURIComponent(detalleQuery)}`);
                const seen = new Set();
                const uniq = (res.data || []).filter(p => {
                    if (seen.has(p.detalle)) return false;
                    seen.add(p.detalle);
                    return true;
                });
                setSugerencias(uniq);
                setShowSuger(uniq.length > 0);
            } catch {
                setSugerencias([]);
            } finally {
                setLoadingSuger(false);
            }
        }, 280);
        return () => clearTimeout(t);
    }, [detalleQuery]);

    // Cerrar sugerencias al clickar afuera
    useEffect(() => {
        const handler = (e) => {
            if (
                detalleRef.current && !detalleRef.current.contains(e.target) &&
                sugerRef.current && !sugerRef.current.contains(e.target)
            ) setShowSuger(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: false }));
        setIsDirty(true);
        if (name === 'detalle') setDetalleQuery(value);
    };

    const handleSelectSugerencia = (prod) => {
        setForm(prev => ({
            ...prev,
            detalle: prod.detalle,
            marca: prod.marca ? prod.marca : prev.marca   // autocompleta marca si viene del inventario
        }));
        setDetalleQuery(prod.detalle);
        setErrors(prev => ({ ...prev, detalle: false, marca: false }));
        setShowSuger(false);
        setIsDirty(true);
    };

    // Intento de cierre: si hay datos sin guardar, pide confirmación
    const handleAttemptClose = () => {
        if (isDirty) {
            setShowDiscardModal(true);
        } else {
            onClose();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Validación por campo
        const newErrors = {
            detalle: !form.detalle.trim(),
            marca:   !form.marca.trim(),
            pm:      !form.pm.trim(),
        };
        setErrors(newErrors);
        if (Object.values(newErrors).some(Boolean)) return;

        setLoading(true);
        try {
            if (editando) {
                await api.put(`/anmat/${editando.id}`, form);
            } else {
                await api.post('/anmat', form);
            }
            setIsDirty(false);
            onSaved(editando ? 'PM actualizado correctamente.' : '¡PM cargado con éxito!');
        } catch (err) {
            setErrors(prev => ({ ...prev, _global: err.response?.data?.error || 'Ocurrió un error inesperado.' }));
        } finally {
            setLoading(false);
        }
    };

    const inputClass = (field) =>
        `w-full px-4 py-3 rounded-2xl border-2 text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 transition-all ${
            errors[field]
                ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/20 focus:ring-rose-200 dark:focus:ring-rose-900 focus:border-rose-500'
                : 'border-slate-200 dark:border-slate-700 focus:ring-[#0059a3]/20 dark:focus:ring-[#0059a3]/40 focus:border-[#0059a3]'
        }`;

    return (
        <>
            {/* Modal de descarte */}
            {showDiscardModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm p-8 border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <AlertTriangle size={24} className="text-amber-500 dark:text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-800 dark:text-slate-100">¿Salir sin guardar?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tenés cambios sin guardar. Si salís ahora se van a perder.</p>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setShowDiscardModal(false)} className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all cursor-pointer text-sm">
                                Seguir editando
                            </button>
                            <button onClick={onClose} className="flex-1 px-4 py-3 rounded-2xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-all cursor-pointer text-sm">
                                Salir igual
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleAttemptClose} />
                <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden max-h-full animate-in fade-in zoom-in duration-200">
                    {/* ENCABEZADO */}
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center sticky top-0 z-20">
                        <div className="flex items-center gap-3">
                            <div className="bg-[#0059a3] text-white p-2.5 rounded-2xl shadow-sm">
                                <FileBox size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight italic">
                                    {editando ? 'Editar PM' : 'Nuevo PM'}
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                    Registro ANMAT
                                </p>
                            </div>
                        </div>
                        <button onClick={handleAttemptClose} className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center transition-all cursor-pointer">
                                <X size={16} className="text-slate-600 dark:text-slate-300" />
                            </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSubmit} className="p-8 space-y-5">
                        {errors._global && (
                            <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 flex items-start gap-3">
                                <AlertTriangle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                                <p className="text-sm text-rose-700 font-medium">{errors._global}</p>
                            </div>
                        )}

                        {/* Detalle con autocomplete */}
                        <div className="space-y-1 relative">
                            <label className={`text-[11px] font-black uppercase tracking-widest ${errors.detalle ? 'text-rose-500' : 'text-slate-500'}`}>
                                Detalle del Producto * {errors.detalle && <span className="normal-case font-semibold">— campo requerido</span>}
                            </label>
                            <div className="relative" ref={detalleRef}>
                                <input
                                    name="detalle"
                                    value={form.detalle}
                                    onChange={handleChange}
                                    onFocus={() => sugerencias.length > 0 && setShowSuger(true)}
                                    placeholder="Buscá en el inventario o escribí el nombre…"
                                    autoComplete="off"
                                    className={inputClass('detalle')}
                                    disabled={!isAdmin}
                                />
                                {loadingSuger && (
                                    <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                                )}
                            </div>

                            {/* Dropdown sugerencias */}
                            {showSuger && sugerencias.length > 0 && (
                                <div ref={sugerRef} className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden max-h-52 overflow-y-auto custom-scrollbar">
                                    {sugerencias.map((prod, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onMouseDown={() => handleSelectSugerencia(prod)}
                                            className="w-full px-4 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between gap-2 border-b border-slate-50 dark:border-slate-700 last:border-0"
                                        >
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{prod.detalle}</span>
                                            {prod.marca && (
                                                <span className="text-xs text-slate-400 shrink-0 font-medium">{prod.marca}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className={`text-[11px] font-black uppercase tracking-widest ${errors.marca ? 'text-rose-500' : 'text-slate-500'}`}>
                                    Marca / Lab. * {errors.marca && <span className="normal-case font-semibold">— requerido</span>}
                                </label>
                                <input
                                    name="marca"
                                    value={form.marca}
                                    onChange={handleChange}
                                    placeholder="Ej: Baxter"
                                    className={inputClass('marca')}
                                    disabled={!isAdmin}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className={`text-[11px] font-black uppercase tracking-widest ${errors.pm ? 'text-rose-500' : 'text-slate-500'}`}>
                                    Número de PM * {errors.pm && <span className="normal-case font-semibold">— requerido</span>}
                                </label>
                                <input
                                    name="pm"
                                    value={form.pm}
                                    onChange={handleChange}
                                    placeholder="Ej: FORM-1234567"
                                    className={inputClass('pm') + ' uppercase font-bold'}
                                    disabled={!isAdmin}
                                />
                            </div>
                        </div>


                        {isAdmin && (
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={handleAttemptClose} className="flex-1 px-4 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all cursor-pointer text-sm">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={loading} className="flex-1 px-4 py-3 rounded-2xl bg-[#0059a3] text-white font-bold hover:bg-[#004a8a] transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer text-sm">
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                    {editando ? 'Guardar Cambios' : 'Crear PM'}
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </>
    );
};


// ============================
// MODAL DE IMPORTACION EXCEL
// ============================
const ModalImportar = ({ onClose, onImported }) => {
    const [file, setFile]           = useState(null);
    const [preview, setPreview]     = useState([]);
    const [allRows, setAllRows]     = useState([]);
    const [loading, setLoading]     = useState(false);
    const [result, setResult]       = useState(null);
    const [error, setError]         = useState('');
    const fileRef = useRef();

    const handleFile = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        setResult(null);
        setError('');

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const wb = XLSX.read(ev.target.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

                // Mapeo flexible de columnas
                const rows = raw.map(row => {
                    const keys = Object.keys(row);
                    const findKey = (name) => keys.find(k => k.toLowerCase().includes(name)) || null;

                    const dKey = findKey('detalle') || findKey('nombre') || findKey('producto');
                    const mKey = findKey('marca')   || findKey('laboratorio');
                    const pKey = findKey('pm')      || findKey('registr');

                    return {
                        detalle: dKey ? String(row[dKey]).trim() : '',
                        marca:   mKey ? String(row[mKey]).trim() : '',
                        pm:      pKey ? String(row[pKey]).trim() : '',
                    };
                }).filter(r => r.detalle && r.marca && r.pm);

                setAllRows(rows);
                setPreview(rows.slice(0, 5));
            } catch {
                setError('No se pudo leer el archivo. Verificá que sea un Excel válido (.xlsx).');
            }
        };
        reader.readAsBinaryString(f);
    };

    const handleImport = async () => {
        if (!allRows.length) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/anmat/importar', { registros: allRows });
            setResult(res.data);
            onImported();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al importar.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-8 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                            <FileSpreadsheet size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white">Importar desde Excel</h2>
                            <p className="text-emerald-200 text-xs">Columnas esperadas: DETALLE · MARCA · PM</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer">
                        <X size={16} className="text-white" />
                    </button>
                </div>

                <div className="p-8 space-y-5">
                    {/* Drop zone */}
                    <div
                        onClick={() => fileRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all group"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-emerald-50 flex items-center justify-center transition-all">
                            <Upload size={22} className="text-slate-400 group-hover:text-emerald-500 transition-all" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-slate-600">{file ? file.name : 'Hacé click para seleccionar el archivo'}</p>
                            <p className="text-xs text-slate-400 mt-0.5">Solo archivos .xlsx o .xls</p>
                        </div>
                        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
                    </div>

                    {/* Previsualización */}
                    {preview.length > 0 && !result && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                                    Previsualización ({allRows.length} registros válidos)
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left font-black text-slate-500 uppercase tracking-wide">Detalle</th>
                                            <th className="px-4 py-2.5 text-left font-black text-slate-500 uppercase tracking-wide">Marca</th>
                                            <th className="px-4 py-2.5 text-left font-black text-slate-500 uppercase tracking-wide">PM</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.map((r, i) => (
                                            <tr key={i} className="border-t border-slate-50 hover:bg-blue-50/30">
                                                <td className="px-4 py-2.5 font-medium text-slate-700 truncate max-w-[180px]">{r.detalle}</td>
                                                <td className="px-4 py-2.5 text-slate-600">{r.marca}</td>
                                                <td className="px-4 py-2.5 font-mono font-bold text-[#0059a3]">{r.pm}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {allRows.length > 5 && (
                                    <div className="px-4 py-2 bg-slate-50 text-xs text-slate-400 text-center border-t border-slate-100">
                                        + {allRows.length - 5} registros más
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Resultado de importación */}
                    {result && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-start gap-3">
                            <ClipboardCheck size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-black text-emerald-800">¡Importación completada!</p>
                                <p className="text-xs text-emerald-700 mt-0.5">{result.message}</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 flex items-start gap-3">
                            <AlertTriangle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-rose-700 font-medium">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all cursor-pointer text-sm">
                            {result ? 'Cerrar' : 'Cancelar'}
                        </button>
                        {!result && allRows.length > 0 && (
                            <button onClick={handleImport} disabled={loading} className="flex-1 px-4 py-3 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer text-sm">
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                Importar {allRows.length} registros
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================
// COMPONENTE PRINCIPAL
// ============================
const AnmatPM = () => {
    const isAdmin = sessionStorage.getItem('userRol') === 'admin';

    const [datos, setDatos]         = useState([]);
    const [loading, setLoading]     = useState(false);
    const [total, setTotal]         = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage]           = useState(1);
    const [limit]                   = useState(50);
    const [busqueda, setBusqueda]   = useState('');
    const [debouncedQ, setDebouncedQ] = useState('');

    const [modalForm, setModalForm]         = useState(false);
    const [editando, setEditando]           = useState(null);
    const [modalImportar, setModalImportar] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [copiedId, setCopiedId]           = useState(null);
    const [toast, setToast]                 = useState('');

    // Debounce búsqueda
    useEffect(() => {
        const t = setTimeout(() => setDebouncedQ(busqueda), 350);
        return () => clearTimeout(t);
    }, [busqueda]);

    const fetchDatos = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ q: debouncedQ, page, limit });
            const res = await api.get(`/anmat?${params}`);
            setDatos(res.data.data);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
        } catch {
            setToast('Error al cargar los datos.');
        } finally {
            setLoading(false);
        }
    }, [debouncedQ, page, limit]);

    useEffect(() => { fetchDatos(); }, [fetchDatos]);

    // Reset page al buscar
    useEffect(() => { setPage(1); }, [debouncedQ]);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const handleCopy = (pm, id) => {
        navigator.clipboard.writeText(pm).then(() => {
            setCopiedId(id);
            showToast(`PM ${pm} copiado al portapapeles`);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    const handleEliminar = async () => {
        if (!confirmDelete) return;
        setDeleteLoading(true);
        try {
            await api.delete(`/anmat/${confirmDelete.id}`);
            showToast('PM eliminado correctamente.');
            setConfirmDelete(null);
            fetchDatos();
        } catch (err) {
            showToast(err.response?.data?.error || 'Error al eliminar.');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleSaved = (msg) => {
        showToast(msg || 'PM guardado correctamente.');
        setModalForm(false);
        setEditando(null);
        fetchDatos();
    };

    const handleImported = () => {
        fetchDatos();
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] overflow-hidden font-sans page-transition">

            {/* TOAST */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[200] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold animate-in slide-in-from-bottom-4 duration-300">
                    <Check size={16} className="text-emerald-400" />
                    {toast}
                </div>
            )}

            {/* MODALES */}
            {(modalForm || editando) && (
                <ModalFormulario
                    editando={editando}
                    onClose={() => { setModalForm(false); setEditando(null); }}
                    onSaved={handleSaved}
                />
            )}
            {modalImportar && (
                <ModalImportar
                    onClose={() => setModalImportar(false)}
                    onImported={handleImported}
                />
            )}
            {confirmDelete && (
                <ModalConfirmacion
                    titulo="¿Eliminar este PM?"
                    mensaje={`Se eliminará el PM de "${confirmDelete.detalle}" — ${confirmDelete.marca}. Esta acción no se puede deshacer.`}
                    onConfirm={handleEliminar}
                    onCancel={() => setConfirmDelete(null)}
                    loading={deleteLoading}
                />
            )}

            {/* HEADER */}
            <header className="bg-white border-b border-slate-100 px-8 py-6 shadow-sm z-20 shrink-0">
                <div className="max-w-7xl mx-auto flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0059a3] to-[#003d6b] flex items-center justify-center shadow-lg shadow-blue-200">
                                <ShieldCheck size={22} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic leading-none">
                                    Base PM ANMAT
                                </h1>
                                <p className="text-sm text-slate-400 font-medium mt-0.5">
                                    Registro de productos medicinales — <span className="font-bold text-slate-600">{total} registros</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {isAdmin && (
                                <button
                                    onClick={() => setModalImportar(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
                                >
                                    <FileSpreadsheet size={16} className="text-emerald-500" />
                                    Importar Excel
                                </button>
                            )}
                            {isAdmin && (
                                <button
                                    onClick={() => { setEditando(null); setModalForm(true); }}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0059a3] text-white font-bold text-sm hover:bg-[#004a8a] transition-all shadow-md shadow-blue-200 cursor-pointer"
                                >
                                    <Plus size={16} />
                                    Nuevo PM
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Búsqueda */}
                    <div className="relative max-w-lg">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            placeholder="Buscar por producto, marca o número de PM…"
                            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0059a3]/30 focus:border-[#0059a3] transition-all bg-slate-50 placeholder:text-slate-400"
                        />
                        {busqueda && (
                            <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-all cursor-pointer">
                                <X size={12} className="text-slate-500" />
                            </button>
                        )}
                    </div>

                    {/* Info copiado */}
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Info size={12} />
                        <span>Hacé click en el número de PM para copiarlo al portapapeles instantáneamente.</span>
                    </div>
                </div>
            </header>

            {/* TABLA */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-24">
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 size={32} className="animate-spin text-[#0059a3]" />
                                <p className="text-sm text-slate-400 font-medium">Cargando registros…</p>
                            </div>
                        </div>
                    ) : datos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center">
                                <ShieldCheck size={32} className="text-slate-300" />
                            </div>
                            <div className="text-center">
                                <p className="text-slate-600 font-bold text-lg">
                                    {busqueda ? 'Sin resultados' : 'No hay PMs cargados'}
                                </p>
                                <p className="text-slate-400 text-sm mt-1">
                                    {busqueda ? 'Probá con otro término de búsqueda.' : 'Importá tu Excel o agregá el primer PM manualmente.'}
                                </p>
                            </div>
                            {!busqueda && isAdmin && (
                                <div className="flex gap-3">
                                    <button onClick={() => setModalImportar(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer">
                                        <FileSpreadsheet size={15} className="text-emerald-500" /> Importar Excel
                                    </button>
                                    <button onClick={() => setModalForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0059a3] text-white font-bold text-sm hover:bg-[#004a8a] transition-all cursor-pointer">
                                        <Plus size={15} /> Agregar PM
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden overflow-x-auto">
                            <table className="w-full min-w-[800px]">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Producto / Detalle</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Marca / Lab.</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Número de PM</th>

                                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {datos.map((row, idx) => (
                                        <tr
                                            key={row.id}
                                            className={`border-b border-slate-50 dark:border-slate-800 hover:bg-blue-50/20 dark:hover:bg-blue-900/20 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30 dark:bg-slate-800/20'}`}
                                        >
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">{row.detalle}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold">
                                                    {row.marca}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleCopy(row.pm, row.id)}
                                                    title="Click para copiar"
                                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-mono font-black text-sm whitespace-nowrap transition-all cursor-pointer ${
                                                        copiedId === row.id
                                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-300 dark:ring-emerald-500/50'
                                                            : 'bg-[#eff6ff] dark:bg-blue-900/30 text-[#0059a3] dark:text-blue-400 hover:bg-[#dbeafe] dark:hover:bg-blue-800/40 hover:ring-2 hover:ring-[#0059a3]/30 dark:hover:ring-blue-500/30'
                                                    }`}
                                                >
                                                    {copiedId === row.id
                                                        ? <Check size={13} />
                                                        : <Copy size={13} />
                                                    }
                                                    {row.pm}
                                                </button>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => { setEditando(row); setModalForm(true); }}
                                                        className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/40 flex items-center justify-center transition-all cursor-pointer"
                                                        title={isAdmin ? 'Editar' : 'Ver detalle'}
                                                    >
                                                        <Edit2 size={14} className="text-[#0059a3] dark:text-blue-400" />
                                                    </button>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => setConfirmDelete(row)}
                                                            className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-800/40 flex items-center justify-center transition-all cursor-pointer"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={14} className="text-rose-500 dark:text-rose-400" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* PAGINACIÓN */}
                    {totalPages > 1 && (
                        <div className="mt-6 flex items-center justify-between text-sm">
                            <p className="text-slate-400 font-medium">
                                Mostrando <span className="font-bold text-slate-700">{(page - 1) * limit + 1}–{Math.min(page * limit, total)}</span> de <span className="font-bold text-slate-700">{total}</span> registros
                            </p>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setPage(1)} disabled={page === 1} className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"><ChevronsLeft size={14} /></button>
                                <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"><ChevronLeft size={14} /></button>
                                <span className="px-4 py-1.5 rounded-xl bg-[#0059a3] text-white font-black text-xs">{page} / {totalPages}</span>
                                <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"><ChevronRight size={14} /></button>
                                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"><ChevronsRight size={14} /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnmatPM;
