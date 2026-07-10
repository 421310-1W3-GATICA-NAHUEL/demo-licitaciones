const { poolPromise } = require('../config/db');
const logger = require('../utils/logger');
const { resolverEmpresaActiva } = require('../utils/empresaAccess');

const MESES_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Función auxiliar para construir el WHERE dinámico según tu esquema real.
 * Filtra por empresa (restringiendo a renglones cotizados por ella), jurisdicción, hospital y fechas.
 */
const construirFiltros = (req, startIndex = 1) => {
    const { fechaDesde, fechaHasta, provincia, hospital } = req.query;
    
    
    let filtros = " WHERE 1=1 ";
    const values = [];
    let currentIndex = startIndex;

    filtros += " AND R.mi_pu > 0 ";

    if (provincia && provincia !== 'Todas' && provincia.trim() !== '') {
        filtros += ` AND D.provincia = $${currentIndex} `;
        values.push(provincia);
        currentIndex++;
    }

    if (hospital && hospital !== 'Todos' && hospital.trim() !== '') {
        filtros += ` AND D.nombre_hospital = $${currentIndex} `;
        values.push(hospital);
        currentIndex++;
    }

    if (fechaDesde && fechaHasta && fechaDesde.trim() !== '' && fechaHasta.trim() !== '') {
        filtros += ` AND P.fecha_apertura BETWEEN $${currentIndex} AND $${currentIndex + 1} `;
        values.push(fechaDesde, fechaHasta);
        currentIndex += 2;
    }

    return {
        filtros,
        values,
        nextIndex: currentIndex
    };
};

const getGanamosExpr = () => {
    return `(CASE WHEN R.mi_pu > 0 AND R.mi_pu = R.precio_ganador THEN 1 ELSE 0 END)`;
};

