const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'licitaciones_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432
});
async function run() {
  const res = await pool.query("SELECT * FROM Inventario WHERE empresa = 'DROGUERIA DEMO' AND (detalle ILIKE '%AMOXICILINA%' OR codigo ILIKE '%AMOXICILINA%')");
  console.log('AMOXICILINA:', res.rows.length);
  const res2 = await pool.query("SELECT * FROM Inventario WHERE empresa = 'DROGUERIA DEMO' AND (detalle ILIKE '%DICLOFENAC%' OR codigo ILIKE '%DICLOFENAC%')");
  console.log('DICLOFENAC:', res2.rows.length);
  process.exit(0);
}
run();
