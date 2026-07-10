const pdf = require('pdf-parse');
const OpenAI = require('openai');
const { poolPromise } = require('../config/db');
const logger = require('../utils/logger');
const { resolverEmpresaActiva } = require('../utils/empresaAccess');

const clientOptions = { apiKey: process.env.OPENAI_API_KEY };
if (process.env.OPENAI_API_BASE_URL) {
    clientOptions.baseURL = process.env.OPENAI_API_BASE_URL;
}
const openai = new OpenAI(clientOptions);

const getModelName = (modelKey) => {
    const isGemini = process.env.OPENAI_API_BASE_URL && process.env.OPENAI_API_BASE_URL.includes('googleapis.com');
    if (isGemini) {
        return modelKey === 'fast' ? 'gemini-1.5-flash' : 'gemini-1.5-pro';
    }
    return modelKey === 'fast' ? 'gpt-4o-mini' : 'gpt-4o';
};

const analizarPdf = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se subió ningún archivo PDF.' });
        }

        const data = await pdf(req.file.buffer);
        const rawText = data.text;

        if (!rawText || rawText.trim().length === 0) {
            return res.status(400).json({ error: 'El PDF parece estar vacío o no contiene texto legible.' });
        }

        // Llamar a OpenAI para estructurar el contenido en JSON
        const response = await openai.chat.completions.create({
            model: getModelName('fast'),
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `Eres un asistente experto en procesamiento de licitaciones públicas de droguerías.
Extrae la información clave de la cotización contenida en el texto y devuélvela estrictamente en el siguiente esquema JSON.
IMPORTANTE: Extrae ÚNICAMENTE los renglones/ítems que hayan sido cotizados (es decir, aquellos que posean un precio unitario mayor a 0). Ignora cualquier renglón sin cotizar, incluso si tiene una marca o laboratorio asignado pero su precio unitario es 0, nulo, inexistente o vacío.
{
  "nro_proceso": "Número de proceso, licitación o contratación (por ejemplo: CD 123/2026)",
  "hospital": "Nombre del hospital o ministerio (por ejemplo: MINISTERIO DE SALUD, HOSPITAL MILITAR, etc.)",
  "importe_cotizado": 150000.00, // Suma total cotizada en número decimal
  "items": [
    {
      "renglon": "Número de renglón o ítem (por ejemplo: '1', '2a')",
      "detalle": "Detalle o nombre del producto/droga/insumo cotizado",
      "cantidad": 100, // Número entero de cantidad cotizada
      "marca": "Marca o laboratorio cotizado",
      "precio_unitario": 1500.00 // Número decimal del precio unitario cotizado
    }
  ]
}`
                },
                {
                    role: "user",
                    content: rawText
                }
            ],
            temperature: 0.1
        });

        const structuredData = JSON.parse(response.choices[0].message.content);
        res.json(structuredData);
    } catch (err) {
        logger.error('Error al analizar PDF de cotización: ' + err.message);
        res.status(500).json({ error: 'Ocurrió un error interno. Por favor, intentá nuevamente.' });
    }
};

const normalizarNombreHospital = (nombre) => {
    if (!nombre) return '';
    return nombre.toString()
        .toUpperCase()
        .replace(/\./g, '')       // Quitar puntos
        .replace(/,/g, '')        // Quitar comas
        .replace(/-/g, ' ')       // Reemplazar guiones por espacios
        .replace(/\s+/g, ' ')     // Colapsar espacios múltiples
        .trim();
};

const normalizarNroProceso = (nro) => {
    if (!nro || nro === 'S/D') return 'S/D';
    return nro.toString()
        .trim()
        .toUpperCase()
        .replace(/-/g, '/')          // Normalize dashes to slashes
        .replace(/\b0+(\d+)/g, '$1') // Strip leading zeros in numeric parts
        .replace(/\s+/g, '');        // Strip all spaces
};

