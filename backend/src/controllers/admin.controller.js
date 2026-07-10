const { poolPromise } = require('../config/db');
const transporter = require('../utils/mailer');
const logger = require('../utils/logger');

// 1. Obtener todos los usuarios
const getUsuarios = async (req, res) => {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ message: "No autorizado." });
    }

    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT id_usuario, email, rol, estado, habilitado, empresa_acceso, puede_importar, nombre, foto_perfil, ultimo_acceso,
                   CASE WHEN ultimo_acceso >= (NOW() - INTERVAL '1 minute') THEN 1 ELSE 0 END AS is_online
            FROM Usuarios 
            ORDER BY email ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        logger.error("Error al obtener usuarios: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// 2. Actualizar configuración de usuario (rol, habilitado, empresa_acceso, puede_importar)
const actualizarUsuario = async (req, res) => {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ message: "No autorizado." });
    }

    const { id } = req.params;
    const { rol, habilitado, empresa_acceso, puede_importar } = req.body;

    // Validación de ID
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId) || parsedId <= 0 || String(parsedId) !== String(id)) {
        return res.status(400).json({ message: "ID de usuario inválido." });
    }

    // Validación de campos del body
    const rolesPermitidos = ['admin', 'vendedor', 'sr', 'dpc'];
    if (rol !== undefined && !rolesPermitidos.includes(rol)) {
        return res.status(400).json({ message: "Rol inválido." });
    }
    if (habilitado !== undefined && typeof habilitado !== 'boolean') {
        return res.status(400).json({ message: "El campo habilitado debe ser booleano." });
    }
    if (puede_importar !== undefined && typeof puede_importar !== 'boolean') {
        return res.status(400).json({ message: "El campo puede_importar debe ser booleano." });
    }

    // Conversión explícita a Boolean para PostgreSQL
    const boolHabilitado = habilitado !== undefined ? Boolean(habilitado) : undefined;
    const boolPuedeImportar = puede_importar !== undefined ? Boolean(puede_importar) : undefined;

    try {
        const pool = await poolPromise;
        await pool.request()
            .query(`
                UPDATE Usuarios 
                SET rol = $1,
                    habilitado = $2,
                    empresa_acceso = $3,
                    puede_importar = $4
                WHERE id_usuario = $5
            `, [rol, boolHabilitado, empresa_acceso, boolPuedeImportar, parsedId]);
        res.json({ message: "Usuario actualizado correctamente." });
    } catch (err) {
        logger.error("Error al actualizar usuario: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// 3. Eliminar usuario
const eliminarUsuario = async (req, res) => {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ message: "No autorizado." });
    }

    const { id } = req.params;

    // Validación de ID
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId) || parsedId <= 0 || String(parsedId) !== String(id)) {
        return res.status(400).json({ message: "ID de usuario inválido." });
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .query('DELETE FROM Usuarios WHERE id_usuario = $1', [parsedId]);
        res.json({ message: "Usuario eliminado correctamente." });
    } catch (err) {
        logger.error("Error al eliminar usuario: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// 4. Aprobar usuario pendiente (Habilita y envía código de verificación)
const aprobarUsuario = async (req, res) => {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ message: "No autorizado." });
    }

    const { id } = req.params;
    const { rol, empresa_acceso, puede_importar } = req.body;

    // Validación de ID
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId) || parsedId <= 0 || String(parsedId) !== String(id)) {
        return res.status(400).json({ message: "ID de usuario inválido." });
    }

    // Validación de campos
    const rolesPermitidos = ['admin', 'vendedor', 'sr', 'dpc'];
    if (rol !== undefined && !rolesPermitidos.includes(rol)) {
        return res.status(400).json({ message: "Rol inválido." });
    }
    if (puede_importar !== undefined && typeof puede_importar !== 'boolean') {
        return res.status(400).json({ message: "El campo puede_importar debe ser booleano." });
    }

    // Conversión explícita a Boolean para PostgreSQL
    const boolPuedeImportar = puede_importar !== undefined ? Boolean(puede_importar) : false;

    try {
        const pool = await poolPromise;
        
        // Obtener el mail del usuario
        const userRes = await pool.request()
            .query('SELECT email FROM Usuarios WHERE id_usuario = $1', [parsedId]);

        const user = userRes.recordset[0];
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        // Generar código y expira
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();
        const expira = new Date(Date.now() + 15 * 60 * 1000);

        // Actualizar base de datos
        await pool.request()
            .query(`
                UPDATE Usuarios 
                SET habilitado = true,
                    rol = $1,
                    empresa_acceso = $2,
                    puede_importar = $3,
                    codigo_verificacion = $4,
                    codigo_expira = $5
                WHERE id_usuario = $6
            `, [rol || 'vendedor', empresa_acceso || 'PHARMA CENTER', boolPuedeImportar, codigo, expira, parsedId]);

        // Enviar email de bienvenida con el código
        await transporter.sendMail({
            from: '"Sistemas DROGUERIA DEMO" <alertas@drogueriademo.com.ar>',
            to: user.email,
            subject: `🎉 Solicitud Aprobada: Tu código es ${codigo}`,
            html: `
                <div style="font-family: sans-serif; border: 1px solid #ddd; padding: 25px; border-radius: 12px; max-width: 500px; margin: auto;">
                     <h2 style="color: #10b981; text-align: center; margin-bottom: 5px;">¡Solicitud Aprobada!</h2>
                     <p style="text-align: center; color: #4b5563; font-weight: bold; margin-top: 0;">Tu acceso al Sistema de Licitaciones ha sido autorizado.</p>
                     <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                     <p>Usa el siguiente código de verificación de un solo uso para establecer tu contraseña y completar tu registro:</p>
                     <div style="background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; margin: 20px 0;">
                         ${codigo}
                     </div>
                     <p style="font-size: 11px; color: #9ca3af; text-align: center;">Este código expira en 15 minutos por motivos de seguridad.</p>
                 </div>
            `
        });

        res.json({ message: "Usuario aprobado y código enviado con éxito." });
    } catch (err) {
        logger.error("Error al aprobar usuario: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

const getMantenimiento = async (req, res) => {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ message: "No autorizado." });
    }
    
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT clave, valor FROM Configuracion");
        
        let advertencia = false;
        let bloqueo = false;
        let limite = '';
        
        result.recordset.forEach(row => {
            if (row.clave === 'advertencia_mantenimiento') {
                advertencia = row.valor === 'true';
            }
            if (row.clave === 'bloqueo_mantenimiento') {
                bloqueo = row.valor === 'true';
            }
            if (row.clave === 'mantenimiento_limite') {
                limite = row.valor;
            }
        });
        
        res.json({ advertencia, bloqueo, limite });
    } catch (err) {
        logger.error("Error al obtener config mantenimiento: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

const updateMantenimiento = async (req, res) => {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ message: "No autorizado." });
    }
    
    const { tipo, activo, minutos } = req.body;
    
    if (tipo !== 'advertencia' && tipo !== 'bloqueo') {
        return res.status(400).json({ message: "Tipo inválido." });
    }
    
    const claveConfig = tipo === 'advertencia' ? 'advertencia_mantenimiento' : 'bloqueo_mantenimiento';
    const valorStr = activo ? 'true' : 'false';
    
    try {
        const pool = await poolPromise;
        
        await pool.request()
            .query("UPDATE Configuracion SET valor = $1 WHERE clave = $2", [valorStr, claveConfig]);
            
        if (tipo === 'advertencia') {
            // Si se activa y se pasan minutos, calcular y guardar el límite
            let limiteVal = '';
            if (activo && minutos) {
                const targetTime = new Date(Date.now() + parseInt(minutos) * 60 * 1000);
                limiteVal = targetTime.toISOString();
            }
            
            await pool.request()
                .query("UPDATE Configuracion SET valor = $1 WHERE clave = $2", [limiteVal, 'mantenimiento_limite']);
        } else {
            // Si desactivamos bloqueo o activamos bloqueo, podemos limpiar el límite
            if (!activo) {
                await pool.request()
                    .query("UPDATE Configuracion SET valor = $1 WHERE clave = $2", ['', 'mantenimiento_limite']);
            }
        }
        
        // Invalidar el caché en memoria para que se actualice inmediatamente
        if (global.invalidateMaintenanceCache) {
            global.invalidateMaintenanceCache();
        }
        
        logger.info(`🔧 Modo Mantenimiento actualizado por admin - Tipo: ${tipo}, Activo: ${activo}, Minutos: ${minutos}`);
        res.json({ success: true, message: `Mantenimiento (${tipo}) actualizado correctamente.` });
    } catch (err) {
        logger.error("Error al actualizar config mantenimiento: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// 7. Actualizar foto de perfil de usuario
const actualizarFotoUsuario = async (req, res) => {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ message: "No autorizado." });
    }

    const { id } = req.params;
    const { foto_perfil } = req.body;

    // Validación de ID
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId) || parsedId <= 0 || String(parsedId) !== String(id)) {
        return res.status(400).json({ message: "ID de usuario inválido." });
    }

    try {
        const pool = await poolPromise;
        await pool.request()
            .query(`
                UPDATE Usuarios 
                SET foto_perfil = $1
                WHERE id_usuario = $2
            `, [foto_perfil || null, parsedId]);
        res.json({ message: "Foto de perfil actualizada correctamente." });
    } catch (err) {
        logger.error("Error al actualizar foto de perfil: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

module.exports = {
    getUsuarios,
    actualizarUsuario,
    eliminarUsuario,
    aprobarUsuario,
    getMantenimiento,
    updateMantenimiento,
    actualizarFotoUsuario
};
