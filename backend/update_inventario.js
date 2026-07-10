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
  await pool.query('UPDATE Inventario SET empresa = \'DROGUERIA DEMO\' WHERE empresa = \'MOCK_DROGUERIA\'');
  console.log("Updated MOCK_DROGUERIA to DROGUERIA DEMO");
  process.exit(0);
}
run();
