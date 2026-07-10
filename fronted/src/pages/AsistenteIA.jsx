import React, { useState, useEffect, useRef } from 'react';
import api from '../api/api';
import { Send, Bot, User, Sparkles, BrainCircuit, Building2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const AsistenteIA = () => {
    const [empresa, setEmpresa] = useState(() => {
        return sessionStorage.getItem('asistente_empresa') || sessionStorage.getItem('userEmpresaAcceso') || 'NUESTRA EMPRESA';
    });
    const [input, setInput] = useState('');
    const [mensajes, setMensajes] = useState([]);
    const [cargando, setCargando] = useState(false);
    const scrollRef = useRef(null);

    // Obtener nombre del usuario de la sesión
    const getNombreUsuario = () => {
        const fullNombre = sessionStorage.getItem('userName');
        if (fullNombre) {
            return fullNombre.split(' ')[0];
        }
        const email = sessionStorage.getItem('userEmail');
        if (email) {
            return email.split('@')[0];
        }
        return 'Colega';
    };

    const nombreUsuario = getNombreUsuario();

    // Inicializar chat cuando cambia la empresa
    useEffect(() => {
        if (empresa) {
            sessionStorage.setItem('asistente_empresa', empresa);
            const empresaNombre = 'Nuestra Empresa';
            setMensajes([
                { 
                    role: 'assistant', 
                    content: `¡Hola, **${nombreUsuario}**! He configurado mi sistema para buscar exclusivamente en **${empresaNombre}**. 

Soy tu asistente experto en medicamentos, insumos médicos de alta complejidad y licitaciones públicas en Argentina. ¿Qué **licitación**, **hospital** o **producto** médico querés que analicemos hoy para estructurar una estrategia ganadora?` 
                }
            ]);
        } else {
            sessionStorage.removeItem('asistente_empresa');
            setMensajes([]);
        }
    }, [empresa]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mensajes]);

    const enviarMensaje = async () => {
        if (!input.trim() || cargando || !empresa) return;
        const userMsg = input;
        setInput('');
        setMensajes(prev => [...prev, { role: 'user', content: userMsg }]);
        setCargando(true);

        try {
            const res = await api.post('/ia/consultar', { 
                mensaje: userMsg,
                userName: sessionStorage.getItem('userName') || sessionStorage.getItem('userEmail') || 'Usuario',
                empresa: 'NUESTRA EMPRESA'
            });
            setMensajes(prev => [...prev, { role: 'assistant', content: res.data.respuestaIA }]);
        } catch (err) {
            setMensajes(prev => [...prev, { role: 'assistant', content: 'Perdón, hubo un error al conectar con el asistente de IA.' }]);
        } finally {
            setCargando(false);
        }
    };

    const cambiarEmpresa = () => {
        setEmpresa(null);
    };

    // --- PANTALLA DE SELECCIÓN DE EMPRESA (Si empresa es null) ---
    

    // --- PANTALLA DE CHAT ACTIVA ---
    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-50 p-4 lg:p-6 page-transition">
            <div className="max-w-5xl mx-auto w-full flex flex-col h-full">
                
                {/* Header Dinámico con Selector */}
                <div className="flex items-center justify-between mb-4 px-6 bg-white py-4 rounded-[2rem] shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-2xl shadow-lg ${
                            true 
                            ? 'bg-blue-600 shadow-blue-100 text-white' 
                            : 'bg-indigo-600 shadow-indigo-100 text-white'
                        }`}>
                            <BrainCircuit size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-800 leading-none tracking-tight">
                                Asistente IA
                            </h2>
                            <p className={`text-[10px] font-extrabold uppercase tracking-widest mt-1 ${
                                'text-blue-600'
                            }`}>
                                Modo Asistente
                            </p>
                        </div>
                    </div>

                </div>

                {/* Chat */}
                <div className="flex-1 overflow-y-auto space-y-6 mb-4 p-6 lg:p-8 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 custom-scrollbar">
                    {mensajes.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] lg:max-w-[75%] p-5 rounded-3xl ${
                                m.role === 'user' 
                                ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-100' 
                                : 'bg-slate-50 text-slate-700 rounded-tl-none border border-slate-100'
                            }`}>
                                <div className="flex gap-3">
                                    {m.role === 'assistant' && <Sparkles size={16} className="text-blue-500 shrink-0 mt-1" />}
                                    <div className={`prose prose-sm max-w-none ${m.role === 'user' ? 'prose-invert' : 'prose-slate'} text-[14px] font-medium leading-relaxed`}>
                                        <ReactMarkdown>{m.content}</ReactMarkdown>
                                    </div>
                                    {m.role === 'user' && <User size={16} className="text-blue-200 shrink-0 mt-1" />}
                                </div>
                            </div>
                        </div>
                    ))}
                    {cargando && (
                        <div className="flex justify-start items-center gap-3 ml-2 text-slate-400 font-black text-[10px] uppercase tracking-tighter">
                            <div className="flex gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${'bg-blue-600'}`}></span>
                                <span className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s] ${'bg-blue-600'}`}></span>
                                <span className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.4s] ${'bg-blue-600'}`}></span>
                            </div>
                            Consultando Base de Datos SQL...
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>

                {/* Input Area */}
                <div className="bg-white p-2.5 rounded-[2rem] shadow-lg border border-slate-100 flex gap-2">
                    <input 
                        className="flex-1 px-5 py-2.5 outline-none font-bold text-slate-600 bg-transparent text-sm placeholder:text-slate-300"
                        placeholder={'Ej: Proceso 26001072'}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && enviarMensaje()}
                        disabled={cargando}
                    />
                    <button 
                        onClick={enviarMensaje}
                        disabled={cargando || !input.trim()}
                        className={`text-white p-3.5 rounded-2xl hover:brightness-110 transition-all active:scale-95 shadow-md ${
                            true 
                            ? 'bg-blue-600 shadow-blue-100' 
                            : 'bg-indigo-600 shadow-indigo-100'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AsistenteIA;