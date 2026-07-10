const { poolPromise } = require('../config/db');
const logger = require('../utils/logger');
const { resolverEmpresaActiva } = require('../utils/empresaAccess');


// =========================
// LISTADO PRINCIPAL
// =========================

exports.getSeguimientos = async (req, res) => {
    try {
        const pool = await poolPromise;

        const {
            provincia,
            hospital,
            estado,
            fechaDesde,
            fechaHasta,
            q,
            page,
            limit
        } = req.query;

        
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 50;
        const offset = (pageNum - 1) * limitNum;

        let query = `
            SELECT DISTINCT
                P.id_proceso_db,
                P.nro_proceso,
                P.fecha_apertura,
                D.nombre_hospital,
                D.provincia,
                D.tipo_segmento,
                S.estado,
                S.comparativa_solicitada,
                CASE 
                    WHEN EXISTS(SELECT 1 FROM Renglones R WHERE R.id_proceso_db = P.id_proceso_db) THEN 1 
                    ELSE 0 
                END AS comparativa_cargada,
                COALESCE(
                    S.importe_cotizado, 
                    (SELECT SUM(R2.cantidad * R2.mi_pu) FROM Renglones R2 WHERE R2.id_proceso_db = P.id_proceso_db)
                ) AS importe_cotizado,
                S.importe_adjudicado,
                S.nro_oc,
                S.nro_nv,
                S.nro_factura,
                S.fecha_recibida_oc
            FROM Procesos P
            INNER JOIN Destinatarios D ON P.id_destinatario = D.id_destinatario
            LEFT JOIN SeguimientoLicitaciones S ON P.id_proceso_db = S.id_proceso_db
            WHERE 1=1
              AND (
                  S.id_seguimiento IS NOT NULL
                  OR EXISTS (SELECT 1 FROM Renglones R3 WHERE R3.id_proceso_db = P.id_proceso_db AND R3.mi_pu > 0)
              )
        `;

        const values = [];
        let currentIndex = 1;

        if (q && q.trim() !== '') {
            query += `
                AND (
                    P.nro_proceso ILIKE $${currentIndex}
                    OR D.nombre_hospital ILIKE $${currentIndex}

                    OR EXISTS (
                        SELECT 1 FROM Renglones R_Search
                        INNER JOIN Productos P_Search ON R_Search.id_producto = P_Search.id_producto
                        WHERE R_Search.id_proceso_db = P.id_proceso_db
                          AND P_Search.nombre_detalle ILIKE $${currentIndex}
                    )
                )
            `;
            values.push(`%${q}%`);
            currentIndex++;
        }

        if (provincia && provincia !== 'Todas') {
            query += ` AND D.provincia = $${currentIndex} `;
            values.push(provincia);
            currentIndex++;
        }

        if (hospital && hospital !== 'Todos') {
            query += ` AND D.nombre_hospital = $${currentIndex} `;
            values.push(hospital);
            currentIndex++;
        }

        if (estado && estado !== 'Todos') {
            query += ` AND COALESCE(S.estado, 'PRESENTADA') = $${currentIndex} `;
            values.push(estado);
            currentIndex++;
        }

        if (fechaDesde) {
            query += ` AND P.fecha_apertura >= $${currentIndex} `;
            values.push(fechaDesde);
            currentIndex++;
        }

        if (fechaHasta) {
            query += ` AND P.fecha_apertura <= $${currentIndex} `;
            values.push(fechaHasta);
            currentIndex++;
        }

        // Envolver en un CTE para contar el total real de filas y paginar
        const paginatedQuery = `
            WITH MainCTE AS (
                ${query}
            )
            SELECT 
                (SELECT COUNT(*) FROM MainCTE) AS "TotalRows",
                *
            FROM MainCTE
            ORDER BY fecha_apertura DESC
            LIMIT $${currentIndex} OFFSET $${currentIndex + 1};
        `;

        const finalValues = [...values, limitNum, offset];
        const result = await pool.query(paginatedQuery, finalValues);
        const records = result.rows;
        const total = records.length > 0 ? parseInt(records[0].TotalRows, 10) : 0;
        const totalPages = Math.ceil(total / limitNum);

        res.json({
            data: records,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages
        });

    } catch (err) {
        logger.error('Error getSeguimientos: ' + err.message);
        res.status(500).json({
            error: "Ocurrió un error interno. Por favor, intentá nuevamente."
        });
    }
};

