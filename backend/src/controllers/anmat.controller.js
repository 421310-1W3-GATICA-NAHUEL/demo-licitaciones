const { poolPromise } = require('../config/db');
const logger = require('../utils/logger');

// 0. Autocompletar productos desde Inventario (sin filtro de empresa)
// Usado en el formulario de PM ANMAT para mantener coherencia de nombres
const buscarProductosInventario = async (req, res) => {
    try {
        const { q = '' } = req.query;
        if (!q.trim() || q.trim().length < 2) {
            return res.json([]);
        }
        const pool = await poolPromise;
        const result = await pool.query(
            `SELECT DISTINCT detalle, marca
             FROM Inventario
             WHERE detalle ILIKE $1
             ORDER BY detalle ASC
             LIMIT 15`,
            [`%${q.trim()}%`]
        );
        // Deduplica por detalle y retorna lista limpia
        const seen = new Set();
        const uniq = result.rows.filter(r => {
            if (seen.has(r.detalle)) return false;
            seen.add(r.detalle);
            return true;
        });
        res.json(uniq);
    } catch (err) {
        logger.error('Error al buscar productos inventario para PM: ' + err.message);
        res.status(500).json({ error: 'Ocurrió un error interno. Por favor, intentá nuevamente.' });
    }
};

// 1. Listar PMs con búsqueda y paginación
const getProductosPM = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { q = '', page = 1, limit = 50 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const values = [];
        let paramIdx = 1;
        let whereClause = 'WHERE 1=1';

        if (q && q.trim() !== '') {
            whereClause += ` AND (
                detalle ILIKE $${paramIdx} OR 
                marca   ILIKE $${paramIdx} OR 
                pm      ILIKE $${paramIdx}
            )`;
            values.push(`%${q.trim()}%`);
            paramIdx++;
        }

        const totalRes = await pool.query(
            `SELECT COUNT(*)::INTEGER AS total FROM ProductosPM ${whereClause}`,
            values
        );
        const total = totalRes.rows[0].total;

        const dataRes = await pool.query(
            `SELECT id, detalle, marca, pm, observaciones, fecha_carga
             FROM ProductosPM
             ${whereClause}
             ORDER BY detalle ASC, marca ASC
             LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
            [...values, parseInt(limit), offset]
        );

        res.json({
            data: dataRes.rows,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (err) {
        logger.error('Error al obtener ProductosPM: ' + err.message);
        res.status(500).json({ error: 'Ocurrió un error interno. Por favor, intentá nuevamente.' });
    }
};

// 2. Crear un nuevo registro PM
const crearProductoPM = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({ error: 'No tenés permisos para esta acción.' });
        }
        const { detalle, marca, pm, observaciones } = req.body;

        if (!detalle || !marca || !pm) {
            return res.status(400).json({ error: 'Los campos Detalle, Marca y PM son obligatorios.' });
        }

        const pool = await poolPromise;

        await pool.query(
            `INSERT INTO ProductosPM (detalle, marca, pm, observaciones)
             VALUES ($1, $2, $3, $4)`,
            [detalle.trim(), marca.trim(), pm.trim().toUpperCase(), observaciones ? observaciones.trim() : null]
        );

        res.status(201).json({ message: 'PM creado correctamente.' });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Ya existe un PM para esa combinación de Producto y Marca.' });
        }
        logger.error('Error al crear ProductoPM: ' + err.message);
        res.status(500).json({ error: 'Ocurrió un error interno. Por favor, intentá nuevamente.' });
    }
};

// 3. Actualizar un registro PM existente
const actualizarProductoPM = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({ error: 'No tenés permisos para esta acción.' });
        }
        const { id } = req.params;
        const { detalle, marca, pm, observaciones } = req.body;

        if (!detalle || !marca || !pm) {
            return res.status(400).json({ error: 'Los campos Detalle, Marca y PM son obligatorios.' });
        }

        const pool = await poolPromise;

        const result = await pool.query(
            `UPDATE ProductosPM
             SET detalle = $1, marca = $2, pm = $3, observaciones = $4
             WHERE id = $5`,
            [detalle.trim(), marca.trim(), pm.trim().toUpperCase(), observaciones ? observaciones.trim() : null, parseInt(id)]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Registro no encontrado.' });
        }

        res.json({ message: 'PM actualizado correctamente.' });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Ya existe un PM para esa combinación de Producto y Marca.' });
        }
        logger.error('Error al actualizar ProductoPM: ' + err.message);
        res.status(500).json({ error: 'Ocurrió un error interno. Por favor, intentá nuevamente.' });
    }
};

// 4. Eliminar un registro PM
const eliminarProductoPM = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({ error: 'No tenés permisos para esta acción.' });
        }
        const { id } = req.params;
        const pool = await poolPromise;

        const result = await pool.query('DELETE FROM ProductosPM WHERE id = $1', [parseInt(id)]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Registro no encontrado.' });
        }

        res.json({ message: 'PM eliminado correctamente.' });
    } catch (err) {
        logger.error('Error al eliminar ProductoPM: ' + err.message);
        res.status(500).json({ error: 'Ocurrió un error interno. Por favor, intentá nuevamente.' });
    }
};

// 5. Importación masiva desde Excel (JSON array)
const importarProductosPM = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({ error: 'No tenés permisos para esta acción.' });
        }

        const { registros } = req.body;

        if (!Array.isArray(registros) || registros.length === 0) {
            return res.status(400).json({ error: 'No se recibieron registros para importar.' });
        }

        const pool = await poolPromise;
        let insertados = 0;
        let actualizados = 0;
        let errores = 0;

        for (const reg of registros) {
            const detalle = reg.detalle ? String(reg.detalle).trim() : null;
            const marca   = reg.marca   ? String(reg.marca).trim()   : null;
            const pm      = reg.pm      ? String(reg.pm).trim().toUpperCase() : null;
            const obs     = reg.observaciones ? String(reg.observaciones).trim() : null;

            if (!detalle || !marca || !pm) {
                errores++;
                continue;
            }

            const result = await pool.query(
                `INSERT INTO ProductosPM (detalle, marca, pm, observaciones)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (detalle, marca)
                 DO UPDATE SET pm = EXCLUDED.pm, observaciones = EXCLUDED.observaciones, fecha_carga = NOW()
                 RETURNING (xmax = 0) AS inserted`,
                [detalle, marca, pm, obs]
            );

            if (result.rows[0].inserted) {
                insertados++;
            } else {
                actualizados++;
            }
        }

        res.json({
            message: `Importación completada: ${insertados} nuevos, ${actualizados} actualizados, ${errores} omitidos.`,
            insertados,
            actualizados,
            errores
        });
    } catch (err) {
        logger.error('Error al importar ProductosPM: ' + err.message);
        res.status(500).json({ error: 'Ocurrió un error interno. Por favor, intentá nuevamente.' });
    }
};

// 6. Búsqueda rápida para Cotizador (autocompletar)
const buscarPM = async (req, res) => {
    try {
        const { detalle = '', marca = '' } = req.query;
        const pool = await poolPromise;

        const result = await pool.query(
            `SELECT id, detalle, marca, pm
             FROM ProductosPM
             WHERE detalle ILIKE $1 AND ($2 = '' OR marca ILIKE $2)
             ORDER BY detalle ASC, marca ASC
             LIMIT 20`,
            [`%${detalle.trim()}%`, marca.trim() ? `%${marca.trim()}%` : '']
        );

        res.json(result.rows);
    } catch (err) {
        logger.error('Error en búsqueda PM: ' + err.message);
        res.status(500).json({ error: 'Ocurrió un error interno. Por favor, intentá nuevamente.' });
    }
};

module.exports = {
    getProductosPM,
    crearProductoPM,
    actualizarProductoPM,
    eliminarProductoPM,
    importarProductosPM,
    buscarPM,
    buscarProductosInventario
};
