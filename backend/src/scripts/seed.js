const bcrypt = require('bcryptjs');
const { poolPromise } = require('../config/db');
const logger = require('../utils/logger');

async function seedDatabase() {
    try {
        const pool = await poolPromise;
        const client = pool.pgPool;

        logger.info('🚀 Iniciando proceso de borrado y carga de datos mocks...');

        // 1. Borrar datos existentes
        logger.info('🗑️ Borrando datos reales (TRUNCATE)...');
        await client.query(`
            TRUNCATE TABLE MapeoProductosIA, Procesos, Usuarios, ContactosHospitales, Destinatarios, ProductosPM, Notificaciones, Inventario, Productos, Renglones RESTART IDENTITY CASCADE;
        `);
        logger.info('✅ Datos reales borrados.');

        // 2. Insertar Usuarios
        logger.info('👥 Insertando usuarios mock...');
        const adminPassword = await bcrypt.hash('admin123', 10);
        const userPassword = await bcrypt.hash('user123', 10);
        
        await client.query(`
            INSERT INTO Usuarios (nombre, email, password_hash, rol, empresa, estado, habilitado, empresa_acceso)
            VALUES 
            ('Admin de Prueba', 'admin@drogueria.local', $1, 'admin', 'MOCK_DROGUERIA', true, true, 'TODAS'),
            ('Usuario de Prueba', 'usuario@drogueria.local', $2, 'usuario', 'MOCK_DROGUERIA', true, true, 'TODAS')
        `, [adminPassword, userPassword]);
        
        // Obtener ID del admin creado para referenciarlo
        const userRes = await client.query(`SELECT id_usuario FROM Usuarios WHERE email = 'admin@drogueria.local'`);
        const adminId = userRes.rows[0].id_usuario;
        logger.info('✅ Usuarios mock creados.');

        // 3. Insertar Inventario
        logger.info('📦 Insertando inventario mock...');
        await client.query(`
            INSERT INTO Inventario (codigo, empresa, detalle, marca, linea, sublinea, costo, precio_final, stock, disponible)
            VALUES 
            ('M001', 'MOCK_DROGUERIA', 'PARACETAMOL 500mg X 50 COMP', 'GENFAR', 'MEDICAMENTOS', 'ANALGESICOS', 500.00, 750.00, 1000, 1000),
            ('M002', 'MOCK_DROGUERIA', 'IBUPROFENO 400mg X 20 COMP', 'BAYER', 'MEDICAMENTOS', 'ANALGESICOS', 450.00, 680.00, 500, 500),
            ('I001', 'MOCK_DROGUERIA', 'JERINGA DESCARTABLE 5ML C/AGUJA', 'BECTON DICKINSON', 'INSUMOS', 'MATERIAL DESCARTABLE', 120.00, 200.00, 2000, 2000),
            ('I002', 'MOCK_DROGUERIA', 'GUANTES DE LATEX TALLE M X 100', 'SUPERMAX', 'INSUMOS', 'PROTECCION', 2500.00, 3800.00, 300, 300),
            ('M003', 'MOCK_DROGUERIA', 'AMOXICILINA 500mg X 21 CAPS', 'ROEMMERS', 'MEDICAMENTOS', 'ANTIBIOTICOS', 1200.00, 1800.00, 800, 800)
        `);
        logger.info('✅ Inventario mock creado.');

        // 4. Insertar Destinatarios y Contactos
        logger.info('🏥 Insertando hospitales y contactos mock...');
        const destRes = await client.query(`
            INSERT INTO Destinatarios (nombre_hospital, cuit, condicion_iva, telefono, email, direccion, localidad, provincia, notas)
            VALUES 
            ('Hospital General San Martin', '30-12345678-9', 'Exento', '011-4567-8901', 'compras@hospitalsanmartin.mock', 'Av. Rivadavia 1234', 'La Plata', 'Buenos Aires', 'Entregas por puerta lateral'),
            ('Clinica Privada Los Robles', '30-98765432-1', 'Responsable Inscripto', '011-9876-5432', 'proveedores@clinicalosrobles.mock', 'Calle Falsa 123', 'CABA', 'Buenos Aires', 'Solo días hábiles')
            RETURNING id_destinatario, nombre_hospital;
        `);

        for (const dest of destRes.rows) {
            await client.query(`
                INSERT INTO ContactosHospitales (id_destinatario, nombre_contacto, rol_puesto, telefono, email, empresa, notas)
                VALUES 
                ($1, 'Dr. Roberto Perez', 'Jefe de Compras', '011-1111-2222', 'rperez@' || REPLACE(LOWER($2), ' ', '') || '.mock', 'MOCK_DROGUERIA', 'Contactar por urgencias')
            `, [dest.id_destinatario, dest.nombre_hospital]);
        }
        logger.info('✅ Hospitales y contactos mock creados.');

        // 5. Insertar Productos PM
        logger.info('💊 Insertando Productos PM mock...');
        await client.query(`
            INSERT INTO ProductosPM (detalle, marca, pm, observaciones)
            VALUES 
            ('JERINGA DESCARTABLE 5ML C/AGUJA', 'BECTON DICKINSON', 'PM-1234-5', 'Certificado ANMAT vigente'),
            ('GUANTES DE LATEX TALLE M X 100', 'SUPERMAX', 'PM-9876-1', 'Renovacion en tramite')
        `);
        logger.info('✅ Productos PM mock creados.');

        // 6. Insertar Productos, Procesos y Renglones
        logger.info('📊 Insertando Procesos y Renglones (Estadísticas) mock...');
        const prodRes = await client.query(`
            INSERT INTO Productos (nombre_detalle)
            VALUES 
            ('PARACETAMOL 500mg X 50 COMP'),
            ('IBUPROFENO 400mg X 20 COMP'),
            ('AMOXICILINA 500mg X 21 CAPS')
            RETURNING id_producto, nombre_detalle;
        `);

        // Necesitamos el ID del destinatario
        const dest1 = destRes.rows[0].id_destinatario;
        const dest2 = destRes.rows[1].id_destinatario;

        const procRes = await client.query(`
            INSERT INTO Procesos (nro_proceso, fecha_apertura, id_destinatario, id_usuario_creador)
            VALUES 
            ('2024-001', '2024-01-10 10:00:00', $1, $2),
            ('2024-002', '2024-02-15 10:00:00', $3, $4)
            RETURNING id_proceso_db;
        `, [dest1, adminId, dest2, adminId]);

        const proc1 = procRes.rows[0].id_proceso_db;
        const proc2 = procRes.rows[1].id_proceso_db;
        
        const p1 = prodRes.rows[0].id_producto;
        const p2 = prodRes.rows[1].id_producto;
        const p3 = prodRes.rows[2].id_producto;

        await client.query(`
            INSERT INTO Renglones (
                id_proceso_db, id_destinatario, id_producto, nro_renglon_item, cantidad, 
                precio_ganador, primer_oferente, marca_ganadora, mi_pu, mi_marca, ganamos
            ) VALUES 
            -- Renglones ganados (1) por la droguería
            ($1, $2, $3, '1', 1000, 750.00, 'NUESTRA EMPRESA', 'GENFAR', 750.00, 'GENFAR', 1),
            ($1, $2, $4, '2', 500, 680.00, 'NUESTRA EMPRESA', 'BAYER', 680.00, 'BAYER', 1),
            -- Renglones perdidos (0) por la droguería (gana competencia)
            ($5, $6, $7, '1', 2000, 1500.00, 'COMPETIDOR S.A.', 'ROEMMERS', 1800.00, 'ROEMMERS', 0)
        `, [proc1, dest1, p1, p2, proc2, dest2, p3]);
        logger.info('✅ Estadísticas mock creadas.');

        logger.info('🎉 Proceso de seeding completado exitosamente.');
        process.exit(0);

    } catch (error) {
        logger.error('❌ Error durante el seeding de la base de datos:', error);
        process.exit(1);
    }
}

seedDatabase();
