const { poolPromise } = require('../config/db');

async function runUpdates() {
    try {
        const pool = await poolPromise;
        console.log('🔄 Ejecutando actualizaciones de base de datos...');

        // 1. Agregar columna 'empresa' a SeguimientoLicitaciones si no existe
        await pool.request().query(`
            IF NOT EXISTS (
                SELECT * 
                FROM sys.columns 
                WHERE object_id = OBJECT_ID('SeguimientoLicitaciones') 
                AND name = 'empresa'
            )
            BEGIN
                ALTER TABLE SeguimientoLicitaciones ADD empresa NVARCHAR(50);
                PRINT 'Columna "empresa" añadida a SeguimientoLicitaciones con éxito.';
            END
            ELSE
            BEGIN
                PRINT 'La columna "empresa" ya existe en SeguimientoLicitaciones.';
            END
        `);

        // 2. Si hay registros existentes en SeguimientoLicitaciones sin empresa, podemos setearles un valor por defecto o dejarlos.
        // Pero como vimos, SeguimientoLicitaciones está vacía (0 registros).

        console.log('✅ Actualización de base de datos finalizada.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error ejecutando actualizaciones:', err);
        process.exit(1);
    }
}

runUpdates();
