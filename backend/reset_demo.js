const { execSync } = require('child_process');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'licitaciones_db',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5432,
});

async function resetDB() {
    console.log("⚠️ Iniciando RESET de base de datos para versión Demo...");
    try {
        // Limpiamos las tablas transaccionales y maestras (dejando la estructura)
        console.log("1. Limpiando tablas...");
        await pool.query(`
            TRUNCATE TABLE Renglones, Procesos, Notificaciones, MapeoProductosIA CASCADE;
            TRUNCATE TABLE Inventario, Destinatarios, ContactosHospitales, Productos, ProductosPM, Usuarios CASCADE;
        `);
        console.log("✅ Tablas limpias.");

        // Ejecutar seeds
        console.log("2. Ejecutando seed.js...");
        execSync('node src/scripts/seed.js', { stdio: 'inherit' });
        
        console.log("3. Ejecutando add_inventory.js...");
        execSync('node add_inventory.js', { stdio: 'inherit' });

        console.log("4. Ejecutando seed_stats.js...");
        execSync('node seed_stats.js', { stdio: 'inherit' });

        console.log("🎉 Reset exitoso. Base de datos restaurada al estado Demo.");
    } catch (err) {
        console.error("❌ Error durante el reset:", err);
    } finally {
        process.exit();
    }
}

resetDB();
