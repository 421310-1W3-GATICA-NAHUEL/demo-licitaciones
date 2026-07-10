const { poolPromise } = require('./config/db');
require('dotenv').config();
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
async function run() {
  const pool = await poolPromise;
  const detalle = 'PARACETAMOL 500mg X 50 COMP';
  const empresaActiva = 'DROGUERIA DEMO';
  
  let palabras = detalle.split(/[\s,\.\(\)\-\/]+/).map(p => p.trim().toLowerCase()).filter(p => p.length > 1);
  const values = [empresaActiva];
  let paramIndex = 2;
  
  const palabraIdxMap = palabras.map(p => {
    values.push(`%${p}%`);
    return paramIndex++;
  });
  
  const selectInventario = palabraIdxMap.map(idx => `(CASE WHEN detalle ILIKE $${idx} THEN 1 ELSE 0 END)`).join(' + ');
  const condInventario = palabraIdxMap.map(idx => `(detalle ILIKE $${idx} OR codigo ILIKE $${idx})`).join(' OR ');
  
  const queryInventario = `SELECT *, (${selectInventario}) as relevancia FROM Inventario WHERE empresa = $1 AND (${condInventario}) ORDER BY relevancia DESC, stock DESC, detalle ASC LIMIT 15`;
  
  const resInventario = await pool.query(queryInventario, values);
  let matches = resInventario.rows;
  console.log("DB Matches found:", matches.length);
  
  if (matches.length > 0) {
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
    console.log("Sending to OpenAI...");
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0
    });
    console.log("AI Response:", aiResponse.choices[0].message.content);
  }
  process.exit(0);
}
run();
