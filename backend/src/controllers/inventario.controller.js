const xlsx = require('xlsx');
const { poolPromise, sql } = require('../config/db');
const logger = require('../utils/logger');

const normalizarNombreColumna = (col) => {
    if (!col) return '';
    return col.toString().toLowerCase().trim()
        .replace(/_/g, ' ')
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const limpiarPrecio = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Number(v);
    const original = String(v).trim();
    if (original === '*' || original === 'S/D' || original === '-') return 0;
    
    let texto = original.replace(/\*/g, '').replace(/\$/g, '').replace(/\s/g, '');
    if (texto.includes(',')) {
        texto = texto.replace(/\./g, '').replace(',', '.');
    }
    const num = parseFloat(texto);
    return isNaN(num) ? 0 : num;
};

const limpiarEntero = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Math.floor(v);
    const num = parseInt(String(v).replace(/\*/g, '').replace(/\s/g, ''), 10);
    return isNaN(num) ? 0 : num;
};

exports.obtenerInventario = async (req, res) => {
    try {
        const { page = 1, limit = 50, q = '', marca = '', linea = '' } = req.query;
        const pool = await poolPromise;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const offset = (pageNum - 1) * limitNum;

        let whereClause = 'WHERE 1=1';
        const values = [];
        let currentIndex = 1;

        if (q) {
            whereClause += ` AND (codigo ILIKE $${currentIndex} OR detalle ILIKE $${currentIndex})`;
            values.push(`%${q}%`);
            currentIndex++;
        }
        if (marca) {
            whereClause += ` AND marca = $${currentIndex}`;
            values.push(marca);
            currentIndex++;
        }
        if (linea) {
            whereClause += ` AND linea = $${currentIndex}`;
            values.push(linea);
            currentIndex++;
        }

        const countQuery = `SELECT COUNT(*)::INTEGER as total FROM Inventario ${whereClause}`;
        const countRes = await pool.query(countQuery, values);
        const total = countRes.rows[0].total || 0;

        const selectQuery = `
            SELECT * FROM Inventario 
            ${whereClause} 
            ORDER BY detalle ASC, codigo ASC
            LIMIT $${currentIndex} OFFSET $${currentIndex + 1}
        `;
        const selectValues = [...values, limitNum, offset];

        const dataRes = await pool.query(selectQuery, selectValues);

        const filterRes = await pool.query(`
            SELECT DISTINCT marca, linea 
            FROM Inventario 
            WHERE 1=1 AND marca IS NOT NULL AND marca <> ''
        `);

        const marcas = [...new Set(filterRes.rows.map(r => r.marca).filter(Boolean))].sort();
        const lineas = [...new Set(filterRes.rows.map(r => r.linea).filter(Boolean))].sort();

        res.json({
            data: dataRes.rows,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            marcas,
            lineas
        });
    } catch (err) {
        logger.error('Error al obtener inventario: ' + err.message);
        res.status(500).json({ error: "Ocurrió un error interno." });
    }
};

exports.obtenerStatsInventario = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.query(`
            SELECT 
                COUNT(*)::INTEGER as "totalArticulos",
                SUM(COALESCE(stock, 0))::INTEGER as "stockTotal",
                SUM(COALESCE(stock, 0) * COALESCE(costo, 0))::NUMERIC(18,2) as "valorizadoCosto",
                SUM(COALESCE(stock, 0) * COALESCE(precio_final, 0))::NUMERIC(18,2) as "valorizadoVenta"
            FROM Inventario 
            WHERE 1=1
        `);
        res.json(result.rows[0]);
    } catch (err) {
        logger.error('Error al obtener estadísticas de inventario: ' + err.message);
        res.status(500).json({ error: "Ocurrió un error interno." });
    }
};

exports.importarExcelInventario = async (req, res) => {
    // Simulación de éxito para la versión DEMO
    setTimeout(() => {
        res.json({ message: "¡Simulación Exitosa! El archivo Excel ha sido procesado (Versión Demo)." });
    }, 1500); // Pequeño delay para simular carga
};
