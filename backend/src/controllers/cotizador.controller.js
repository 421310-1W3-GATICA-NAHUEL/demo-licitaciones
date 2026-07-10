const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');
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

const normalizarNombreColumna = (col) => {
    if (!col) return '';
    return col.toString().toLowerCase().trim()
        .replace(/_/g, ' ')
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Limpiadores numéricos
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

// Procesar documento de cotización
exports.procesarCotizacion = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se ha subido ningún archivo' });
        }

        const mimeType = req.file.mimetype;
        const filename = req.file.originalname.toLowerCase();
        let items = [];

        // 1. SI ES EXCEL
        if (mimeType.includes('sheet') || mimeType.includes('excel') || filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
            const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json(worksheet, { defval: null });

            if (rows.length > 0) {
                // Detectar columnas
                const sampleRow = rows[0];
                const colMap = {};
                for (const rawKey of Object.keys(sampleRow)) {
                    const normKey = normalizarNombreColumna(rawKey);
                    if (normKey === 'renglon' || normKey === 'item' || normKey === 'pos' || normKey === 'nro') {
                        colMap.renglon = rawKey;
                    } else if (normKey.includes('cant') || normKey === 'cantidad' || normKey === 'qty') {
                        colMap.cantidad = rawKey;
                    } else if (normKey.includes('detalle') || normKey === 'producto' || normKey === 'descripcion' || normKey === 'insumo' || normKey === 'droga') {
                        colMap.detalle = rawKey;
                    } else if (normKey === 'marca' || normKey === 'brand') {
                        colMap.marca = rawKey;
                    } else if (normKey.includes('precio') || normKey === 'unitario' || normKey === 'pu') {
                        colMap.precio_unitario = rawKey;
                    }
                }

                // Si no se detectaron columnas por nombres, hacemos mapeo por orden
                const keys = Object.keys(sampleRow);
                const getVal = (row, field, indexFallback) => {
                    if (colMap[field]) return row[colMap[field]];
                    if (keys[indexFallback] !== undefined) return row[keys[indexFallback]];
                    return null;
                };

                items = rows.map((row, idx) => {
                    const renglonVal = getVal(row, 'renglon', 0);
                    const cantVal = getVal(row, 'cantidad', 1);
                    const detalleVal = getVal(row, 'detalle', 2);
                    const marcaVal = colMap.marca ? row[colMap.marca] : '';
                    const puVal = colMap.precio_unitario ? row[colMap.precio_unitario] : 0;

                    return {
                        id: idx + 1,
                        renglon: renglonVal ? String(renglonVal).trim() : String(idx + 1),
                        cantidad: limpiarEntero(cantVal),
                        detalle: detalleVal ? String(detalleVal).trim() : '',
                        marca: marcaVal ? String(marcaVal).trim() : '',
                        precio_unitario: limpiarPrecio(puVal),
                        matches: [],
                        historial: []
                    };
                }).filter(item => item.detalle && item.detalle.length > 2);
            }
        }
        // 2. SI ES PDF
        else if (mimeType.includes('pdf') || filename.endsWith('.pdf')) {
            const data = await pdfParse(req.file.buffer);
            const text = data.text;

            // Extraer ítems usando OpenAI estructurado
            try {
                const prompt = `Actúas como un extractor de datos de licitaciones médicas en Argentina de documentos PDF.
Analiza el siguiente texto extraído de un PDF de licitación y extrae todos los renglones o ítems de productos que se solicitan comprar.

Texto del PDF:
"""
${text.slice(0, 15000)}
"""

Tu respuesta debe ser estrictamente un objeto JSON con el siguiente formato:
{
    "items": [
        {
            "renglon": "Número de renglón/ítem (ej: '1', '2a', etc.)",
            "cantidad": <cantidad numérica solicitada (entero)>,
            "detalle": "Nombre descriptivo completo del producto o droga solicitado",
            "marca": "Marca preferida/sugerida si se menciona, o vacío si no se especifica",
            "precio_unitario": <precio unitario sugerido o de referencia si se menciona, caso contrario 0>
        },
        ...
    ]
}`;

                const aiResponse = await openai.chat.completions.create({
                    model: getModelName('fast'),
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" },
                    temperature: 0
                });

                const parsed = JSON.parse(aiResponse.choices[0].message.content);
                if (parsed.items && Array.isArray(parsed.items)) {
                    items = parsed.items.map((it, idx) => ({
                        id: idx + 1,
                        renglon: it.renglon ? String(it.renglon).trim() : String(idx + 1),
                        cantidad: limpiarEntero(it.cantidad),
                        detalle: it.detalle ? String(it.detalle).trim() : '',
                        marca: it.marca ? String(it.marca).trim() : '',
                        precio_unitario: limpiarPrecio(it.precio_unitario),
                        matches: [],
                        historial: []
                    })).filter(it => it.detalle && it.detalle.length > 2);
                }
            } catch (aiErr) {
                console.error('Error al parsear PDF con OpenAI:', aiErr);
                throw new Error('No se pudo extraer de forma estructurada el contenido del PDF mediante IA.');
            }
        }
        // 3. SI ES IMAGEN (Ocr mediante GPT-4o)
        else if (mimeType.includes('image') || filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
            try {
                const base64Image = req.file.buffer.toString('base64');
                const prompt = `Analiza la siguiente imagen de una licitación médica y extrae todos los renglones de productos que se solicitan.

Tu respuesta debe ser estrictamente un objeto JSON con el siguiente formato:
{
    "items": [
        {
            "renglon": "Número de renglón/ítem",
            "cantidad": <cantidad numérica solicitada (entero)>,
            "detalle": "Nombre descriptivo del producto/droga",
            "marca": "Marca preferida si figura, o vacío",
            "precio_unitario": <precio de referencia si figura, o 0>
        },
        ...
    ]
}`;

                const aiResponse = await openai.chat.completions.create({
                    model: getModelName('fast'),
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: `data:${mimeType};base64,${base64Image}`
                                    }
                                }
                            ]
                        }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0
                });

                const parsed = JSON.parse(aiResponse.choices[0].message.content);
                if (parsed.items && Array.isArray(parsed.items)) {
                    items = parsed.items.map((it, idx) => ({
                        id: idx + 1,
                        renglon: it.renglon ? String(it.renglon).trim() : String(idx + 1),
                        cantidad: limpiarEntero(it.cantidad),
                        detalle: it.detalle ? String(it.detalle).trim() : '',
                        marca: it.marca ? String(it.marca).trim() : '',
                        precio_unitario: limpiarPrecio(it.precio_unitario),
                        matches: [],
                        historial: []
                    })).filter(it => it.detalle && it.detalle.length > 2);
                }
            } catch (ocrErr) {
                console.error('Error al realizar OCR con OpenAI:', ocrErr);
                throw new Error('No se pudo analizar la imagen de la licitación mediante el modelo de visión de IA.');
            }
        } else {
            return res.status(400).json({ error: 'El formato de archivo no es compatible. Suba un archivo Excel (.xlsx), PDF (.pdf) o Imagen (.png, .jpg).' });
        }

        // Retornar los ítems iniciales estructurados
        res.json({ items });

    } catch (err) {
        logger.error('Error al procesar cotización: ' + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// Buscar coincidencias en catálogo e historial competitivo para un ítem
exports.buscarMatchesYHistorial = async (req, res) => {
    try {
        const { detalle } = req.body;
        if (!detalle) {
            return res.status(400).json({ error: 'Detalle de producto requerido' });
        }

        const pool = await poolPromise;
        const empresaActiva = resolverEmpresaActiva(req, 'SHORT');

        // 1. Expandir dinámicamente las palabras clave del detalle para búsqueda inteligente (soportando abreviaturas médicas, ej: termosensible -> termosen)
        let palabras = [];
        try {
            const expansionPrompt = `Actúas como un experto en licitaciones de salud e insumos médicos en Argentina.
Dado el detalle de un producto solicitado en una licitación, tu tarea es generar un array JSON de palabras clave, sus variaciones comunes, raíces de palabras y abreviaturas médicas frecuentes (por ejemplo, 'electrocardiografía' o 'electrocardiograma' -> 'ecg', 'termosensible' -> 'termosen', 'fisiológica' -> 'fisiol', 'solución' -> 'sol').
Esto se usará para realizar búsquedas con el operador SQL LIKE, por lo que cada término en el array JSON debe ser corto (idealmente entre 3 y 8 caracteres) y altamente representativo para optimizar la coincidencia.

Producto Solicitado: "${detalle}"

Por favor, responde únicamente con un objeto JSON en este formato exacto:
{
    "keywords": ["palabra1", "palabra2", ...]
}`;

            const aiExpansion = await openai.chat.completions.create({
                model: getModelName('fast'),
                messages: [{ role: "user", content: expansionPrompt }],
                response_format: { type: "json_object" },
                temperature: 0
            });

            const parsedExpansion = JSON.parse(aiExpansion.choices[0].message.content);
            palabras = parsedExpansion.keywords || [];
        } catch (aiErr) {
            console.error('Error al expandir palabras clave con IA:', aiErr);
        }

        // Fallback: Si la IA falla, usamos el split manual estándar
        if (!palabras || palabras.length === 0) {
            const stopWords = new Set(['para', 'con', 'del', 'las', 'los', 'por', 'una', 'uno', 's/d', 's/m', 'como', 'esta', 'este', 'todo', 'que', 'enva', 'envase', 'concentrada', 'concentrado', 'solucion']);
            palabras = detalle.split(/[\s,\.\(\)\-\/]+/)
                .map(p => p.trim().toLowerCase())
                .filter(p => p.length > 1 && !stopWords.has(p));
        }

        const values = [];
        let paramIndex = 1;

        const empresaIdx = paramIndex++;
        values.push(empresaActiva);

        let queryInventario = '';
        let condInventario = '1=2';
        let selectInventario = '0';

        if (palabras.length > 0) {
            const palabraIdxMap = palabras.map(p => {
                const idx = paramIndex++;
                values.push(`%${p}%`);
                return idx;
            });

            selectInventario = palabraIdxMap.map(idx => `(CASE WHEN detalle ILIKE $${idx} THEN 1 ELSE 0 END)`).join(' + ');
            condInventario = palabraIdxMap.map(idx => `(detalle ILIKE $${idx} OR codigo ILIKE $${idx})`).join(' OR ');
        } else {
            const detIdx = paramIndex++;
            values.push(`%${detalle}%`);
            condInventario = `detalle ILIKE $${detIdx}`;
            selectInventario = '1';
        }

        queryInventario = `
            SELECT *, (${selectInventario}) as relevancia
            FROM Inventario
            WHERE empresa = $${empresaIdx} AND (${condInventario})
            ORDER BY relevancia DESC, stock DESC, detalle ASC
            LIMIT 15
        `;

        const resInventario = await pool.query(queryInventario, values);
        let matches = resInventario.rows;

        // 1.5. Consultar si existe un mapeo manual previo (entrenamiento) para este detalle
        let mappedProduct = null;
        try {
            const trimmedDetalle = String(detalle).trim().slice(0, 800);
            const mappingRes = await pool.query(`
                SELECT codigo_inventario 
                FROM MapeoProductosIA 
                WHERE detalle_original = $1 AND empresa = $2
            `, [trimmedDetalle, empresaActiva]);
            
            if (mappingRes.rows.length > 0) {
                const codInventario = mappingRes.rows[0].codigo_inventario;
                const prodRes = await pool.query(`
                    SELECT * 
                    FROM Inventario 
                    WHERE codigo = $1 AND empresa = $2
                `, [codInventario, empresaActiva]);
                if (prodRes.rows.length > 0) {
                    mappedProduct = prodRes.rows[0];
                    mappedProduct.seleccionado_anteriormente = true;
                }
            }
        } catch (mapErr) {
            console.error('Error al buscar mapeo previo:', mapErr);
        }

        if (mappedProduct) {
            matches = matches.filter(m => m.codigo !== mappedProduct.codigo);
            matches.unshift(mappedProduct);
        }

        // 2. Emparejamiento semántico asistido por IA si hay candidatos
        if (matches.length > 0) {
            try {
                const prompt = `Actúas como un experto en licitaciones de droguería y catálogo médico.
Tienes un producto solicitado por un hospital en una licitación, y una lista de productos candidatos reales de nuestro inventario.
Debes identificar si alguno de los candidatos del inventario corresponde al producto solicitado.
MUY IMPORTANTE: Como esto es una DEMO, debes ser EXTREMADAMENTE FLEXIBLE. Si el nombre de la droga o producto principal coincide (por ejemplo, Amoxicilina con Amoxicilina, o Diclofenac con Diclofenac), DEBES marcar matchEncontrado como true y devolver el ID, ¡incluso si las concentraciones (mg), presentaciones o cantidades no son exactamente iguales! Ignora las diferencias numéricas.

Producto Solicitado por Hospital: "${detalle}"

Candidatos del Inventario:
${matches.map((m, index) => `${index + 1}. ID: ${m.id} | Código: ${m.codigo} | Detalle: ${m.detalle} | Marca: ${m.marca}`).join('\n')}

Por favor, analiza y responde únicamente en formato JSON con la siguiente estructura:
{
    "matchEncontrado": true / false,
    "idMatchPerfecto": <ID numérico del producto que coincide, OBLIGATORIO si matchEncontrado es true, aunque no sea perfecto>,
    "explicacion": "Breve explicación..."
}`;

                const aiResponse = await openai.chat.completions.create({
                    model: getModelName('fast'),
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" },
                    temperature: 0
                });

                const parseRes = JSON.parse(aiResponse.choices[0].message.content);
                if (parseRes.matchEncontrado && parseRes.idMatchPerfecto) {
                    const matchIdx = matches.findIndex(m => m.id === Number(parseRes.idMatchPerfecto));
                    if (matchIdx !== -1) {
                        const matchedItem = { 
                            ...matches[matchIdx], 
                            matchPerfecto: true, 
                            explicacionMatch: parseRes.explicacion 
                        };
                        // Lo removemos de su posición original y lo ponemos al inicio
                        matches.splice(matchIdx, 1);
                        matches.unshift(matchedItem);
                    }
                }
            } catch (openaiErr) {
                console.error('Error al realizar emparejamiento semántico con OpenAI:', openaiErr);
            }
        }

        // 3. Buscar historial licitatorio en Renglones para el producto
        let refDetalle = detalle;
        if (matches.length > 0) {
            const firstMatch = matches.find(m => m.matchPerfecto) || matches[0];
            refDetalle = firstMatch.detalle;
        }

        // Combinamos palabras clave del detalle original del hospital y de nuestro catálogo para capturar todas las variaciones posibles en la base de datos de licitaciones
        const stopWordsRef = new Set(['para', 'con', 'del', 'las', 'los', 'por', 'una', 'uno', 's/d', 's/m', 'como', 'esta', 'este', 'todo', 'que', 'enva', 'envase', 'concentrada', 'concentrado', 'solucion']);
        const palabrasRef = refDetalle.split(/[\s,\.\(\)\-\/]+/)
            .map(p => p.trim().toLowerCase())
            .filter(p => p.length > 1 && !stopWordsRef.has(p));

        const palabrasHistSet = new Set([...palabras, ...palabrasRef]);
        const palabrasHist = Array.from(palabrasHistSet);

        const histValues = [];
        let histParamIndex = 1;

        let condHistorial = '';
        let selectHistRelevancia = '0';

        if (palabrasHist.length > 0) {
            const histPalabrasIdxMap = palabrasHist.map(p => {
                const idx = histParamIndex++;
                histValues.push(`%${p}%`);
                return idx;
            });

            selectHistRelevancia = histPalabrasIdxMap.map(idx => `(CASE WHEN P.nombre_detalle ILIKE $${idx} THEN 1 ELSE 0 END)`).join(' + ');
            condHistorial = histPalabrasIdxMap.map(idx => `P.nombre_detalle ILIKE $${idx}`).join(' OR ');
        } else {
            const histDetIdx = histParamIndex++;
            histValues.push(`%${detalle}%`);
            condHistorial = `P.nombre_detalle ILIKE $${histDetIdx}`;
            selectHistRelevancia = '0';
        }

        let queryHistorial = `
            SELECT 
                PR.nro_proceso, PR.fecha_apertura, D.nombre_hospital, D.segmento_provincia, D.provincia, D.tipo_segmento,
                R.nro_renglon_item, R.cantidad, R.precio_ganador, R.primer_oferente, R.marca_ganadora AS marca_1, R.precio_ganador AS precio_1,
                R.segundo_oferente, R.marca_segundo AS marca_2, R.segundo_pu AS precio_2,
                R.mi_pu, R.mi_marca, P.nombre_detalle,
                (CASE WHEN R.mi_pu > 0 AND R.mi_pu = R.precio_ganador THEN 1 ELSE 0 END) AS ganamos,
                (${selectHistRelevancia}) as relevancia
            FROM Renglones R
            INNER JOIN Productos P ON R.id_producto = P.id_producto
            INNER JOIN Procesos PR ON R.id_proceso_db = PR.id_proceso_db
            INNER JOIN Destinatarios D ON R.id_destinatario = D.id_destinatario
            WHERE (${condHistorial})
            ORDER BY relevancia DESC, PR.fecha_apertura DESC
            LIMIT 25
        `;

        let historial = [];
        try {
            const resHistorial = await pool.query(queryHistorial, histValues);
            historial = resHistorial.rows;

            // Filtrado cognitivo mediante OpenAI (gpt-4o-mini) con doble referencia para evitar falsos positivos y falsos negativos
            if (historial.length > 0) {
                const promptFiltrado = `Actúas como un experto en licitaciones de salud en Argentina.
Te dan dos referencias alternativas del mismo producto que estamos buscando (una del hospital y otra de nuestro catálogo interno):
1. Referencia Hospital: "${detalle}"
2. Referencia Catálogo: "${refDetalle}"

Debes evaluar una lista de registros históricos de licitaciones (columna P.nombre_detalle).
Debes identificar cuáles de los registros corresponden al mismo producto bajo evaluación (permitiendo diferencias de redacción y abreviaturas comunes como 'SOL ACIDA', 'SOLUCION ACIDA', etc.).
Si un registro pertenece a otro producto diferente (ej: solución fisiológica, jeringas, agujas, dextrosa, etc.), descártalo.

Registros a evaluar:
${historial.map((h, i) => `${i}. Producto en Licitación: "${h.nombre_detalle}"`).join('\n')}

Responde únicamente en formato JSON con la siguiente estructura:
{
    "indicesValidos": [lista de números de índice válidos]
}`;

                const aiFilterRes = await openai.chat.completions.create({
                    model: getModelName('fast'),
                    messages: [{ role: "user", content: promptFiltrado }],
                    response_format: { type: "json_object" },
                    temperature: 0
                });

                const parsedFilter = JSON.parse(aiFilterRes.choices[0].message.content);
                const indices = parsedFilter.indicesValidos || [];
                historial = historial.filter((_, i) => indices.includes(i)).slice(0, 5); // Quedarse con los primeros 5 filtrados
            }
        } catch (e) {
            console.error('Error al consultar o filtrar historial competitivo:', e);
        }

        res.json({
            matches,
            historial
        });

    } catch (err) {
        logger.error('Error en búsqueda de matches e historial: ' + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

exports.guardarMapeoManual = async (req, res) => {
    try {
        const { detalleOriginal, codigoInventario } = req.body;
        const empresaActiva = resolverEmpresaActiva(req, 'SHORT');
        if (!detalleOriginal || !codigoInventario) {
            return res.status(400).json({ error: 'Faltan parámetros obligatorios' });
        }

        const pool = await poolPromise;
        const trimmedDetalle = String(detalleOriginal).trim().slice(0, 800);
        
        await pool.query(`
            INSERT INTO MapeoProductosIA (detalle_original, codigo_inventario, empresa, fecha_mapeo)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (detalle_original, empresa) 
            DO UPDATE SET 
                codigo_inventario = EXCLUDED.codigo_inventario,
                fecha_mapeo = EXCLUDED.fecha_mapeo
        `, [trimmedDetalle, codigoInventario, empresaActiva]);

        res.json({ success: true, message: 'Entrenamiento guardado con éxito.' });
    } catch (err) {
        logger.error('Error al guardar mapeo manual: ' + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};
