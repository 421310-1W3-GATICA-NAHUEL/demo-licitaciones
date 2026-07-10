const { poolPromise } = require('../config/db');
const { resolverEmpresaActiva } = require('../utils/empresaAccess');
const logger = require('../utils/logger');

const getNotificaciones = async (req, res) => {
    try {
        const pool = await poolPromise;
        let query = 'SELECT id_notificacion, empresa, titulo, mensaje, leido, fecha_creacion FROM Notificaciones';
        let params = [];
        
        query += ' ORDER BY fecha_creacion DESC LIMIT 15';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        logger.error('Error al obtener notificaciones: ' + err.message);
        res.status(500).json({ error: 'Error al obtener notificaciones.' });
    }
};

const marcarLeidas = async (req, res) => {
    try {
        const pool = await poolPromise;
        let query = 'UPDATE Notificaciones SET leido = TRUE';
        let params = [];
        
        await pool.query(query, params);
        res.json({ success: true });
    } catch (err) {
        logger.error('Error al marcar notificaciones como leídas: ' + err.message);
        res.status(500).json({ error: 'Error al marcar notificaciones como leídas.' });
    }
};

module.exports = {
    getNotificaciones,
    marcarLeidas
};
