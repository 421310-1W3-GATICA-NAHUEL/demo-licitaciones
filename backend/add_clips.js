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
  await pool.query("INSERT INTO Inventario (codigo, empresa, detalle, marca, linea, sublinea, costo, precio_final, stock, disponible) VALUES ('I003', 'DROGUERIA DEMO', 'CLIPS DE TITANIO PARA ENDOSCOPIA M (TIPO LT 200)', 'ENDOCLIP', 'INSUMOS', 'CIRUGIA', 15000, 22000, 50, 50)");
  console.log("Added clips to DB");
  process.exit(0);
}
run();
