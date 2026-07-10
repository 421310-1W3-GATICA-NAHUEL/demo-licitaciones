const { Pool } = require('pg');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_SERVER || process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 25 // Límite máximo de conexiones concurrentes para producción
};

const logger = require('../utils/logger');

const pool = new Pool(dbConfig);

// Wrapper minimalista para mantener la API request().query(sqlText, values) temporalmente
class MinimalRequest {
    constructor(pgPool) {
        this.pgPool = pgPool;
    }

    // Firma simulada para compatibilidad temporal en transición
    input() {
        return this;
    }

    async query(sqlText, paramsArray = []) {
        try {
            const res = await this.pgPool.query(sqlText, paramsArray);
            
            // Si es un array de respuestas (múltiples statements)
            if (Array.isArray(res)) {
                const mappedRecordsets = res.map(singleRes => singleRes.rows || []);
                const finalRows = mappedRecordsets.length > 0 ? mappedRecordsets[mappedRecordsets.length - 1] : [];
                return {
                    recordset: finalRows,
                    rowsAffected: res.map(r => r.rowCount),
                    recordsets: mappedRecordsets
                };
            } else {
                const mappedRows = res.rows || [];
                return {
                    recordset: mappedRows,
                    rowsAffected: [res.rowCount],
                    recordsets: [mappedRows]
                };
            }
        } catch (error) {
            logger.error(`Error ejecutando query nativo:\nSQL: ${sqlText}\nValores: ${JSON.stringify(paramsArray)}\nError: ${error.message}`);
            throw error;
        }
    }
}

const poolPromise = pool.connect()
    .then(client => {
        logger.info('✅ Conectado a PostgreSQL con éxito');
        client.release();
        return {
            request: () => new MinimalRequest(pool),
            // Exponer método directo de pool para migraciones nativas limpias
            query: (text, params) => pool.query(text, params),
            pgPool: pool
        };
    })
    .catch(err => {
        logger.error('❌ Error de conexión a PostgreSQL: ' + err.message);
        process.exit(1);
    });

const sqlMock = {
    Int: 'Int',
    NVarChar: 'NVarChar',
    VarChar: 'VarChar',
    Bit: 'Bit',
    DateTime: 'DateTime',
    Decimal: 'Decimal',
    Text: 'Text'
};

module.exports = {
    sql: sqlMock,
    poolPromise
};