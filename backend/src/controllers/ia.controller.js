const OpenAI = require('openai');
const { poolPromise } = require('../config/db');
const logger = require('../utils/logger');

exports.procesarMensaje = async (req, res) => {
    try {
        const { mensaje } = req.body;
        
        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: "Falta configurar la API KEY de OpenAI en el servidor." });
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // Obtener un resumen del inventario para darle contexto a la IA (Top 50 items)
        const pool = await poolPromise;
        const inventarioRes = await pool.query('SELECT codigo, detalle, stock, precio_final FROM Inventario LIMIT 50');
        const inventarioContext = inventarioRes.rows.map(item => `- ${item.codigo} | ${item.detalle} | Stock: ${item.stock} | Precio: $${item.precio_final}`).join('\n');

        // Obtener ultimas licitaciones (procesos y renglones) para contexto
        const licitacionesRes = await pool.query(`
            SELECT 
                p.nro_proceso, 
                d.nombre_hospital,
                p.fecha_apertura,
                r.nro_renglon_item,
                r.precio_ganador,
                r.primer_oferente,
                r.mi_pu,
                r.ganamos
            FROM Procesos p
            JOIN Renglones r ON p.id_proceso_db = r.id_proceso_db
            LEFT JOIN Destinatarios d ON p.id_destinatario = d.id_destinatario
            ORDER BY p.fecha_apertura DESC
            LIMIT 15
        `);
        
        const licitacionesContext = licitacionesRes.rows.map(l => {
            const estado = l.ganamos === 1 ? '¡GANAMOS!' : (l.mi_pu > 0 ? 'Perdimos' : 'No cotizamos');
            return `- Proceso: ${l.nro_proceso} (${l.nombre_hospital}) | Renglón: ${l.nro_renglon_item} | Estado: ${estado} | Ganador: ${l.primer_oferente} ($${l.precio_ganador}) | Nuestro Precio: $${l.mi_pu}`;
        }).join('\n');

        // Obtener estadísticas globales para preguntas generales
        const statsRes = await pool.query(`
            SELECT 
                COUNT(*) as total_renglones,
                SUM(CASE WHEN ganamos = 1 THEN 1 ELSE 0 END) as ganados,
                SUM(CASE WHEN ganamos = 0 AND mi_pu > 0 THEN 1 ELSE 0 END) as perdidos,
                SUM(CASE WHEN mi_pu = 0 THEN 1 ELSE 0 END) as no_cotizados
            FROM Renglones
        `);
        const stats = statsRes.rows[0];
        
        const competidoresRes = await pool.query(`
            SELECT primer_oferente, COUNT(*) as victorias 
            FROM Renglones 
            WHERE ganamos = 0 AND primer_oferente IS NOT NULL AND primer_oferente <> ''
            GROUP BY primer_oferente 
            ORDER BY victorias DESC 
            LIMIT 5
        `);
        const competidoresContext = competidoresRes.rows.map(c => `- ${c.primer_oferente}: ${c.victorias} victorias`).join('\n');

        const systemPrompt = `Eres un experto analista e IA para una empresa distribuidora de insumos médicos y droguería.
Tu objetivo es ayudar al usuario a consultar datos sobre productos, stock, precios, historial y estadísticas generales.
Sé conciso, profesional, muy analítico y amable.

Estadísticas Globales de la Empresa:
- Licitaciones totales participadas/registradas: ${stats.total_renglones}
- Ganadas: ${stats.ganados}
- Perdidas: ${stats.perdidos}
- No Cotizadas: ${stats.no_cotizados}

Top Competidores (Quiénes nos ganan más licitaciones):
${competidoresContext || 'No hay datos de competidores aún.'}

Inventario actual (muestra parcial):
${inventarioContext}

Últimas licitaciones / procesos (historial reciente):
${licitacionesContext}

Responde a la consulta del usuario basándote rigurosamente en estos datos.`;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: mensaje }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        res.json({ respuestaIA: response.choices[0].message.content });
    } catch (error) {
        logger.error('Error en Asistente IA: ' + error.message);
        res.status(500).json({ error: "Ocurrió un error al procesar tu solicitud con la IA." });
    }
};