const confirmarImportacion = async (req, res) => {
    const { nro_proceso, hospital, importe_cotizado, items, fecha } = req.body;
    const userId = req.user?.id_usuario || null;
    
    // Evitar desajustes de zona horaria agregando hora local de mediodía
    const fechaCotizacion = fecha ? `${fecha} 12:00:00` : new Date();

    if (!nro_proceso || !hospital || !items || !Array.isArray(items)) {
        return res.status(400).json({ error: 'Faltan datos requeridos para confirmar la importación.' });
    }

    const hospitalNormalizado = normalizarNombreHospital(hospital);
    const nroProcesoNormalizado = normalizarNroProceso(nro_proceso);
    const pool = await poolPromise;
    const client = await pool.pgPool.connect();

    try {
        await client.query('BEGIN');

        // 1. Buscar o Crear el Destinatario/Hospital
        let id_destinatario = null;
        const destRes = await client.query(`
            SELECT id_destinatario FROM Destinatarios 
            WHERE TRIM(UPPER(nombre_hospital)) = TRIM(UPPER($1))
            LIMIT 1
        `, [hospitalNormalizado]);

        if (destRes.rows.length > 0) {
            id_destinatario = destRes.rows[0].id_destinatario;
        } else {
            // Si no existe, crear uno genérico
            const newDest = await client.query(`
                INSERT INTO Destinatarios (nombre_hospital, provincia)
                VALUES ($1, 'CORDOBA')
                RETURNING id_destinatario
            `, [hospitalNormalizado]);
            id_destinatario = newDest.rows[0].id_destinatario;
        }

        // 2. Upsert Proceso
        const procRes = await client.query(`
            INSERT INTO Procesos (nro_proceso, fecha_apertura, id_destinatario, id_usuario_creador, fecha_importacion)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (nro_proceso, id_destinatario)
            DO UPDATE SET fecha_importacion = NOW(), fecha_apertura = EXCLUDED.fecha_apertura, id_usuario_creador = EXCLUDED.id_usuario_creador
            RETURNING id_proceso_db;
        `, [nroProcesoNormalizado, fechaCotizacion, id_destinatario, userId]);
        const id_proceso_db = procRes.rows[0].id_proceso_db;

        // 3. Limpiar registros anteriores de Diarias para este proceso y empresa
        await client.query(`
            DELETE FROM Diarias 
            WHERE id_proceso_db = $1 AND empresa = $2
        `, [id_proceso_db, targetEmpresa]);

        // 4. Insertar ítems en Diarias (filtrando únicamente los cotizados con precio > 0)
        const itemsCotizados = items.filter(item => (parseFloat(item.precio_unitario) || 0) > 0);
        for (const item of itemsCotizados) {
            await client.query(`
                INSERT INTO Diarias (id_proceso_db, empresa, renglon, detalle, cantidad, marca, precio_unitario, fecha)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                id_proceso_db,
                targetEmpresa,
                String(item.renglon || ''),
                item.detalle || '',
                parseInt(item.cantidad) || 0,
                item.marca || '',
                parseFloat(item.precio_unitario) || 0,
                fechaCotizacion
            ]);
        }

        // 5. Upsert en SeguimientoLicitaciones
        const checkSeg = await client.query(`
            SELECT 1 FROM SeguimientoLicitaciones 
            WHERE id_proceso_db = $1 AND empresa = $2
        `, [id_proceso_db, targetEmpresa]);

        if (checkSeg.rows.length > 0) {
            await client.query(`
                UPDATE SeguimientoLicitaciones
                SET estado = 'PRESENTADA', importe_cotizado = $3
                WHERE id_proceso_db = $1 AND empresa = $2
            `, [id_proceso_db, targetEmpresa, parseFloat(importe_cotizado) || 0]);
        } else {
            await client.query(`
                INSERT INTO SeguimientoLicitaciones (id_proceso_db, empresa, estado, importe_cotizado)
                VALUES ($1, $2, 'PRESENTADA', $3)
            `, [id_proceso_db, targetEmpresa, parseFloat(importe_cotizado) || 0]);
        }

        await client.query('COMMIT');
        res.json({ success: true, id_proceso_db });
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error('Error al confirmar importación PDF: ' + err.message);
        res.status(500).json({ error: 'Ocurrió un error interno. Por favor, intentá nuevamente.' });
    } finally {
        client.release();
    }
};

module.exports = {
    analizarPdf,
    confirmarImportacion
};
