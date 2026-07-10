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
  await pool.query("INSERT INTO Inventario (codigo, empresa, detalle, marca, linea, sublinea, costo, precio_final, stock, disponible) VALUES ('M004', 'DROGUERIA DEMO', 'DICLOFENAC 50mg X 30 COMP', 'BAYER', 'MEDICAMENTOS', 'ANALGESICOS', 600, 900, 1500, 1500)");
  console.log("Added Diclofenac to DB");
  process.exit(0);
}
run();
