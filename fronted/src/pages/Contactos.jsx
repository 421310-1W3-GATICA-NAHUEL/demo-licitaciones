import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Edit, Trash2, Mail, Phone, Building2, MapPin, 
  Check, X, Loader2, Save, AlertTriangle, CheckCircle, Copy
} from 'lucide-react';
import api from '../api/api';

const Contactos = ({ setIsDirty }) => {
  const isAdmin = sessionStorage.getItem('userRol') === 'admin';
  const [contactos, setContactos] = useState([]);
  const [destinatarios, setDestinatarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [provinciaFiltro, setProvinciaFiltro] = useState('TODAS');
  const [copiedField, setCopiedField] = useState(null);

  const handleCopy = (text, fieldId) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedContact, setSelectedContact] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    id_destinatario: '',
    provincia: '',
    telefono: '',
    email: '',
    notas: ''
  });

  // Autocomplete / Predictive Selector State for Hospital Name
  const [hospitalInput, setHospitalInput] = useState('');
  const [filteredDestinatarios, setFilteredDestinatarios] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Toast Success State
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);

  // Fetch contactos
  const fetchContactos = async () => {
    try {
      setLoading(true);
      const res = await api.get('/contactos', {
        params: {
          search: search
        }
      });
      setContactos(res.data);
    } catch (err) {
      console.error("Error al cargar contactos:", err);
      alert("No se pudieron cargar los contactos de hospitales.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch destinatarios for the predictive input
  const fetchDestinatarios = async () => {
    try {
      const res = await api.get('/contactos/destinatarios');
      setDestinatarios(res.data);
    } catch (err) {
      console.error("Error al cargar destinatarios:", err);
    }
  };

  // Fetch on mounts and filters change
  useEffect(() => {
    fetchContactos();
  }, [search]);

  useEffect(() => {
    fetchDestinatarios();
  }, []);

  // Filter destinatarios based on autocomplete input
  useEffect(() => {
    if (!hospitalInput || hospitalInput.trim() === '') {
      setFilteredDestinatarios([]);
      return;
    }

    const filtered = destinatarios.filter(d => 
      d.nombre_hospital.toLowerCase().includes(hospitalInput.toLowerCase()) ||
      (d.provincia && d.provincia.toLowerCase().includes(hospitalInput.toLowerCase()))
    ).slice(0, 10); // Limit dropdown results to 10 for performance

    setFilteredDestinatarios(filtered);
  }, [hospitalInput, destinatarios]);

  // Verificar si hay cambios sin guardar en el formulario
  const isFormDirty = () => {
    if (!isModalOpen) return false;
    if (modalMode === 'create') {
      return !!(formData.id_destinatario || formData.telefono || formData.email || formData.notas);
    } else if (modalMode === 'edit' && selectedContact) {
      return (
        formData.id_destinatario !== (selectedContact.id_destinatario || '') ||
        formData.telefono !== (selectedContact.telefono || '') ||
        formData.email !== (selectedContact.email || '') ||
        formData.notas !== (selectedContact.notas || '')
      );
    }
    return false;
  };

  const dirty = isFormDirty();

  // Controlar antes de cerrar/recargar la pestaña del navegador
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  // Sincronizar el estado dirty con la barra lateral de navegación
  useEffect(() => {
    if (setIsDirty) {
      setIsDirty(dirty);
    }
    return () => {
      if (setIsDirty) {
        setIsDirty(false);
      }
    };
  }, [dirty, setIsDirty]);

  // Controlar el cierre del Toast de éxito
  useEffect(() => {
    if (showSuccessToast) {
      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessToast]);

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setFormData({
      id_destinatario: '',
      provincia: '',
      telefono: '',
      email: '',
      notas: ''
    });
    setHospitalInput('');
    setTriedSubmit(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (contacto) => {
    setModalMode('edit');
    setSelectedContact(contacto);
    setFormData({
      id_destinatario: contacto.id_destinatario || '',
      provincia: contacto.provincia || '',
      telefono: contacto.telefono || '',
      email: contacto.email || '',
      notas: contacto.notas || ''
    });
    setHospitalInput(contacto.nombre_hospital || '');
    setTriedSubmit(false);
    setIsModalOpen(true);
  };

  const handleSelectHospital = (dest) => {
    setFormData(prev => ({
      ...prev,
      id_destinatario: dest.id_destinatario,
      provincia: dest.provincia || ''
    }));
    setHospitalInput(dest.nombre_hospital);
    setShowDropdown(false);
  };

  const handleClearHospital = () => {
    setFormData(prev => ({
      ...prev,
      id_destinatario: '',
      provincia: ''
    }));
    setHospitalInput('');
  };

  const handleCloseModalAttempt = () => {
    if (isFormDirty()) {
      setShowConfirmDiscard(true);
    } else {
      setIsModalOpen(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setTriedSubmit(true);

    // Validation: enforce hospital selection from the official list
    if (!formData.id_destinatario) {
      alert("Debes seleccionar un hospital oficial de la lista autocompletable. No se permiten nombres de hospital inventados.");
      return;
    }

    // Validation: email is strictly required
    if (!formData.email || formData.email.trim() === '') {
      alert("Por favor, completá el Correo Electrónico. Este campo es obligatorio.");
      return;
    }

    try {
      setSubmitting(true);
      if (modalMode === 'create') {
        await api.post('/contactos', formData);
        setToastMessage('¡Contacto guardado con éxito!');
      } else {
        await api.put(`/contactos/${selectedContact.id_contacto}`, formData);
        setToastMessage('¡Contacto actualizado con éxito!');
      }
      setIsModalOpen(false);
      setShowSuccessToast(true);
      fetchContactos();
    } catch (err) {
      console.error("Error al guardar contacto:", err);
      alert(err.response?.data?.message || "Ocurrió un error al guardar el contacto.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContacto = (contacto) => {
    setContactToDelete(contacto);
    setShowConfirmDelete(true);
  };

  // Obtener provincias únicas
  const provinciasUnicas = ['TODAS', ...new Set(contactos.map(c => c.provincia).filter(Boolean))];

  // Filtrar localmente por provincia
  const contactosFiltrados = contactos.filter(c => {
    if (provinciaFiltro === 'TODAS') return true;
    return c.provincia === provinciaFiltro;
  });

  return (
    <div className="h-full flex flex-col bg-slate-50/50 p-6 overflow-y-auto relative">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-wider italic flex items-center gap-2">
            <Building2 className="text-[#0059a3]" /> Contactos de Hospitales
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Directorio oficial para comunicación rápida con instituciones y destinatarios registrados.
          </p>
        </div>

        {isAdmin && (
          <button 
            onClick={handleOpenCreateModal}
            className="bg-gradient-to-r from-blue-600 to-[#0059a3] hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/10 transition-all text-sm cursor-pointer"
          >
            <Plus size={16} /> Nuevo Contacto
          </button>
        )}
      </div>

      {/* FILTER AND SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6 shrink-0">
        
        {/* Provincia selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Provincia:</label>
          <select 
            value={provinciaFiltro}
            onChange={(e) => setProvinciaFiltro(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:border-[#0059a3] outline-none transition-all"
          >
            {provinciasUnicas.map(prov => (
              <option key={prov} value={prov}>
                {prov === 'TODAS' ? 'Todas' : prov}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Buscar por hospital, email, teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-[#0059a3] rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0059a3] transition-all"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* CONTACTS GRID / LIST CONTAINER */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#0059a3] mb-4" size={40} />
          <p className="text-sm font-bold text-slate-500">Cargando directorio de contactos...</p>
        </div>
      ) : contactosFiltrados.length === 0 ? (
        <div className="flex-1 bg-white border border-slate-100 rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
          <Building2 size={48} className="text-slate-300 mb-4" />
          <h3 className="text-base font-bold text-slate-700">No se encontraron contactos</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Prueba a cambiar los filtros o agrega un nuevo contacto presionando el botón superior.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contactosFiltrados.map((c) => (
            <div 
              key={c.id_contacto}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Upper row: Quick Edit/Delete buttons */}
                <div className="flex justify-end items-start gap-2 mb-2">
                  {isAdmin && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenEditModal(c)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar contacto"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteContacto(c)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar contacto"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Hospital info */}
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 line-clamp-1 mb-1" title={c.nombre_hospital}>
                  {c.nombre_hospital || "Hospital Sin Asignar"}
                </h3>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
                  <MapPin size={10} />
                  <span>{c.provincia || 'S/D'}</span>
                  {c.segmento_provincia && (
                    <>
                      <span>•</span>
                      <span>{c.segmento_provincia}</span>
                    </>
                  )}
                </div>

                {/* Separator line */}
                <div className="border-t border-slate-50 dark:border-slate-800/60 my-3"></div>

                <div className="space-y-2 mt-2">
                  {c.email && (
                    <div className="flex items-center justify-between group/copy">
                      <a 
                        href={`https://mail.google.com/mail/?view=cm&fs=1&to=${c.email}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#0059a3] transition-colors truncate"
                      >
                        <Mail size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </a>
                      <button 
                        onClick={() => handleCopy(c.email, `email-${c.id_contacto}`)}
                        className="p-1 text-slate-300 hover:text-[#0059a3] hover:bg-slate-100 rounded opacity-0 group-hover/copy:opacity-100 transition-all cursor-pointer shrink-0"
                        title="Copiar email"
                      >
                        {copiedField === `email-${c.id_contacto}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                  )}
                  {c.telefono && (
                    <div className="flex items-center justify-between group/copy">
                      <a 
                        href={`tel:${c.telefono}`}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#0059a3] transition-colors truncate"
                      >
                        <Phone size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{c.telefono}</span>
                      </a>
                      <button 
                        onClick={() => handleCopy(c.telefono, `tel-${c.id_contacto}`)}
                        className="p-1 text-slate-300 hover:text-[#0059a3] hover:bg-slate-100 rounded opacity-0 group-hover/copy:opacity-100 transition-all cursor-pointer shrink-0"
                        title="Copiar teléfono"
                      >
                        {copiedField === `tel-${c.id_contacto}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes footer */}
              {c.notas && (
                <div className="mt-4 p-2 bg-slate-50/80 dark:bg-slate-800/40 rounded-lg text-[10px] font-semibold text-slate-500 dark:text-slate-400 border border-slate-100/50 dark:border-slate-700/50 italic line-clamp-2">
                  {c.notas}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in duration-300">
            
            {/* Modal header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider italic">
                  {modalMode === 'create' ? 'Agregar Contacto' : 'Editar Contacto'}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                  Complete los campos para registrar o actualizar el contacto del hospital.
                </p>
              </div>
              <button 
                onClick={handleCloseModalAttempt}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* official hospital predictive search */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Hospital / Destinatario Oficial <span className="text-red-500">*</span>
                </label>
                
                <div className="relative">
                  <input 
                    type="text"
                    value={hospitalInput}
                    onChange={(e) => {
                      setHospitalInput(e.target.value);
                      setShowDropdown(true);
                      if (formData.id_destinatario) {
                        setFormData(prev => ({ ...prev, id_destinatario: '', provincia: '' }));
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Escriba para buscar el hospital oficial..."
                    className={`w-full pl-3 pr-10 py-2 border rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none transition-all ${
                      formData.id_destinatario 
                        ? 'border-emerald-300 bg-emerald-50/10 focus:border-emerald-400 focus:ring-emerald-400'
                        : 'border-slate-200 focus:border-[#0059a3] focus:ring-1 focus:ring-[#0059a3]'
                    }`}
                  />
                  
                  {hospitalInput && (
                    <button 
                      type="button"
                      onClick={handleClearHospital}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Checked Badge indicating conforming name selection */}
                {formData.id_destinatario && (
                  <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50/50 border border-emerald-100 px-2 py-0.5 rounded-md self-start w-fit">
                    <Check size={10} /> Nombre de Hospital Confirmado y Registrado
                  </div>
                )}

                {/* Dropdown with results */}
                {showDropdown && filteredDestinatarios.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)}></div>
                    <ul className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-150 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-50 py-1">
                      {filteredDestinatarios.map(d => (
                        <li key={d.id_destinatario}>
                          <button
                            type="button"
                            onClick={() => handleSelectHospital(d)}
                            className="w-full text-left px-3.5 py-2 hover:bg-blue-50 text-slate-700 text-xs font-semibold flex flex-col"
                          >
                            <span className="font-bold text-slate-850 truncate">{d.nombre_hospital}</span>
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-0.5">
                              {d.provincia || 'S/D'} • {d.tipo_segmento || 'General'}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* If typing but no matches */}
                {showDropdown && hospitalInput.trim() !== '' && !formData.id_destinatario && filteredDestinatarios.length === 0 && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)}></div>
                    <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-20 p-3 text-center text-xs font-bold text-slate-500">
                      Ningún hospital oficial coincide con la búsqueda.
                    </div>
                  </>
                )}
              </div>

              {/* Readonly Province */}
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Provincia (Autocompletado)
                </label>
                <input 
                  type="text"
                  disabled
                  value={formData.provincia || 'S/D'}
                  className="w-full px-3 py-2 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400 focus:outline-none"
                />
              </div>

              {/* Email & Phone row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Correo Electrónico <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Ej. compras@hospital.org"
                    className={`w-full px-3 py-2 border bg-white dark:bg-slate-900 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none transition-all ${
                      triedSubmit && (!formData.email || formData.email.trim() === '')
                        ? 'border-rose-500 bg-rose-50/10 focus:border-rose-500 focus:ring-rose-500'
                        : 'border-slate-200 dark:border-slate-700 focus:border-[#0059a3] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#0059a3] dark:focus:ring-blue-500'
                    }`}
                  />
                  {triedSubmit && (!formData.email || formData.email.trim() === '') && (
                    <span className="text-[10px] text-rose-600 font-bold mt-1 block">El correo electrónico es obligatorio.</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Teléfono / Interno
                  </label>
                  <input 
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                    placeholder="Ej. +54 9 11 1234-5678"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-[#0059a3] dark:focus:border-blue-500 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#0059a3] dark:focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Notas u Observaciones
                </label>
                <textarea 
                  rows={3}
                  value={formData.notas}
                  onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Ej. Horario de atención comercial de 8 a 13hs. Exclusivo licitaciones."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-[#0059a3] dark:focus:border-blue-500 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#0059a3] dark:focus:ring-blue-500 transition-all resize-none"
                />
              </div>

              {/* Footer actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50 -mx-6 -mb-6 p-6">
                <button 
                  type="button"
                  onClick={handleCloseModalAttempt}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  {submitting && <Loader2 className="animate-spin" size={12} />}
                  <span>{modalMode === 'create' ? 'Guardar Contacto' : 'Actualizar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING SUCCESS TOAST */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white py-4 px-6 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-800 animate-in slide-in-from-bottom duration-300 z-[250]">
          <CheckCircle className="text-emerald-500" size={20} />
          <span className="text-xs font-bold uppercase tracking-wider">{toastMessage}</span>
          <button onClick={() => setShowSuccessToast(false)} className="text-slate-400 hover:text-white font-black text-xs ml-2">×</button>
        </div>
      )}

      {/* MODAL PREMIUM DE CONFIRMACIÓN DE DESCARTAR CAMBIOS */}
      {showConfirmDiscard && (
        <div className="fixed inset-0 bg-slate-905/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 p-8 shadow-2xl animate-in zoom-in duration-300 text-center">
            <div className="bg-amber-50 text-amber-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 border border-amber-100">
              <AlertTriangle size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase italic mb-2">¿Descartar Cambios?</h3>
            <p className="text-slate-500 text-sm font-semibold mb-6">
              Tenés campos modificados en el formulario de contacto. Si salís ahora, perderás todo el progreso sin guardar.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setShowConfirmDiscard(false);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-650 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowConfirmDiscard(false);
                  setIsModalOpen(false);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition flex-1 animate-pulse"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREMIUM DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {showConfirmDelete && contactToDelete && (
        <div className="fixed inset-0 bg-slate-905/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 p-8 shadow-2xl animate-in zoom-in duration-300 text-center">
            <div className="bg-rose-50 text-rose-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 border border-rose-100">
              <Trash2 size={28} />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase italic mb-2">¿Eliminar Contacto?</h3>
            <p className="text-slate-500 text-sm font-semibold mb-6">
              ¿Estás seguro de que deseas eliminar el contacto del hospital <span className="font-bold text-slate-700">"{contactToDelete.nombre_hospital}"</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setShowConfirmDelete(false);
                  setContactToDelete(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-650 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition flex-1 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const target = contactToDelete;
                  setShowConfirmDelete(false);
                  setContactToDelete(null);
                  try {
                    await api.delete(`/contactos/${target.id_contacto}`);
                    setToastMessage('Contacto eliminado correctamente.');
                    setShowSuccessToast(true);
                    fetchContactos();
                  } catch (err) {
                    console.error("Error al eliminar contacto:", err);
                    alert("No se pudo eliminar el contacto.");
                  }
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition flex-1 cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Contactos;
