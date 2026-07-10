import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    withCredentials: true
});

// Interceptor de respuesta para capturar caídas del servidor y mantenimientos
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // 0. Ignorar si la petición fue cancelada por el cliente (ej. AbortController al desmonar componentes)
        if (axios.isCancel(error)) {
            return Promise.reject(error);
        }

        // 1. Error de Red (Servidor Apagado / Offline)
        if (!error.response) {
            if (!window.location.pathname.includes('/error-conexion')) {
                window.location.href = '/error-conexion';
            }
            return Promise.reject(error);
        }

        // 2. Servidor en Mantenimiento (HTTP 503)
        if (error.response.status === 503) {
            if (!window.location.pathname.includes('/mantenimiento')) {
                window.location.href = '/mantenimiento';
            }
            return Promise.reject(error);
        }

        // 3. Sesión Expirada / No Autorizado (HTTP 401)
        if (error.response.status === 401) {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('userEmail');
            sessionStorage.removeItem('userName');
            sessionStorage.removeItem('userRol');
            sessionStorage.removeItem('userEmpresaAcceso');
            sessionStorage.removeItem('userPuedeImportar');
            
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login?expirada=true';
            }
            return Promise.reject(error);
        }

        return Promise.reject(error);
    }
);

export default api;