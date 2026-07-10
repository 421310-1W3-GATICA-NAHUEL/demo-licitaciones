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
    console.log("Iniciando inyección de datos estadísticos...");
    
    const competidores = ['Droguería Sur', 'Suizo Argentina', 'Monroe Americana', 'Droguería Comarsa', 'DNM', 'BioFarma', 'Nutrilife'];
    const estados = ['GANADO', 'PERDIDO', 'NO_COTIZADO']; // Simulado por precios

    // Primero verificamos que haya usuarios y destinatarios
    const adminRes = await pool.query("SELECT id_usuario FROM Usuarios WHERE rol = 'admin' LIMIT 1");
    if (adminRes.rowCount === 0) {
        throw new Error("No hay usuarios admin.");
    }
    const userId = adminRes.rows[0].id_usuario;

    let destRes = await pool.query("SELECT id_destinatario FROM Destinatarios");
    if (destRes.rowCount <= 2) {
        // Insertamos destinatarios si no hay suficientes
        console.log("Insertando Destinatarios de prueba...");
        const destVals = ['Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza', 'Tucumán', 'Salta', 'Entre Ríos', 'San Juan', 'La Pampa', 'Catamarca', 'Neuquén', 'Río Negro', 'Chaco', 'Corrientes'].map((prov, i) => `('Hospital ${prov} ${i}', '${prov}')`).join(',');
        await pool.query(`INSERT INTO Destinatarios (nombre_hospital, provincia) VALUES ${destVals}`);
        destRes = await pool.query("SELECT id_destinatario FROM Destinatarios");
    }

    const destinatarios = destRes.rows.map(r => r.id_destinatario);

    // Insertar productos si no hay
    let prodRes = await pool.query("SELECT id_producto FROM Productos");
    if (prodRes.rowCount === 0) {
        await pool.query(`INSERT INTO Productos (codigo_producto, descripcion, unidad_medida) VALUES ('P001', 'Producto Ficticio', 'Unidad')`);
        prodRes = await pool.query("SELECT id_producto FROM Productos");
    }
    const prodId = prodRes.rows[0].id_producto;


    let countProcesos = 0;
    let countRenglones = 0;

    for (let i = 0; i < 40; i++) {
      // Create Proceso
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - Math.floor(Math.random() * 60)); // Últimos 60 días
      const fechaStr = fecha.toISOString().split('T')[0];
      const destId = destinatarios[Math.floor(Math.random() * destinatarios.length)];
      
      const procesoRes = await pool.query(`
        INSERT INTO Procesos (nro_proceso, fecha_apertura, id_destinatario, id_usuario_creador)
        VALUES ($1, $2, $3, $4)
        RETURNING id_proceso_db
      `, [`EXP-STAT-${Math.floor(Math.random() * 90000)}`, fechaStr, destId, userId]);
      
      const procesoId = procesoRes.rows[0].id_proceso_db;
      countProcesos++;

      // Create Renglones for this Proceso (1 to 5)
      const numRenglones = Math.floor(Math.random() * 5) + 1;
      for (let r = 1; r <= numRenglones; r++) {
        const estadoRandom = estados[Math.floor(Math.random() * estados.length)];
        let mi_pu = 0;
        let precio_ganador = 0;
        let primer_oferente = competidores[Math.floor(Math.random() * competidores.length)];
        const cantidad = Math.floor(Math.random() * 1000) + 10;
        const ganamosFlag = estadoRandom === 'GANADO' ? 1 : 0;

        const basePrice = Math.floor(Math.random() * 5000) + 100;
        
        if (estadoRandom === 'GANADO') {
            mi_pu = basePrice;
            precio_ganador = basePrice;
            primer_oferente = 'Nosotros';
        } else if (estadoRandom === 'PERDIDO') {
            mi_pu = basePrice + 100; // fuimos más caros
            precio_ganador = basePrice;
        } else {
            // NO_COTIZADO
            mi_pu = 0;
            precio_ganador = basePrice;
        }

        await pool.query(`
            INSERT INTO Renglones (
                id_proceso_db, id_destinatario, id_producto, nro_renglon_item, cantidad, 
                precio_ganador, primer_oferente, mi_pu, mi_marca, ganamos
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            procesoId, destId, prodId, `Item ${r}`, cantidad, 
            precio_ganador, primer_oferente, mi_pu, 'Marca Ficticia', ganamosFlag
        ]);
        countRenglones++;
      }
    }

    console.log(`✅ Inyección completa: ${countProcesos} Procesos y ${countRenglones} Renglones insertados.`);
  } catch (err) {
    console.error("Error al inyectar estadísticas:", err);
  } finally {
    process.exit();
  }
}

main();