// =========================
// DETALLE DESPLEGABLE
// =========================

exports.getDetalleSeguimiento = async (req, res) => {
    try {
        const pool = await poolPromise;
        const { idProceso } = req.params;

        

        // 1. DATOS COMERCIALES
        const seguimiento = await pool.query(`
            SELECT *
            FROM SeguimientoLicitaciones
            WHERE id_proceso_db = $1
        `, [idProceso]);

        // 3. COMPARATIVA (RENGLONES)
        const comparativa = await pool.query(`
            SELECT
                R.nro_renglon_item,
                PR.nombre_detalle,
                R.cantidad,
                R.mi_marca,
                R.mi_pu,
                R.precio_ganador,
                R.primer_oferente,
                (CASE WHEN R.mi_pu > 0 AND R.mi_pu = R.precio_ganador THEN 1 ELSE 0 END) AS ganamos
            FROM Renglones R
            INNER JOIN Productos PR ON R.id_producto = PR.id_producto
            WHERE R.id_proceso_db = $1
            ORDER BY CAST(NULLIF(regexp_replace(R.nro_renglon_item, '[^0-9]', '', 'g'), '') AS INTEGER)
        `, [idProceso]);

        res.json({
            seguimiento: seguimiento.rows[0] || null,
            renglones: comparativa.rows || []
        });

    } catch (err) {
        logger.error('Error detalle seguimiento: ' + err.message);
        res.status(500).json({
            error: "Ocurrió un error interno. Por favor, intentá nuevamente."
        });
    }
};

// =========================
// UPDATE
// =========================

exports.updateSeguimiento = async (req, res) => {
    let client;
    try {
        const pool = await poolPromise;
        const { idProceso } = req.params;
        
        const {
            estado,
            comparativa_solicitada,
            comparativa_cargada,
            link_drive,
            nro_oc,
            fecha_recibida_oc,
            importe_cotizado,
            importe_adjudicado,
            monto_bajas,
            nro_nv,
            nro_factura,
            observaciones
        } = req.body;

        client = await pool.pgPool.connect();
        await client.query('BEGIN');

        // Comprobación de existencia del registro con bloqueo
        const checkRes = await client.query(`
            SELECT 1 
            FROM SeguimientoLicitaciones 
            WHERE id_proceso_db = $1
            FOR UPDATE
        `, [idProceso]);

        if (checkRes.rows.length > 0) {
            // UPDATE
            await client.query(`
                UPDATE SeguimientoLicitaciones
                SET
                    estado = $2,
                    comparativa_solicitada = $3,
                    comparativa_cargada = $4,
                    link_drive = $5,
                    nro_oc = $6,
                    fecha_recibida_oc = $7,
                    importe_cotizado = $8,
                    importe_adjudicado = $9,
                    monto_bajas = $10,
                    nro_nv = $11,
                    nro_factura = $12,
                    observaciones = $13
                WHERE id_proceso_db = $1
            `, [
                idProceso,
                estado,
                comparativa_solicitada,
                comparativa_cargada,
                link_drive,
                nro_oc,
                fecha_recibida_oc || null,
                importe_cotizado || 0,
                importe_adjudicado || 0,
                monto_bajas || 0,
                nro_nv,
                nro_factura,
                observaciones
            ]);
        } else {
            // INSERT
            await client.query(`
                INSERT INTO SeguimientoLicitaciones (
                    id_proceso_db,
                    estado,
                    comparativa_solicitada,
                    comparativa_cargada,
                    link_drive,
                    nro_oc,
                    fecha_recibida_oc,
                    importe_cotizado,
                    importe_adjudicado,
                    monto_bajas,
                    nro_nv,
                    nro_factura,
                    observaciones
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
                )
            `, [
                idProceso,
                estado,
                comparativa_solicitada,
                comparativa_cargada,
                link_drive,
                nro_oc,
                fecha_recibida_oc || null,
                importe_cotizado || 0,
                importe_adjudicado || 0,
                monto_bajas || 0,
                nro_nv,
                nro_factura,
                observaciones
            ]);
        }

        await client.query('COMMIT');
        res.json({ ok: true });

    } catch (err) {
        if (client) await client.query('ROLLBACK');
        logger.error('Error update seguimiento: ' + err.message);
        res.status(500).json({
            error: "Ocurrió un error interno. Por favor, intentá nuevamente."
        });
    } finally {
        if (client) client.release();
    }
};