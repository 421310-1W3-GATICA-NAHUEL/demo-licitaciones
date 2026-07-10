const { poolPromise } = require('../config/db');
const logger = require('../utils/logger');
const { resolverEmpresaActiva } = require('../utils/empresaAccess');



const normalizarNroProceso = (nro) => {
    if (!nro || nro === 'S/D') return 'S/D';
    return nro.toString()
        .trim()
        .toUpperCase()
        .replace(/-/g, '/')          // Normalize dashes to slashes
        .replace(/\b0+(\d+)/g, '$1') // Strip leading zeros in numeric parts
        .replace(/\s+/g, '');        // Strip all spaces
};

const getComparativas = async (req, res) => {
    try {

        // =========================
        // FILTROS RECIBIDOS DEL FRONT
        // =========================
        const {
            q,
            provincia,
            tipo,
            fechaDesde,
            fechaHasta,
            ganamos,
            page,
            limit,
            competidor,
            posicionCompetidor
        } = req.query;

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const offset = (pageNum - 1) * limitNum;

        const pool = await poolPromise;
        const values = [];
        let paramIndex = 1;

        

        // =========================
        // QUERY BASE
        // =========================
        let query = `
            SELECT
                COUNT(*) OVER() AS "TotalRows",

                -- IDS
                R.id_renglon,
                R.nro_renglon_item,

                -- PROCESO
                P.nro_proceso,
                P.fecha_apertura,

                -- DESTINATARIO
                D.nombre_hospital,
                D.tipo_segmento,
                D.provincia,

                -- PRODUCTO
                Prod.nombre_detalle,

                -- =========================
                -- 1º OFERENTE
                -- =========================
                COALESCE(R.primer_oferente, 'S/D') AS primer_oferente,
                COALESCE(R.marca_ganadora, 'S/M') AS marca_1,
                R.precio_ganador AS precio_1,

                -- =========================
                -- 2º OFERENTE
                -- =========================
                COALESCE(R.segundo_oferente, 'S/D') AS segundo_oferente,
                COALESCE(R.marca_segundo, 'S/M') AS marca_2,
                R.segundo_pu AS precio_2,

                -- =========================
                -- NUESTRA EMPRESA
                -- =========================
                COALESCE(R.mi_marca, 'Nuestra Marca') AS mi_marca,
                R.mi_pu,

                -- RESULTADO CALCULADO DINÁMICAMENTE
                (CASE WHEN R.mi_pu > 0 AND R.mi_pu = R.precio_ganador THEN 1 ELSE 0 END) AS ganamos

            FROM Renglones R

            INNER JOIN Procesos P
                ON R.id_proceso_db = P.id_proceso_db

            INNER JOIN Destinatarios D
                ON R.id_destinatario = D.id_destinatario

            INNER JOIN Productos Prod
                ON R.id_producto = Prod.id_producto

            WHERE 1 = 1
        `;

        // =========================
        // 1. BUSCADOR GENERAL
        // =========================
        if (q && q.trim() !== '') {
            const qNormalized = normalizarNroProceso(q);
            const qIdx = paramIndex++;
            const qNormIdx = paramIndex++;
            values.push(`%${q}%`, `%${qNormalized}%`);
            query += `
                AND (
                    Prod.nombre_detalle ILIKE $${qIdx}
                    OR P.nro_proceso ILIKE $${qNormIdx}
                    OR D.nombre_hospital ILIKE $${qIdx}
                )
            `;
        }

        // =========================
        // 2. FILTRO PROVINCIA
        // =========================
        if (
            provincia &&
            provincia !== 'Todas'
        ) {
            const provIdx = paramIndex++;
            values.push(provincia);
            query += `
                AND D.provincia = $${provIdx}
            `;
        }

        // =========================
        // 3. FILTRO TIPO
        // =========================
        if (
            tipo &&
            tipo !== 'Todos'
        ) {
            const tipoIdx = paramIndex++;
            values.push(tipo);
            query += `
                AND D.tipo_segmento = $${tipoIdx}
            `;
        }

        // =========================
        // 4. FILTRO FECHAS
        // =========================
        if (
            fechaDesde &&
            fechaHasta &&
            fechaDesde !== '' &&
            fechaHasta !== ''
        ) {
            const desdeIdx = paramIndex++;
            const hastaIdx = paramIndex++;
            values.push(fechaDesde, fechaHasta);
            query += `
                AND P.fecha_apertura
                BETWEEN $${desdeIdx} AND $${hastaIdx}
            `;
        }

        // =========================
        // 5. FILTRO GANADAS
        // =========================
        if (ganamos === 'true' || ganamos === 'ganados') {
            query += `
                AND (CASE WHEN R.mi_pu > 0 AND R.mi_pu = R.precio_ganador THEN 1 ELSE 0 END) = 1
            `;
        } else if (ganamos === 'false' || ganamos === 'perdidos') {
            query += `
                AND (CASE WHEN R.mi_pu > 0 AND R.mi_pu = R.precio_ganador THEN 1 ELSE 0 END) = 0
                AND R.mi_pu > 0
            `;
        } else if (ganamos === 'nocotizados') {
            query += `
                AND (R.mi_pu IS NULL OR R.mi_pu = 0)
            `;
        }

        // =========================
        // 6. FILTRO COMPETIDOR
        // =========================
        if (competidor && competidor.trim() !== '') {
            const competidorIdx = paramIndex++;
            values.push(competidor.trim());
            
            if (posicionCompetidor === '1') {
                query += ` AND R.primer_oferente = $${competidorIdx} `;
            } else if (posicionCompetidor === '2') {
                query += ` AND R.segundo_oferente = $${competidorIdx} `;
            } else {
                // 'todos' o cualquiera
                query += ` AND (R.primer_oferente = $${competidorIdx} OR R.segundo_oferente = $${competidorIdx}) `;
            }
        }

        // =========================
        // ORDENAMIENTO Y PAGINACION
        // =========================
        const limitIdx = paramIndex++;
        const offsetIdx = paramIndex++;
        values.push(limitNum, offset);

        query += `
            ORDER BY
                P.fecha_apertura DESC,
                CAST(NULLIF(regexp_replace(R.nro_renglon_item, '[^0-9]', '', 'g'), '') AS INTEGER) ASC
            LIMIT $${limitIdx} OFFSET $${offsetIdx}
        `;

        // =========================
        // EJECUTAR QUERY
        // =========================
        const result = await pool.query(query, values);

        // =========================
        // RESPUESTA ESTRUCTURADA
        // =========================
        const records = result.rows;
        const total = records.length > 0 ? records[0].TotalRows : 0;
        const totalPages = Math.ceil(total / limitNum);

        res.json({
            data: records,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages
        });

    } catch (err) {
        logger.error('Error en SQL Comparativas: ' + err.message);
        res.status(500).json({
            error: 'Ocurrió un error interno. Por favor, intentá nuevamente.'
        });
    }
};

