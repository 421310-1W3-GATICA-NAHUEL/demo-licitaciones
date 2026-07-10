const { poolPromise } = require('../config/db');
const logger = require('../utils/logger');

// Obtener todas las licitaciones cargadas
const getLicitaciones = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT 
                P.id_proceso_db, 
                P.nro_proceso, 
                P.fecha_apertura, 
                P.fecha_importacion,
                D.id_destinatario,
                D.nombre_hospital,
                D.provincia,
                U.email AS email_creador,
                U.nombre AS nombre_creador,
                (SELECT COUNT(*) FROM Renglones R WHERE R.id_proceso_db = P.id_proceso_db) AS cant_renglones
            FROM Procesos P
            INNER JOIN Destinatarios D ON P.id_destinatario = D.id_destinatario
            LEFT JOIN Usuarios U ON P.id_usuario_creador = U.id_usuario
            ORDER BY P.fecha_importacion DESC NULLS LAST, P.fecha_apertura DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        logger.error("Error al obtener licitaciones para admin: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// Actualizar el hospital/destinatario de un proceso
const actualizarHospital = async (req, res) => {
    const { id } = req.params; // id_proceso_db
    const { id_destinatario } = req.body;

    const parsedId = parseInt(id, 10);
    const parsedDest = parseInt(id_destinatario, 10);

    if (isNaN(parsedId) || parsedId <= 0) {
        return res.status(400).json({ message: "ID de proceso inválido." });
    }
    if (isNaN(parsedDest) || parsedDest <= 0) {
        return res.status(400).json({ message: "ID de destinatario inválido." });
    }

    const pool = await poolPromise;
    const client = await pool.pgPool.connect();

    try {
        await client.query('BEGIN');

        // 1. Actualizar el proceso
        await client.query('UPDATE Procesos SET id_destinatario = $1 WHERE id_proceso_db = $2', [parsedDest, parsedId]);

        // 2. Actualizar todos los renglones asociados
        await client.query('UPDATE Renglones SET id_destinatario = $1 WHERE id_proceso_db = $2', [parsedDest, parsedId]);

        await client.query('COMMIT');
        res.json({ message: "Hospital actualizado correctamente en la licitación." });
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            logger.error("Error al hacer rollback en actualizarHospital: " + rollbackErr.message);
        }
        logger.error("Error al actualizar hospital de licitación: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    } finally {
        client.release();
    }
};

// Eliminar licitación en cascada
const eliminarLicitacion = async (req, res) => {
    const { id } = req.params; // id_proceso_db

    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId) || parsedId <= 0) {
        return res.status(400).json({ message: "ID de proceso inválido." });
    }

    const pool = await poolPromise;
    const client = await pool.pgPool.connect();

    try {
        await client.query('BEGIN');

        // 1. Eliminar de Renglones
        await client.query('DELETE FROM Renglones WHERE id_proceso_db = $1', [parsedId]);

        // 2. Eliminar de Diarias
        await client.query('DELETE FROM Diarias WHERE id_proceso_db = $1', [parsedId]);

        // 3. Eliminar de SeguimientoLicitaciones
        await client.query('DELETE FROM SeguimientoLicitaciones WHERE id_proceso_db = $1', [parsedId]);

        // 4. Eliminar de Procesos
        await client.query('DELETE FROM Procesos WHERE id_proceso_db = $1', [parsedId]);

        await client.query('COMMIT');
        res.json({ message: "Licitación y sus renglones eliminados correctamente." });
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (rollbackErr) {
            logger.error("Error al hacer rollback en eliminarLicitacion: " + rollbackErr.message);
        }
        logger.error("Error al eliminar licitación: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    } finally {
        client.release();
    }
};

// Obtener todos los destinatarios/hospitales
const getDestinatarios = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT id_destinatario, nombre_hospital, provincia, tipo_segmento
            FROM Destinatarios
            ORDER BY nombre_hospital ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        logger.error("Error al obtener destinatarios para admin: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

module.exports = {
    getLicitaciones,
    actualizarHospital,
    eliminarLicitacion,
    getDestinatarios
};
