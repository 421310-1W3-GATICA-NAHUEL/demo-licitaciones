const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const logger = require('../utils/logger');

const verifyToken = require('../middlewares/auth.middleware');
const rateLimit = require('express-rate-limit');

// Límite de seguridad en producción para evitar ataques de fuerza bruta
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Máximo 100 intentos por IP (aumentado para desarrollo)
    message: { message: "Demasiadas peticiones desde esta IP. Intente de nuevo en 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false
});

// 1. Paso inicial: Validar mail y enviar el código de 6 dígitos
router.post('/solicitar-codigo', authController.solicitarCodigo);

// 2. Paso de seguridad: Verificar código y guardar la contraseña (sirve para registro y reset)
router.post('/establecer-password', authController.establecerPassword);

// 3. Login convencional (solo para usuarios con estado = 1)
router.post('/login', authController.login);

// 4. Actualizar nombre de visualización o cambiar la contraseña
router.put('/perfil', verifyToken, authController.actualizarPerfil);

// 4.1. Cerrar sesión y actualizar estado en línea
router.post('/logout', verifyToken, authController.logout);

// 4.5. Verificar si los permisos del usuario cambiaron en tiempo real
router.get('/check-permissions', verifyToken, authController.checkPermissions);

// Rate limiter específico para presencia (heartbeat)
const heartbeatLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 30, // Máximo 30 pings
    message: { message: "Demasiados pings de presencia." },
    standardHeaders: true,
    legacyHeaders: false
});

// 4.6. Heartbeat de presencia online
router.post('/heartbeat', verifyToken, heartbeatLimiter, authController.heartbeat);

// 5. Obtener estado público de mantenimiento (para polling del frontend)
router.get('/status-mantenimiento', async (req, res) => {
    try {
        const estado = await global.getMaintenanceStatus();
        res.json({
            advertencia: estado.advertencia,
            bloqueo: estado.bloqueo,
            limite: estado.limite
        });
    } catch (err) {
        logger.error("Error al obtener estado de mantenimiento: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
});

module.exports = router;