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
  await pool.query("INSERT INTO Inventario (codigo, empresa, detalle, marca, linea, sublinea, costo, precio_final, stock, disponible) SELECT codigo || '-mock', 'MOCK_DROGUERIA', detalle, marca, linea, sublinea, costo, precio_final, stock, disponible FROM Inventario WHERE empresa = 'DROGUERIA DEMO' ON CONFLICT DO NOTHING");
  console.log('Copied inventory to MOCK_DROGUERIA');
  process.exit(0);
}
run();