const getCompetidores = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.query(`
            SELECT DISTINCT TRIM(UPPER(primer_oferente)) AS competidor 
            FROM Renglones 
            WHERE primer_oferente IS NOT NULL AND primer_oferente <> '0' AND primer_oferente <> 'S/D' AND TRIM(primer_oferente) <> ''
            UNION
            SELECT DISTINCT TRIM(UPPER(segundo_oferente)) AS competidor
            FROM Renglones
            WHERE segundo_oferente IS NOT NULL AND segundo_oferente <> '0' AND segundo_oferente <> 'S/D' AND TRIM(segundo_oferente) <> ''
            ORDER BY competidor ASC
        `);
        
        const list = result.rows.map(x => x.competidor).filter(Boolean);
        res.json(list);
    } catch (err) {
        logger.error('Error al obtener lista de competidores: ' + err.message);
        res.status(500).json({ error: 'Ocurrió un error interno. Por favor, intentá nuevamente.' });
    }
};

const getSugerenciasProductos = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.json([]);
        }
        const pool = await poolPromise;
        const result = await pool.query(`
            SELECT DISTINCT nombre_detalle
            FROM Productos
            WHERE nombre_detalle ILIKE $1
            ORDER BY nombre_detalle ASC
            LIMIT 10
        `, [`%${q.trim()}%`]);
        res.json(result.rows.map(r => r.nombre_detalle));
    } catch (err) {
        logger.error('Error al obtener sugerencias de productos: ' + err.message);
        res.status(500).json({ error: 'Ocurrió un error interno. Por favor, intentá nuevamente.' });
    }
};

module.exports = {
    getComparativas,
    getCompetidores,
    getSugerenciasProductos
};