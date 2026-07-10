const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'licitaciones_db',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5432,
});

async function main() {
  try {
    // 1. Update User to have import permissions
    await pool.query("UPDATE Usuarios SET puede_importar = true WHERE email = 'admin@drogueria.local'");
    console.log("Usuario admin actualizado para poder importar.");

    // 2. Insert more fake inventory data
    const categories = ['Cardiología', 'Neurología', 'Oncología', 'Pediatría', 'Traumatología', 'Gastroenterología', 'Infectología'];
    const names = ['Ampollas', 'Comprimidos', 'Inyectable', 'Suspensión', 'Jarabe', 'Pomada', 'Gotas'];
    const drugs = ['Cefalexina', 'Ibuprofeno', 'Diclofenac', 'Omeprazol', 'Amoxicilina', 'Paracetamol', 'Losartan', 'Enalapril'];
    
    let valuesArr = [];
    let queryArgs = [];
    let count = 1;

    for (let i = 0; i < 60; i++) {
        const codigo = 'PROD-' + Math.floor(Math.random() * 90000 + 10000);
        const empresa = 'BAYER'; // Or TODAS? Let's use 'TODAS' since the system is moving towards single-tenant
        const detalle = `${drugs[Math.floor(Math.random() * drugs.length)]} ${Math.floor(Math.random() * 500 + 10)}mg ${names[Math.floor(Math.random() * names.length)]}`;
        const marca = 'Bayer';
        const linea = categories[Math.floor(Math.random() * categories.length)];
        const sublinea = 'General';
        const costo = (Math.random() * 10000 + 100).toFixed(2);
        const precio_final = (parseFloat(costo) * 1.5).toFixed(2);
        const stock = Math.floor(Math.random() * 5000) + 50;
        
        valuesArr.push(`($${count++}, $${count++}, $${count++}, $${count++}, $${count++}, $${count++}, $${count++}, $${count++}, $${count++})`);
        queryArgs.push(codigo, empresa, detalle, marca, linea, sublinea, costo, precio_final, stock);
    }

    const queryStr = `
        INSERT INTO Inventario (codigo, empresa, detalle, marca, linea, sublinea, costo, precio_final, stock)
        VALUES ${valuesArr.join(', ')}
    `;

    await pool.query(queryStr, queryArgs);
    console.log("Inventario ampliado con 60 nuevos productos ficticios.");
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

main();