// 1. Resumen Histórico (Torta)
const getResumenGeneral = async (req, res) => {
    try {
        const pool = await poolPromise;
        
        
        const ganamosExpr = '(CASE WHEN R.mi_pu > 0 AND R.mi_pu = R.precio_ganador THEN 1 ELSE 0 END)';
        const { filtros, values } = construirFiltros(req, 1);
        
        const query = `
            SELECT 
                CASE WHEN ${ganamosExpr} = 1 THEN 'Ganados' ELSE 'Perdidos' END AS label,
                COUNT(*)::INTEGER AS value
            FROM Renglones R
            INNER JOIN Procesos P ON R.id_proceso_db = P.id_proceso_db
            INNER JOIN Destinatarios D ON R.id_destinatario = D.id_destinatario
            ${filtros}
            GROUP BY 
                CASE WHEN ${ganamosExpr} = 1 THEN 'Ganados' ELSE 'Perdidos' END
        `;
        
        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        logger.error("Error en Resumen: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// 2. Balance Mensual (Barras)
const getBalanceMensual = async (req, res) => {
    try {
        const pool = await poolPromise;
        
        
        const ganamosExpr = '(CASE WHEN R.mi_pu > 0 AND R.mi_pu = R.precio_ganador THEN 1 ELSE 0 END)';
        const { filtros, values } = construirFiltros(req, 1);

        const query = `
            SELECT
                EXTRACT(MONTH FROM P.fecha_apertura)::INTEGER AS nro_mes,
                SUM(CASE WHEN ${ganamosExpr} = 1 THEN 1 ELSE 0 END)::INTEGER AS ganados,
                SUM(CASE WHEN ${ganamosExpr} = 0 THEN 1 ELSE 0 END)::INTEGER AS perdidos
            FROM Renglones R
            INNER JOIN Procesos P ON R.id_proceso_db = P.id_proceso_db
            INNER JOIN Destinatarios D ON R.id_destinatario = D.id_destinatario
            ${filtros}
            AND P.fecha_apertura IS NOT NULL
            GROUP BY
                EXTRACT(MONTH FROM P.fecha_apertura)
            ORDER BY nro_mes ASC
        `;

        const result = await pool.query(query, values);

        const mappedRows = result.rows.map(row => {
            const nro = row.nro_mes;
            return {
                mes: MESES_ES[nro - 1] || 'Desconocido',
                nro_mes: nro,
                ganados: row.ganados || 0,
                perdidos: row.perdidos || 0
            };
        });

        res.json(mappedRows);
    } catch (err) {
        logger.error("Error en mensual: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// 3. Ranking de Competidores
const getTopCompetidores = async (req, res) => {
    try {
        const pool = await poolPromise;
        
        
        const ganamosExpr = '(CASE WHEN R.mi_pu > 0 AND R.mi_pu = R.precio_ganador THEN 1 ELSE 0 END)';
        const { filtros, values } = construirFiltros(req, 1);

        const query = `
            SELECT
                R.primer_oferente AS nombre,
                COUNT(*)::INTEGER AS victorias,
                AVG(R.precio_ganador)::NUMERIC(18,2) AS precio_promedio,
                MAX(R.marca_ganadora) AS marca_frecuente
            FROM Renglones R
            INNER JOIN Procesos P ON R.id_proceso_db = P.id_proceso_db
            INNER JOIN Destinatarios D ON R.id_destinatario = D.id_destinatario
            ${filtros}
            AND ${ganamosExpr} = 0
            AND R.primer_oferente IS NOT NULL
            AND R.primer_oferente <> ''
            GROUP BY
                R.primer_oferente
            ORDER BY victorias DESC
            LIMIT 5
        `;
        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        logger.error("Error en competidores: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// 4. Top 5 Productos Perdidos
const getTopProductosPerdidos = async (req, res) => {
    try {
        const pool = await poolPromise;
        
        
        const ganamosExpr = '(CASE WHEN R.mi_pu > 0 AND R.mi_pu = R.precio_ganador THEN 1 ELSE 0 END)';
        const { filtros, values } = construirFiltros(req, 1);

        const query = `
            SELECT 
                Prod.nombre_detalle AS producto, 
                COUNT(*)::INTEGER AS veces_perdido
            FROM Renglones R
            INNER JOIN Procesos P ON R.id_proceso_db = P.id_proceso_db
            INNER JOIN Destinatarios D ON R.id_destinatario = D.id_destinatario
            INNER JOIN Productos Prod ON R.id_producto = Prod.id_producto
            ${filtros} AND ${ganamosExpr} = 0
            GROUP BY Prod.nombre_detalle
            ORDER BY veces_perdido DESC
            LIMIT 5
        `;
        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        logger.error("Error en productos perdidos: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// 5. Eficacia por Hospital
const getEficaciaPorHospital = async (req, res) => {
    try {
        const pool = await poolPromise;
        
        
        const ganamosExpr = '(CASE WHEN R.mi_pu > 0 AND R.mi_pu = R.precio_ganador THEN 1 ELSE 0 END)';
        const { filtros, values } = construirFiltros(req, 1);

        const query = `
            SELECT 
                D.nombre_hospital AS hospital,
                SUM(CASE WHEN ${ganamosExpr} = 1 THEN 1 ELSE 0 END)::INTEGER AS ganados,
                COUNT(*)::INTEGER AS total,
                ROUND(SUM(CASE WHEN ${ganamosExpr} = 1 THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100, 2)::NUMERIC(10,2) AS porcentaje_exito
            FROM Renglones R
            INNER JOIN Procesos P ON R.id_proceso_db = P.id_proceso_db
            INNER JOIN Destinatarios D ON R.id_destinatario = D.id_destinatario
            ${filtros}
            GROUP BY D.nombre_hospital
            ORDER BY total DESC
            LIMIT 10
        `;
        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        logger.error("Error en eficacia hospital: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// 6. Diferencia de Precio (Price Gap)
const getDiferenciaPrecioPromedio = async (req, res) => {
    try {
        const pool = await poolPromise;
        
        
        const ganamosExpr = '(CASE WHEN R.mi_pu > 0 AND R.mi_pu = R.precio_ganador THEN 1 ELSE 0 END)';
        const { filtros, values } = construirFiltros(req, 1);
        
        const priceField = 'R.mi_pu';

        const query = `
            SELECT 
                COALESCE(
                    AVG(
                        (
                            ${priceField}
                            - R.precio_ganador
                        )
                        / NULLIF(R.precio_ganador, 0)
                    ) * 100, 0
                )::NUMERIC(10,2) AS gap_promedio
            FROM Renglones R
            INNER JOIN Procesos P ON R.id_proceso_db = P.id_proceso_db
            INNER JOIN Destinatarios D ON R.id_destinatario = D.id_destinatario
            ${filtros}
            AND ${ganamosExpr} = 0
            AND R.precio_ganador > 0
            AND ${priceField} > 0
        `;

        const result = await pool.query(query, values);
        res.json(result.rows[0] || { gap_promedio: 0 });
    } catch (err) {
        logger.error("Error Price Gap: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

const getHospitales = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { provincia } = req.query;

        let query = `
            SELECT DISTINCT
                 UPPER(TRIM(nombre_hospital)) AS nombre_hospital
            FROM Destinatarios
            WHERE 1=1
        `;
        const values = [];

        if (provincia && provincia !== 'Todas') {
            query += ` AND provincia = $1 `;
            values.push(provincia);
        }

        query += ` ORDER BY nombre_hospital ASC `;

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        logger.error("Error hospitales: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// 7. Eficacia por Provincia (Mapa de Calor)
const getEficaciaPorProvincia = async (req, res) => {
    try {
        const pool = await poolPromise;
        
        
        const ganamosExpr = '(CASE WHEN R.mi_pu > 0 AND R.mi_pu = R.precio_ganador THEN 1 ELSE 0 END)';
        const { filtros, values } = construirFiltros(req, 1);

        const query = `
            SELECT
                D.provincia,
                SUM(CASE WHEN ${ganamosExpr} = 1 THEN 1 ELSE 0 END)::INTEGER AS ganados,
                COUNT(*)::INTEGER AS total,
                ROUND(SUM(CASE WHEN ${ganamosExpr} = 1 THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100, 2)::NUMERIC(10,2) AS porcentaje_exito
            FROM Renglones R
            INNER JOIN Procesos P ON R.id_proceso_db = P.id_proceso_db
            INNER JOIN Destinatarios D ON R.id_destinatario = D.id_destinatario
            ${filtros}
            AND D.provincia IS NOT NULL AND D.provincia <> ''
            GROUP BY D.provincia
            ORDER BY total DESC
        `;
        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        logger.error("Error en provincias: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// 8. Detalle del Producto Seleccionado (Soporta Ganados y Perdidos)
const getProductoDetalle = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { producto, tipo } = req.query;
        if (!producto) {
            return res.status(400).json({ error: "El nombre del producto es requerido" });
        }
        
        const isGanado = tipo === 'ganado';
        const ganamosCond = isGanado ? 1 : 0;
        
        const ganamosExpr = '(CASE WHEN R.mi_pu > 0 AND R.mi_pu = R.precio_ganador THEN 1 ELSE 0 END)';
        const priceField = 'R.mi_pu';

        // 1. Obtener precios promedio y total veces
        const { filtros: filtros1, values: values1 } = construirFiltros(req, 2);
        const params1 = [producto, ...values1];

        const queryPrecios = isGanado ? `
            SELECT 
                AVG(${priceField})::NUMERIC(18,2) AS nuestro_precio_prom,
                AVG(R.segundo_pu)::NUMERIC(18,2) AS precio_ganador_prom,
                COUNT(*)::INTEGER AS total_veces
            FROM Renglones R
            INNER JOIN Procesos P ON R.id_proceso_db = P.id_proceso_db
            INNER JOIN Destinatarios D ON R.id_destinatario = D.id_destinatario
            INNER JOIN Productos Prod ON R.id_producto = Prod.id_producto
            ${filtros1}
            AND Prod.nombre_detalle = $1
            AND ${ganamosExpr} = 1
        ` : `
            SELECT 
                AVG(${priceField})::NUMERIC(18,2) AS nuestro_precio_prom,
                AVG(R.precio_ganador)::NUMERIC(18,2) AS precio_ganador_prom,
                COUNT(*)::INTEGER AS total_veces
            FROM Renglones R
            INNER JOIN Procesos P ON R.id_proceso_db = P.id_proceso_db
            INNER JOIN Destinatarios D ON R.id_destinatario = D.id_destinatario
            INNER JOIN Productos Prod ON R.id_producto = Prod.id_producto
            ${filtros1}
            AND Prod.nombre_detalle = $1
            AND ${ganamosExpr} = 0
        `;
        const resPrecios = await pool.query(queryPrecios, params1);
        const preciosData = resPrecios.rows[0] || { nuestro_precio_prom: 0, precio_ganador_prom: 0, total_veces: 0 };

        // 2. Obtener competidor principal (para ganado es segundo_oferente; para perdido es primer_oferente)
        const { filtros: filtros2, values: values2 } = construirFiltros(req, 2);
        const params2 = [producto, ...values2];

        const queryCompetidor = isGanado ? `
            SELECT 
                R.segundo_oferente AS competidor, 
                COUNT(*)::INTEGER AS veces
            FROM Renglones R
            INNER JOIN Procesos P ON R.id_proceso_db = P.id_proceso_db
            INNER JOIN Destinatarios D ON R.id_destinatario = D.id_destinatario
            INNER JOIN Productos Prod ON R.id_producto = Prod.id_producto
            ${filtros2}
            AND Prod.nombre_detalle = $1
            AND ${ganamosExpr} = 1
            AND R.segundo_oferente IS NOT NULL AND R.segundo_oferente <> ''
            GROUP BY R.segundo_oferente
            ORDER BY veces DESC
            LIMIT 1
        ` : `
            SELECT 
                R.primer_oferente AS competidor, 
                COUNT(*)::INTEGER AS veces
            FROM Renglones R
            INNER JOIN Procesos P ON R.id_proceso_db = P.id_proceso_db
            INNER JOIN Destinatarios D ON R.id_destinatario = D.id_destinatario
            INNER JOIN Productos Prod ON R.id_producto = Prod.id_producto
            ${filtros2}
            AND Prod.nombre_detalle = $1
            AND ${ganamosExpr} = 0
            AND R.primer_oferente IS NOT NULL AND R.primer_oferente <> ''
            GROUP BY R.primer_oferente
            ORDER BY veces DESC
            LIMIT 1
        `;
        const resCompetidor = await pool.query(queryCompetidor, params2);
        const competidorData = resCompetidor.rows[0] || { competidor: 'N/A', veces: 0 };

        // 3. Obtener hospital principal
        const { filtros: filtros3, values: values3 } = construirFiltros(req, 2);
        const params3 = [producto, ...values3];

        const queryHospital = `
            SELECT 
                D.nombre_hospital AS hospital, 
                COUNT(*)::INTEGER AS veces
            FROM Renglones R
            INNER JOIN Procesos P ON R.id_proceso_db = P.id_proceso_db
            INNER JOIN Destinatarios D ON R.id_destinatario = D.id_destinatario
            INNER JOIN Productos Prod ON R.id_producto = Prod.id_producto
            ${filtros3}
            AND Prod.nombre_detalle = $1
            AND ${ganamosExpr} = ${ganamosCond}
            GROUP BY D.nombre_hospital
            ORDER BY veces DESC
            LIMIT 1
        `;
        const resHospital = await pool.query(queryHospital, params3);
        const hospitalData = resHospital.rows[0] || { hospital: 'N/A', veces: 0 };

        res.json({
            producto,
            tipo: isGanado ? 'ganado' : 'perdido',
            nuestro_precio_prom: preciosData.nuestro_precio_prom || 0,
            precio_ganador_prom: preciosData.precio_ganador_prom || 0,
            total_veces: preciosData.total_veces || 0,
            competidor_principal: competidorData.competidor,
            competidor_veces: competidorData.veces,
            hospital_principal: hospitalData.hospital,
            hospital_veces: hospitalData.veces
        });
    } catch (err) {
        logger.error("Error en detalle de producto: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// 9. Detalle del Competidor y sus principales victorias
const getCompetidorDetalle = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { competidor } = req.query;
        if (!competidor) {
            return res.status(400).json({ error: "El nombre del competidor es requerido" });
        }
        
        
        const ganamosExpr = '(CASE WHEN R.mi_pu > 0 AND R.mi_pu = R.precio_ganador THEN 1 ELSE 0 END)';
        const priceField = 'R.mi_pu';

        const { filtros, values } = construirFiltros(req, 2);
        const params = [competidor, ...values];

        const queryProductos = `
            SELECT 
                Prod.nombre_detalle AS producto,
                COUNT(*)::INTEGER AS veces_perdido,
                AVG(${priceField})::NUMERIC(18,2) AS nuestro_precio_prom,
                AVG(R.precio_ganador)::NUMERIC(18,2) AS precio_ganador_prom
            FROM Renglones R
            INNER JOIN Procesos P ON R.id_proceso_db = P.id_proceso_db
            INNER JOIN Destinatarios D ON R.id_destinatario = D.id_destinatario
            INNER JOIN Productos Prod ON R.id_producto = Prod.id_producto
            ${filtros}
            AND R.primer_oferente = $1
            AND ${ganamosExpr} = 0
            GROUP BY Prod.nombre_detalle
            ORDER BY veces_perdido DESC
            LIMIT 5
        `;
        const result = await pool.query(queryProductos, params);
        res.json({
            competidor,
            productos: result.rows
        });
    } catch (err) {
        logger.error("Error en detalle competidor: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

const getTopProductosGanados = async (req, res) => {
    try {
        const pool = await poolPromise;
        
        
        const ganamosExpr = '(CASE WHEN R.mi_pu > 0 AND R.mi_pu = R.precio_ganador THEN 1 ELSE 0 END)';
        const { filtros, values } = construirFiltros(req, 1);

        const query = `
            SELECT 
                Prod.nombre_detalle AS producto, 
                COUNT(*)::INTEGER AS veces_ganado
            FROM Renglones R
            INNER JOIN Procesos P ON R.id_proceso_db = P.id_proceso_db
            INNER JOIN Destinatarios D ON R.id_destinatario = D.id_destinatario
            INNER JOIN Productos Prod ON R.id_producto = Prod.id_producto
            ${filtros} AND ${ganamosExpr} = 1
            GROUP BY Prod.nombre_detalle
            ORDER BY veces_ganado DESC
            LIMIT 5
        `;
        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err) {
        logger.error("Error en productos ganados: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

module.exports = { 
    getResumenGeneral, 
    getBalanceMensual,
    getTopCompetidores,
    getTopProductosPerdidos,
    getTopProductosGanados,
    getEficaciaPorHospital,
    getDiferenciaPrecioPromedio,
    getHospitales,
    getEficaciaPorProvincia,
    getProductoDetalle,
    getCompetidorDetalle
};