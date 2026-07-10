const { poolPromise } = require('../config/db');
const logger = require('../utils/logger');

// 1. Obtener contactos con filtros y búsqueda
const getContactos = async (req, res) => {
    try {
        const { search, empresa } = req.query;
        const pool = await poolPromise;
        const values = [];
        let paramIndex = 1;

        let query = `
            SELECT C.id_contacto, C.id_destinatario, C.nombre_contacto, C.rol_puesto, 
                   C.telefono, C.email, C.empresa, C.notas, C.fecha_creacion,
                   D.nombre_hospital, D.segmento_provincia, D.provincia
             FROM ContactosHospitales C
             LEFT JOIN Destinatarios D ON C.id_destinatario = D.id_destinatario
             WHERE 1 = 1
        `;

        if (search && search.trim() !== '') {
            const searchIdx = paramIndex++;
            values.push(`%${search.trim()}%`);
            query += ` AND (C.nombre_contacto ILIKE $${searchIdx} OR D.nombre_hospital ILIKE $${searchIdx} OR C.email ILIKE $${searchIdx})`;
        }

        if (empresa && empresa.trim() !== '' && empresa.trim() !== 'TODAS') {
            const empresaIdx = paramIndex++;
            values.push(empresa.trim());
            query += ` AND (C.empresa = $${empresaIdx} OR C.empresa = 'TODAS')`;
        }

        query += ` ORDER BY D.nombre_hospital ASC, C.nombre_contacto ASC`;

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        logger.error("Error al obtener contactos: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// 2. Crear un nuevo contacto
const crearContacto = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({ error: 'No tenés permisos para esta acción.' });
        }
        const { id_destinatario, nombre_contacto, rol_puesto, telefono, email, notas } = req.body;

        const pool = await poolPromise;

        const parsedDest = id_destinatario ? parseInt(id_destinatario, 10) : null;
        const nombre = nombre_contacto ? nombre_contacto.trim() : null;
        const rol = rol_puesto ? rol_puesto.trim() : null;
        const tel = telefono ? telefono.trim() : null;
        const mail = email ? email.trim() : null;
        const emp = 'TODAS';
        const not = notas ? notas.trim() : null;

        await pool.query(`
            INSERT INTO ContactosHospitales 
                (id_destinatario, nombre_contacto, rol_puesto, telefono, email, empresa, notas)
            VALUES 
                ($1, $2, $3, $4, $5, $6, $7)
        `, [parsedDest, nombre, rol, tel, mail, emp, not]);

        res.status(201).json({ message: "Contacto creado correctamente." });
    } catch (err) {
        logger.error("Error al crear contacto: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// 3. Actualizar un contacto existente
const actualizarContacto = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({ error: 'No tenés permisos para esta acción.' });
        }
        const { id } = req.params;
        const { id_destinatario, nombre_contacto, rol_puesto, telefono, email, notas } = req.body;

        const parsedId = parseInt(id, 10);
        if (isNaN(parsedId) || parsedId <= 0) {
            return res.status(400).json({ message: "ID de contacto inválido." });
        }

        const pool = await poolPromise;

        const parsedDest = id_destinatario ? parseInt(id_destinatario, 10) : null;
        const nombre = nombre_contacto ? nombre_contacto.trim() : null;
        const rol = rol_puesto ? rol_puesto.trim() : null;
        const tel = telefono ? telefono.trim() : null;
        const mail = email ? email.trim() : null;
        const emp = 'TODAS';
        const not = notas ? notas.trim() : null;

        await pool.query(`
            UPDATE ContactosHospitales
            SET id_destinatario = $1,
                nombre_contacto = $2,
                rol_puesto = $3,
                telefono = $4,
                email = $5,
                empresa = $6,
                notas = $7
            WHERE id_contacto = $8
        `, [parsedDest, nombre, rol, tel, mail, emp, not, parsedId]);

        res.json({ message: "Contacto actualizado correctamente." });
    } catch (err) {
        logger.error("Error al actualizar contacto: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// 4. Eliminar un contacto
const eliminarContacto = async (req, res) => {
    try {
        if (req.user.rol !== 'admin') {
            return res.status(403).json({ error: 'No tenés permisos para esta acción.' });
        }
        const { id } = req.params;
        const parsedId = parseInt(id, 10);
        if (isNaN(parsedId) || parsedId <= 0) {
            return res.status(400).json({ message: "ID de contacto inválido." });
        }

        const pool = await poolPromise;
        await pool.query('DELETE FROM ContactosHospitales WHERE id_contacto = $1', [parsedId]);

        res.json({ message: "Contacto eliminado correctamente." });
    } catch (err) {
        logger.error("Error al eliminar contacto: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// 5. Obtener destinatarios (para buscador predictivo)
const getDestinatarios = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.query(`
            SELECT id_destinatario, nombre_hospital, provincia, tipo_segmento
            FROM Destinatarios
            ORDER BY nombre_hospital ASC
        `);
        res.json(result.rows);
    } catch (err) {
        logger.error("Error al obtener destinatarios en contactos: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

module.exports = {
    getContactos,
    getDestinatarios,
    crearContacto,
    actualizarContacto,
    eliminarContacto
};
