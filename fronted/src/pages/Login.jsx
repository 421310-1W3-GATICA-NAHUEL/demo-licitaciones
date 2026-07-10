import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Activity, ArrowRight, ShieldCheck, User, Loader2, Copy, Check } from 'lucide-react';
import * as THREE from 'three';

const Login = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState(''); 
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [copiedField, setCopiedField] = useState(null);
  const navigate = useNavigate();

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Polling check for admin approval
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.post('/auth/solicitar-codigo', { email });
        if (res.data.codigoEnviado) {
          setIsPolling(false);
          setError('');
          showToast("¡Solicitud aprobada! Ingresa el código enviado a tu correo.", "success");
          setStep(2);
        } else if (res.data.usuarioExistente) {
          setIsPolling(false);
          setError('');
          showToast("Tu cuenta ya está activa. Ingresa tu contraseña.", "success");
          setStep(3);
        }
      } catch (err) {
        // Ignorar errores temporales durante el polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isPolling, email]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('expirada') === 'true') {
      setError('Tu sesión expiró por seguridad. Por favor, ingresá de nuevo.');
    }
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  // Three.js Background Animation
  useEffect(() => {
    let animationFrameId;
    const canvas = document.getElementById('three-bg-canvas');
    if (!canvas) return;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 1000;
    camera.position.y = 400;

    // Particle params
    const SEPARATION = 70;
    const AMOUNTX = 60;
    const AMOUNTY = 60;
    const numParticles = AMOUNTX * AMOUNTY;

    const positions = new Float32Array(numParticles * 3);
    const colors = new Float32Array(numParticles * 3);

    // Initial positions and colors
    let i = 0;
    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        // Position
        positions[i] = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2; // x
        positions[i + 1] = 0; // y
        positions[i + 2] = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2; // z

        // Color gradient: cyan to dark blue
        const ratioX = ix / AMOUNTX;
        const ratioY = iy / AMOUNTY;
        colors[i] = 0.0;                 // r
        colors[i + 1] = 0.3 + ratioX * 0.5; // g
        colors[i + 2] = 0.6 + ratioY * 0.4; // b

        i += 3;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Circular glowing texture generator
    const generateCircleTexture = () => {
      const c = document.createElement('canvas');
      c.width = 16;
      c.height = 16;
      const ctx = c.getContext('2d');
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.3, 'rgba(0,186,255,0.8)');
      grad.addColorStop(0.6, 'rgba(0,90,255,0.2)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 16);
      return new THREE.CanvasTexture(c);
    };

    const material = new THREE.PointsMaterial({
      size: 15,
      map: generateCircleTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Mouse movement listeners for Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onPointerMove = (event) => {
      mouseX = event.clientX - window.innerWidth / 2;
      mouseY = event.clientY - window.innerHeight / 2;
    };

    window.addEventListener('pointermove', onPointerMove);

    // Resize listener
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', onWindowResize);

    // Anim loop
    let count = 0;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth camera interpolation towards mouse targets
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      camera.position.x = targetX * 1.5;
      camera.position.y = 400 + (-targetY * 1.5);
      camera.lookAt(new THREE.Vector3(0, 0, 0));

      // Animate wave points
      const positionAttr = geometry.attributes.position;
      let idx = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          const y = Math.sin((ix + count) * 0.2) * 55 + Math.sin((iy + count) * 0.3) * 55;
          positionAttr.array[idx + 1] = y;
          idx += 3;
        }
      }
      positionAttr.needsUpdate = true;

      // Spin wave slightly
      particles.rotation.y = count * 0.02;

      renderer.render(scene, camera);
      count += 0.04;
    };

    animate();

    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onWindowResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  // --- PASO 1: SOLICITAR CÓDIGO ---
  const handleSolicitarCodigo = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/solicitar-codigo', { email });
      
      if (res.data.usuarioExistente) {
        setStep(3); // Login directo
      } else if (res.data.pendienteAprobacion) {
        setIsPolling(true);
        showToast("Tu solicitud está pendiente de aprobación.", "info");
      } else if (res.data.codigoEnviado) {
        setStep(2); // Registro (ya tiene código enviado)
        showToast("Tu cuenta fue aprobada. Ingresá el código enviado a tu correo.", "success");
      } else {
        setStep(2); // Registro nuevo (pedirá aprobación)
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error al validar el dominio");
    } finally {
      setLoading(false);
    }
  };

  // --- PASO 2: ESTABLECER PASSWORD Y NOMBRE ---
  const handleEstablecerPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/establecer-password', { email, codigo, password, nombre });
      showToast("¡Cuenta verificada! Ahora podés ingresar.", "success");
      setStep(3); 
    } catch (err) {
      setError(err.response?.data?.message || "Error en el registro");
    } finally {
      setLoading(false);
    }
  };

  // --- PASO 3: LOGIN FINAL ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      
      sessionStorage.setItem('userEmail', res.data.user.email);
      sessionStorage.setItem('userName', res.data.user.nombre); 
      sessionStorage.setItem('userRol', res.data.user.rol);
      sessionStorage.setItem('userEmpresaAcceso', res.data.user.empresa_acceso);
      sessionStorage.setItem('userPuedeImportar', res.data.user.puede_importar);
      sessionStorage.setItem('userFotoPerfil', res.data.user.foto_perfil || '');
      
      navigate('/', { replace: true });
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || "Contraseña incorrecta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center p-4 min-h-screen bg-slate-950 overflow-hidden font-sans select-none">
      
      {/* Custom Glassmorphic Toast Notification */}
      {toast.show && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md px-6 py-3.5 rounded-2xl shadow-xl border text-xs font-black uppercase tracking-widest flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${
          toast.type === 'success' 
            ? 'border-emerald-500/30 text-emerald-400' 
            : toast.type === 'info' 
            ? 'border-blue-500/30 text-blue-400' 
            : 'border-rose-500/30 text-rose-400'
        }`}>
          <span className={`h-2 w-2 rounded-full ${
            toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'info' ? 'bg-blue-500' : 'bg-rose-500'
          }`}></span>
          {toast.message}
        </div>
      )}

      {/* 3D Canvas Background */}
      <canvas id="three-bg-canvas" className="absolute inset-0 w-full h-full z-0 block pointer-events-none" />

      {/* Dark space gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-950/30 via-slate-950/80 to-slate-950/60 z-0 pointer-events-none" />

      {/* Wrapper for Login and Demo Box */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full min-h-screen px-4">
        
        {/* Demo Credentials Box */}
        <div className="lg:absolute lg:bottom-8 lg:left-8 bg-slate-900/60 backdrop-blur-3xl p-6 rounded-[2rem] shadow-2xl border border-blue-500/20 text-white w-full max-w-[320px] order-2 lg:order-none mt-8 lg:mt-0 transition-all duration-300 hover:border-blue-400/40 z-20">
          <h3 className="text-lg font-black mb-3 uppercase tracking-wider text-blue-400 italic">Versión Demo</h3>
          <p className="text-xs font-semibold text-blue-200/80 mb-5 leading-relaxed">
            Podés explorar la plataforma utilizando las siguientes credenciales de prueba:
          </p>
          <div className="space-y-1 bg-black/40 p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between group py-1">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 block mb-1">Email</span>
                <span className="text-sm font-bold text-white">admin@drogueria.local</span>
              </div>
              <button 
                type="button"
                onClick={() => handleCopy('admin@drogueria.local', 'email')}
                className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/30 border border-blue-500/20 text-blue-400 transition-all active:scale-95 cursor-pointer"
                title="Copiar email"
              >
                {copiedField === 'email' ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              </button>
            </div>
            <div className="h-px w-full bg-white/10 my-1"></div>
            <div className="flex items-center justify-between group py-1">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 block mb-1">Contraseña</span>
                <span className="text-sm font-bold text-white">admin123</span>
              </div>
              <button 
                type="button"
                onClick={() => handleCopy('admin123', 'password')}
                className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/30 border border-blue-500/20 text-blue-400 transition-all active:scale-95 cursor-pointer"
                title="Copiar contraseña"
              >
                {copiedField === 'password' ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Glassmorphic Login Card */}
        <div className="bg-slate-900/40 backdrop-blur-2xl p-8 rounded-[2rem] shadow-2xl w-full max-w-md border border-white/10 text-white shadow-blue-500/5 transition-all duration-300 hover:border-white/20 order-1 lg:order-none z-30">
        
        {loading && (
          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-md rounded-[2rem] z-20 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200">
            <Loader2 className="animate-spin text-blue-400" size={40} />
            <span className="text-xs font-black uppercase tracking-widest text-blue-200 animate-pulse">
              {step === 1 ? 'Validando Correo...' : step === 2 ? 'Estableciendo Contraseña...' : 'Iniciando Sesión...'}
            </span>
          </div>
        )}
        <div className="flex justify-center mb-6">
          <div className="bg-blue-500/10 p-3 rounded-full shadow-inner border border-blue-500/20">
            {step === 2 ? <ShieldCheck className="text-blue-400" size={40} /> : <Activity className="text-blue-400" size={40} />}
          </div>
        </div>

        <h2 className="text-2xl font-black text-center text-white mb-2 uppercase tracking-tight italic">
          {step === 1 && "Bienvenido"}
          {step === 2 && "Completá tu Perfil"}
          {step === 3 && "Ingresar"}
        </h2>

        <p className="text-center text-blue-200/60 mb-8 text-xs font-bold uppercase tracking-wider">
          {step === 1 && "Ingresá tu correo corporativo"}
          {step === 2 && "Ingresá el código y tus datos"}
          {step === 3 && "Ingresá tu contraseña para continuar"}
        </p>
        
        {error && (
          <div className="bg-rose-500/10 text-rose-400 p-3.5 rounded-2xl text-xs font-bold mb-6 text-center border border-rose-500/20 italic">
            {error}
          </div>
        )}

        {isPolling ? (
          <div className="flex flex-col items-center justify-center p-6 bg-blue-500/5 border border-blue-500/10 rounded-[2rem] text-center space-y-4 animate-in zoom-in duration-300">
            <div className="relative flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-400" size={32} />
              <div className="absolute h-10 w-10 rounded-full bg-blue-500/10 animate-ping"></div>
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-200 animate-pulse">
              Esperando Aprobación...
            </p>
            <p className="text-[11px] text-blue-200/50 max-w-[280px] leading-relaxed font-bold">
              Tu solicitud fue enviada al administrador. Pasarás automáticamente al siguiente paso en cuanto autoricen tu acceso.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsPolling(false);
                showToast("Espera cancelada.", "info");
              }}
              className="text-[10px] uppercase font-black tracking-widest text-rose-400 hover:text-rose-300 transition-colors pt-2 cursor-pointer"
            >
              Cancelar Espera
            </button>
          </div>
        ) : (
          <form 
            onSubmit={step === 1 ? handleSolicitarCodigo : step === 2 ? handleEstablecerPassword : handleLogin} 
            className="space-y-5"
          >
            {/* EMAIL */}
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 text-blue-300/40 z-10" size={18} />
              <input 
                type="email" 
                placeholder="correo@ejemplo.com"
                className={`w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400/50 transition-all font-semibold text-sm text-white placeholder-blue-300/20 ${step !== 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                disabled={step !== 1}
                required
              />
            </div>

            {/* NOMBRE (Solo aparece en el paso 2 de registro) */}
            {step === 2 && (
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 text-blue-300/40 z-10" size={18} />
                <input 
                  type="text" 
                  placeholder="Tu Nombre y Apellido" 
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400/50 transition-all font-semibold text-sm text-white placeholder-blue-300/20"
                  value={nombre} 
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
            )}

            {/* CÓDIGO (Solo paso 2) */}
            {step === 2 && (
              <div className="relative">
                <ShieldCheck className="absolute left-3.5 top-3.5 text-blue-300/40 z-10" size={18} />
                <input 
                  type="text" 
                  placeholder="Código" 
                  maxLength="6"
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400/50 transition-all font-black text-sm text-white text-center tracking-[10px] placeholder-blue-300/20"
                  value={codigo} 
                  onChange={(e) => setCodigo(e.target.value)}
                  required
                />
              </div>
            )}

            {/* PASSWORD (Pasos 2 y 3) */}
            {step !== 1 && (
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-blue-300/40 z-10" size={18} />
                <input 
                  type="password" 
                  placeholder={step === 2 ? "Creá tu contraseña" : "Tu contraseña"}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl outline-none focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400/50 transition-all font-semibold text-sm text-white placeholder-blue-300/20"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer"
            >
              {loading ? "Cargando..." : (step === 3 ? "INICIAR SESIÓN" : "CONTINUAR")}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        )}

        {step !== 1 && (
          <button 
            onClick={() => {
              setStep(1);
              setIsPolling(false);
            }}
            className="w-full text-center mt-5 text-xs text-blue-400 font-bold uppercase tracking-wider hover:text-blue-300 transition-colors cursor-pointer"
          >
            Volver atrás
          </button>
        )}
        </div>
      </div>
    </div>
  );
};

export default Login;