const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { poolPromise } = require('../config/db');
const transporter = require('../utils/mailer');
const logger = require('../utils/logger');

const dominiosPermitidos = ['@drogueriademo.com.ar', '@pharmacenter.com.ar', '@drogueria.local'];

const emailValido = (email) => {
    if (!email) return false;
    const cleanEmail = email.toLowerCase().trim();
    return dominiosPermitidos.some(dominio => cleanEmail.endsWith(dominio));
};

// ==========================================
// 1️⃣ PASO: SOLICITAR CÓDIGO (O DETECTAR LOGIN)
// ==========================================
const solicitarCodigo = async (req, res) => {
    const { email } = req.body;

    if (!emailValido(email)) {
        return res.status(403).json({ message: "Dominio no autorizado corporativamente." });
    }

    try {
        const pool = await poolPromise;

        // Buscamos si el usuario ya existe
        const result = await pool.request()
            .query('SELECT estado, nombre, habilitado, codigo_verificacion FROM Usuarios WHERE email = $1', [email]);

        const user = result.recordset[0];

        // --- CASO A: USUARIO YA REGISTRADO Y ACTIVO ---
        if (user && user.estado === true) {
            if (user.habilitado === false) {
                return res.status(403).json({ message: "Tu acceso ha sido deshabilitado o requiere aprobación del administrador." });
            }
            return res.json({ 
                usuarioExistente: true, 
                nombre: user.nombre,
                message: "Usuario reconocido. Ingrese su contraseña." 
            });
        }

        // --- CASO B: USUARIO REGISTRADO PERO PENDIENTE DE APROBACIÓN ---
        if (user && user.estado === false && user.habilitado === false) {
            return res.json({ 
                pendienteAprobacion: true,
                message: "Tu solicitud de acceso ya fue enviada y está pendiente de aprobación por el administrador." 
            });
        }

        // --- CASO C: APROBADO PERO FALTA VERIFICAR CÓDIGO (EL ADMIN YA LE ENVIÓ EL CÓDIGO) ---
        if (user && user.estado === false && user.habilitado === true) {
            return res.json({
                usuarioExistente: false,
                codigoEnviado: true,
                message: "Tu solicitud fue aprobada. Ingresa el código de verificación que te enviamos al correo."
            });
        }

        // --- CASO D: USUARIO NUEVO (CREAR SOLICITUD PENDIENTE) ---
        let empresa_acceso = 'PHARMA CENTER';
        if (email.toLowerCase().endsWith('@drogueriademo.com.ar')) {
            empresa_acceso = 'DROGUERIA DEMO';
        }

        await pool.request()
            .query(`
                INSERT INTO Usuarios (email, estado, habilitado, rol, empresa_acceso, puede_importar) 
                VALUES ($1, false, false, 'vendedor', $2, false)
            `, [email, empresa_acceso]);

        res.json({ 
            usuarioExistente: false, 
            pendienteAprobacion: true, 
            message: "Tu solicitud de acceso ha sido enviada al administrador. Recibirás un correo cuando sea aprobada." 
        });

    } catch (err) {
        logger.error("Error al solicitar código: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// ==========================================
// 2️⃣ PASO: VERIFICAR CÓDIGO Y ESTABLECER PASSWORD + NOMBRE
// ==========================================
const establecerPassword = async (req, res) => {
    // Agregamos 'nombre' que vendrá del formulario de registro
    const { email, codigo, password, nombre } = req.body;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query('SELECT * FROM Usuarios WHERE email = $1', [email]);

        const user = result.recordset[0];

        if (!user || user.codigo_verificacion !== codigo) {
            return res.status(400).json({ message: "Código incorrecto." });
        }
        if (new Date() > user.codigo_expira) {
            return res.status(400).json({ message: "El código ha expirado." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let rolFinal = 'vendedor';
        if (email.toLowerCase().endsWith('@drogueriademo.com.ar')) rolFinal = 'sr';
        if (email.toLowerCase().endsWith('@pharmacenter.com.ar')) rolFinal = 'dpc';

        await pool.request()
            .query(`
                UPDATE Usuarios 
                SET password_hash = $1, 
                    nombre = $2,
                    estado = true, 
                    rol = $3,
                    codigo_verificacion = NULL, 
                    codigo_expira = NULL 
                WHERE email = $4
            `, [hashedPassword, nombre || null, rolFinal, email]);

        res.json({ message: "Registro completado con éxito. Ya puedes ingresar." });
    } catch (err) {
        logger.error("Error al establecer contraseña: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

// ==========================================
// 🔐 PASO 3: LOGIN FINAL
// ==========================================
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query('SELECT id_usuario, email, rol, estado, habilitado, empresa_acceso, puede_importar, password_hash, nombre, foto_perfil FROM Usuarios WHERE email = $1', [email]);

        const user = result.recordset[0];

        if (!user) {
            return res.status(401).json({ message: "Usuario no registrado." });
        }
        if (user.estado === false) {
            return res.status(401).json({ message: "El usuario aún no ha sido verificado por mail." });
        }
        if (user.habilitado === false) {
            return res.status(403).json({ message: "Tu acceso ha sido deshabilitado o requiere aprobación del administrador." });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: "Contraseña incorrecta." });
        }

        const token = jwt.sign(
            { 
                id: user.id_usuario, 
                rol: user.rol, 
                email: user.email, 
                nombre: user.nombre,
                empresa_acceso: user.empresa_acceso,
                puede_importar: user.puede_importar ? 1 : 0
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 horas
        });

        res.json({
            token,
            user: { 
                id: user.id_usuario, 
                email: user.email, 
                rol: user.rol, 
                nombre: user.nombre,
                empresa_acceso: user.empresa_acceso,
                puede_importar: user.puede_importar ? 1 : 0,
                foto_perfil: user.foto_perfil
            }
        });

    } catch (err) {
        logger.error("Error al iniciar sesión: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

const actualizarPerfil = async (req, res) => {
    const { nombre, passwordActual, nuevoPassword } = req.body;
    const userId = req.user.id;

    try {
        const pool = await poolPromise;

        // 1. Si se intenta cambiar la contraseña
        if (passwordActual && nuevoPassword) {
            const userRes = await pool.request()
                .query('SELECT password_hash FROM Usuarios WHERE id_usuario = $1', [userId]);
            const user = userRes.recordset[0];
            if (!user) {
                return res.status(404).json({ message: "Usuario no encontrado." });
            }

            const isMatch = await bcrypt.compare(passwordActual, user.password_hash);
            if (!isMatch) {
                return res.status(400).json({ message: "La contraseña actual es incorrecta." });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(nuevoPassword, salt);

            await pool.request()
                .query('UPDATE Usuarios SET nombre = $1, password_hash = $2 WHERE id_usuario = $3', [nombre || null, hashedPassword, userId]);
        } else {
            // 2. Solo cambiar el nombre
            await pool.request()
                .query('UPDATE Usuarios SET nombre = $1 WHERE id_usuario = $2', [nombre || null, userId]);
        }

        // Obtener datos actualizados del usuario para firmar un nuevo token
        const finalUserRes = await pool.request()
            .query('SELECT id_usuario, email, rol, empresa_acceso, puede_importar, nombre FROM Usuarios WHERE id_usuario = $1', [userId]);
        
        const finalUser = finalUserRes.recordset[0];
        if (!finalUser) {
            return res.status(404).json({ message: "Error al refrescar perfil." });
        }

        const token = jwt.sign(
            { 
                id: finalUser.id_usuario, 
                rol: finalUser.rol, 
                email: finalUser.email, 
                nombre: finalUser.nombre,
                empresa_acceso: finalUser.empresa_acceso,
                puede_importar: finalUser.puede_importar ? 1 : 0
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 horas
        });

        res.json({
            message: "Perfil actualizado con éxito.",
            token,
            user: {
                id: finalUser.id_usuario,
                email: finalUser.email,
                rol: finalUser.rol,
                nombre: finalUser.nombre,
                empresa_acceso: finalUser.empresa_acceso,
                puede_importar: finalUser.puede_importar ? 1 : 0
            }
        });

    } catch (err) {
        logger.error("Error al actualizar perfil: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

const checkPermissions = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query('SELECT id_usuario, email, rol, empresa_acceso, puede_importar, habilitado, nombre, foto_perfil FROM Usuarios WHERE id_usuario = $1', [req.user.id]);
        
        const user = result.recordset[0];
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        
        // Verificar si cambió algo de los permisos codificados en el token actual
        const hashChanged = 
            user.rol !== req.user.rol ||
            user.empresa_acceso !== req.user.empresa_acceso ||
            (user.puede_importar ? 1 : 0) !== (req.user.puede_importar ? 1 : 0) ||
            user.nombre !== req.user.nombre;
            
        let newToken = null;
        if (hashChanged && user.habilitado) {
            newToken = jwt.sign(
                { 
                    id: user.id_usuario, 
                    rol: user.rol, 
                    email: user.email, 
                    nombre: user.nombre,
                    empresa_acceso: user.empresa_acceso,
                    puede_importar: user.puede_importar ? 1 : 0
                },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
        }

        if (newToken) {
            res.cookie('token', newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 24 * 60 * 60 * 1000 // 24 horas
            });
        }
        
        res.json({
            cambiado: hashChanged,
            token: newToken,
            user: {
                rol: user.rol,
                empresa_acceso: user.empresa_acceso,
                puede_importar: user.puede_importar ? 1 : 0,
                habilitado: user.habilitado,
                nombre: user.nombre,
                foto_perfil: user.foto_perfil
            }
        });
    } catch (err) {
        logger.error("Error al verificar permisos: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

const logout = async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .query('UPDATE Usuarios SET ultimo_acceso = NULL WHERE id_usuario = $1', [req.user.id]);
        
        res.clearCookie('token');
        res.json({ message: "Sesión cerrada correctamente." });
    } catch (err) {
        logger.error("Error al cerrar sesión: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

const heartbeat = async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .query('UPDATE Usuarios SET ultimo_acceso = NOW() WHERE id_usuario = $1', [req.user.id]);
        res.json({ ok: true });
    } catch (err) {
        logger.error("Error en heartbeat: " + err.message);
        res.status(500).json({ error: "Ocurrió un error interno. Por favor, intentá nuevamente." });
    }
};

module.exports = { solicitarCodigo, establecerPassword, login, actualizarPerfil, checkPermissions, logout, heartbeat };