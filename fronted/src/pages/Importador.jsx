import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { Upload, Loader2, Save, CheckCircle, XCircle, AlertCircle, AlertTriangle, X } from 'lucide-react';

const Importador = ({ setIsDirty }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (setIsDirty) {
      setIsDirty(data !== null && !success);
    }
    const handleBeforeUnload = (e) => {
      if (data !== null && !success) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (setIsDirty) setIsDirty(false);
    };
  }, [data, success, setIsDirty]);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError(null);
    setSuccess(false);
  };

  const triggerError = (msg) => {
    setError(msg);
    // Buscar el contenedor scrollable del importador y hacer scroll suave al inicio
    const container = document.querySelector('.overflow-y-auto');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      // Validar extensión del archivo excel
      const fileExt = droppedFile.name.split('.').pop().toLowerCase();
      if (fileExt === 'xlsx' || fileExt === 'xls') {
        setFile(droppedFile);
        setError(null);
        setSuccess(false);
      } else {
        setError('Formato no válido. Por favor, arrastra un archivo Excel (.xlsx o .xls).');
      }
    }
  };

  const analizar = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('archivo', file);

    try {
      const res = await api.post('/importar/analizar', formData);
      
      let fechaLimpia = res.data.cabecera.fecha_apertura;
      if (fechaLimpia && fechaLimpia.includes('T')) {
          fechaLimpia = fechaLimpia.split('T')[0];
      }

      const dataConProvincia = {
        ...res.data,
        cabecera: {
          ...res.data.cabecera,
          fecha_apertura: fechaLimpia,
          tipo_segmento: res.data.cabecera.tipo_segmento || 'PUBLICO',
          provincia: res.data.cabecera.provincia || 'CBA'
        }
      };
      setData(dataConProvincia);
    } catch (err) {
      triggerError(err.response?.data?.error || 'Error analizando el archivo');
    } finally {
      setLoading(false);
    }
  };

  const editarCabecera = (campo, valor) => {
    setData({
      ...data,
      cabecera: { ...data.cabecera, [campo]: valor }
    });
  };

  const editarRenglon = (i, campo, valor, subcampo = null) => {
    const nuevosRenglones = [...data.renglones];
    if (subcampo) {
      nuevosRenglones[i][campo] = { 
         ...nuevosRenglones[i][campo], 
        [subcampo]: valor 
      };
    } else {
      nuevosRenglones[i][campo] = valor;
    }
    setData({ ...data, renglones: nuevosRenglones });
  };

  const guardar = async () => {
    if (!data) return;

    // VALIDACIONES DE METADATOS OBLIGATORIOS
    if (!data.cabecera?.nro_proceso || data.cabecera.nro_proceso.trim() === '' || data.cabecera.nro_proceso === 'S/D') {
      triggerError('Debe ingresar o controlar el número de proceso.');
      return;
    }
    if (!data.cabecera?.fecha_apertura || data.cabecera.fecha_apertura.trim() === '') {
      triggerError('Debe ingresar la fecha de apertura.');
      return;
    }
    if (!data.cabecera?.hospital || data.cabecera.hospital.trim() === '' || data.cabecera.hospital === 'S/D') {
      triggerError('Debe ingresar el hospital / destinatario.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post('/importar/guardar-masivo', data);
      setSuccess(true);
      setData(null);
      setFile(null);
    } catch (err) {
      triggerError(err.response?.data?.error || 'Error al guardar los datos en SQL Server');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = () => {
    if (data) {
      setShowCancelConfirm(true);
    } else {
      resetImporter();
    }
  };

  const resetImporter = () => {
    setData(null);
    setFile(null);
    setError(null);
    setSuccess(false);
    setShowCancelConfirm(false);
  };

  return (
    <div className="h-full overflow-y-auto p-10 bg-slate-50 dark:bg-slate-950 custom-scrollbar">
      <h1 className="text-3xl font-black mb-6">
        IMPORTAR <span className="text-blue-600">COMPARATIVA</span>
      </h1>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 p-4 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400 animate-in slide-in-from-top shrink-0">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <span className="font-bold flex-1 text-sm">{error}</span>
          <button onClick={() => setError(null)}><XCircle size={18}/></button>
        </div>
      )}

      {/* SECCIÓN DE SUBIDA CON DRAG & DROP */}
      {!data && !success && (
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`bg-white dark:bg-gray-900 p-12 rounded-[2.5rem] shadow-xl text-center border-2 border-dashed transition-all duration-300 ${
            dragActive 
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.02] ring-4 ring-blue-100 dark:ring-blue-900/20' 
              : 'border-slate-200 dark:border-gray-800'
          }`}
        >
          <Upload className={`mx-auto mb-6 transition-transform duration-300 ${dragActive ? 'text-blue-600 scale-110' : 'text-blue-500'}`} size={48} />
          <input
            type="file"
            id="fileInput"
            className="hidden"
            onChange={handleFileChange}
            accept=".xlsx, .xls"
          />
          <div className="flex flex-col items-center gap-4">
            <p className="text-slate-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">
              {dragActive ? "¡Soltá el archivo acá!" : "Arrastrá tu planilla Excel aquí o usá el botón"}
            </p>
            <button
              onClick={() => !file ? document.getElementById('fileInput').click() : analizar()}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-bold transition flex items-center gap-2 shadow-lg disabled:bg-slate-400"
            >
              {loading ? <Loader2 className="animate-spin" /> : file ? "Comenzar Análisis" : "Seleccionar EXCEL"}
            </button>
            {file && (
              <div className="flex items-center gap-2 mt-1 bg-slate-100 dark:bg-gray-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-gray-750">
                <span className="text-sm text-slate-500 dark:text-gray-400 font-semibold">
                  Archivo: <span className="text-blue-600 dark:text-blue-400 font-bold">{file.name}</span>
                </span>
                <button
                  onClick={() => setFile(null)}
                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-950/35 p-0.5 rounded-full transition"
                  title="Quitar archivo"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA PREVIA */}
      {data && (
        <div className="animate-in fade-in duration-500">
          <div className="bg-white p-6 rounded-2xl shadow-md mb-6 border border-slate-200">
            <h2 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Datos del Proceso</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 ml-1">NRO PROCESO</label>
                <input 
                  value={data.cabecera?.nro_proceso || ''} 
                  onChange={(e) => editarCabecera('nro_proceso', e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 ml-1">FECHA APERTURA</label>
                <input 
                  type="date"
                  value={data.cabecera?.fecha_apertura || ''} 
                  onChange={(e) => editarCabecera('fecha_apertura', e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 ml-1 uppercase">
                  Tipo Segmento
                </label>
                <select
                  value={data.cabecera?.tipo_segmento || 'PUBLICO'}
                  onChange={(e) => editarCabecera('tipo_segmento', e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm bg-white"
                >
                  <option value="PUBLICO">PUBLICO</option>
                  <option value="PRIVADO">PRIVADO</option>
                  <option value="MUNICIPALIDAD">MUNICIPALIDAD</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 ml-1 uppercase">
                  Provincia
                </label>
                <select
                  value={data.cabecera?.provincia || 'Córdoba'}
                  onChange={(e) => editarCabecera('provincia', e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm bg-white"
                >
                  <option value="Córdoba">CÓRDOBA</option>
                  <option value="Buenos Aires">BUENOS AIRES</option>
                  <option value="SANTA FE">SANTA FE</option>
                  <option value="MENDOZA">MENDOZA</option>
                  <option value="TUCUMAN">TUCUMÁN</option>
                  <option value="CATAMARCA">CATAMARCA</option>
                  <option value="LA PAMPA">LA PAMPA</option>
                  <option value="ENTRE RIOS">ENTRE RÍOS</option>
                  <option value="SAN JUAN">SAN JUAN</option>
                  <option value="SALTA">SALTA</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 ml-1">HOSPITAL / DESTINATARIO</label>
                <input 
                  value={data.cabecera?.hospital || ''} 
                  onChange={(e) => editarCabecera('hospital', e.target.value)}
                  className="w-full border border-slate-200 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                />
              </div>
            </div>
          </div>

          {/* LISTADO DE RENGLONES */}
          <div className="space-y-4">
            {data.renglones.map((r, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap lg:flex-nowrap gap-4 items-center">
                
                <div className="w-full lg:w-1/3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">R {r.nro_renglon_item}</span>
                    <input
                      value={r.producto || ''}
                      onChange={e => editarRenglon(i, 'producto', e.target.value)}
                      className="font-bold text-slate-700 w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Cant:</span>
                    <input
                      type="number"
                      value={r.cantidad || ''}
                      onChange={e => editarRenglon(i, 'cantidad', parseInt(e.target.value)) || 0}
                      className="text-sm text-slate-500 w-20 outline-none"
                    />
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">1º Oferente (Ganador)</p>
                    <input 
                      className="w-full text-xs font-bold bg-transparent outline-none mb-1"
                      value={r.primer_oferente || ''}
                      onChange={e => editarRenglon(i, 'primer_oferente', e.target.value)}
                    />
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center text-emerald-700 font-black text-sm">
                        <span>$</span>
                        <input 
                          type="number"
                          className="bg-transparent w-full outline-none" 
                          value={r.precio_ganador} 
                          onChange={e => editarRenglon(i, 'precio_ganador', parseFloat(e.target.value))}
                        />
                      </div>
                      <input 
                        className="text-[10px] text-emerald-600 bg-transparent text-right outline-none font-bold" 
                        value={r.marca_ganadora || ''} 
                        onChange={e => editarRenglon(i, 'marca_ganadora', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1">2º Oferente</p>
                    <input 
                      className="w-full text-xs font-bold bg-transparent outline-none mb-1"
                      value={r.segundo_oferente || ''}
                      onChange={e => editarRenglon(i, 'segundo_oferente', e.target.value)}
                    />
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center text-slate-600 font-bold text-sm">
                        <span>$</span>
                        <input 
                          type="number"
                          className="bg-transparent w-full outline-none" 
                          value={r.segundo_pu} 
                          onChange={e => editarRenglon(i, 'segundo_pu', parseFloat(e.target.value))}
                        />
                      </div>
                      <input 
                        className="text-[10px] text-slate-400 bg-transparent text-right outline-none" 
                        value={r.marca_segundo || ''} 
                        onChange={e => editarRenglon(i, 'marca_segundo', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-1/4 flex gap-2">
                  <div className={`p-3 rounded-xl border flex-1 flex flex-col justify-between ${
                    r.mi_cotizacion?.precio > 0 
                      ? (r.primer_oferente && r.primer_oferente.toUpperCase().includes('DROGUERIA DEMO'))
                        ? 'bg-emerald-50 border-emerald-200' 
                        : 'bg-rose-50 border-rose-200'
                      : 'bg-slate-100 border-slate-200 opacity-70'
                  }`}>
                    <div>
                      <p className={`text-[9px] font-black uppercase mb-1 ${
                        r.mi_cotizacion?.precio > 0 
                          ? (r.primer_oferente && r.primer_oferente.toUpperCase().includes('DROGUERIA DEMO'))
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                          : 'text-slate-400'
                      }`}>Nuestra Oferta</p>
                      <p className="text-xs font-bold text-slate-700 truncate">DROGUERIA DEMO</p>
                    </div>
                    
                    <div className="flex justify-between items-end mt-2">
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-bold ${
                          r.mi_cotizacion?.precio > 0 
                            ? (r.primer_oferente && r.primer_oferente.toUpperCase().includes('DROGUERIA DEMO'))
                              ? 'text-emerald-600' 
                              : 'text-rose-600'
                            : 'text-slate-400'
                        }`}>
                          {r.mi_cotizacion?.precio > 0 
                            ? (r.primer_oferente && r.primer_oferente.toUpperCase().includes('DROGUERIA DEMO'))
                              ? '¡GANAMOS!' 
                              : 'PERDIMOS'
                            : 'NO COTIZAMOS'}
                        </span>
                        <div className="flex items-center text-slate-700 font-black text-sm">
                          {r.mi_cotizacion?.precio > 0 ? (
                            <>
                              <span>$</span>
                              <span>{r.mi_cotizacion?.precio}</span>
                            </>
                          ) : (
                            <span>-</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>

          <div className="sticky bottom-6 mt-10 flex justify-center gap-4">
            <button 
              onClick={guardar} 
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl font-bold shadow-2xl flex items-center gap-2 transition transform hover:scale-105 disabled:bg-slate-400"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Confirmar y Guardar</>}
            </button>
            <button 
              onClick={handleCancelClick}
              className="bg-white hover:bg-slate-100 text-slate-500 px-8 py-4 rounded-2xl font-bold shadow-md transition"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* FEEDBACKS */}
      {success && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white p-10 rounded-3xl text-center shadow-2xl animate-in zoom-in duration-300">
            <CheckCircle size={60} className="text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-slate-800 uppercase italic">¡Guardado!</h2>
            <p className="text-slate-500 mb-6 text-sm font-semibold">La comparativa se procesó correctamente en SQL Server.</p>
            <button onClick={() => setSuccess(false)} className="bg-slate-800 hover:bg-slate-950 text-white px-8 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition">Aceptar</button>
          </div>
        </div>
      )}



      {/* MODAL CONFIRMACION CANCELAR PERSONALIZADO */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 animate-in zoom-in duration-300 text-center">
            <div className="bg-amber-50 text-amber-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 border border-amber-100">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase italic mb-2">Descartar Cambios</h3>
            <p className="text-slate-500 text-sm font-semibold mb-6">
              ¿Estás seguro de que deseas descartar los cambios? Perderás todo el progreso actual.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition flex-1"
              >
                No, Volver
              </button>
              <button
                onClick={resetImporter}
                className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-md flex-1"
              >
                Sí, Descartar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Importador;