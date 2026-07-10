const jwt = require('jsonwebtoken');
const { poolPromise } = require('../config/db');
const logger = require('../utils/logger');

const verifyToken = (req, res, next) => {
    let token = null;

    // 1. Intentar obtener de cookie
    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    } 
    // 2. Fallback a header de autorización
    else if (req.headers['authorization']) {
        const authHeader = req.headers['authorization'];
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.split(" ")[1];
        } else {
            token = authHeader;
        }
    }

    if (!token) {
        return res.status(403).json({ message: "No se proporcionó un token" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        // Actualizar último acceso en segundo plano sin retrasar la respuesta del API
        poolPromise.then(pool => {
            pool.request()
                .query('UPDATE Usuarios SET ultimo_acceso = NOW() WHERE id_usuario = $1', [decoded.id])
                .catch(err => logger.error("Error al actualizar ultimo_acceso: " + err.message));
        }).catch(err => logger.error("Error poolPromise en middleware: " + err.message));

        next(); // ¡Podés pasar!
    } catch (err) {
        return res.status(401).json({ message: "Token inválido o expirado" });
    }
};

module.exports = verifyToken;