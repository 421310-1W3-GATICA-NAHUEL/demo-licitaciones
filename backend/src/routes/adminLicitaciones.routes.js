const express = require('express');
const router = express.Router();
const adminLicitacionesController = require('../controllers/adminLicitaciones.controller');
const verifyToken = require('../middlewares/auth.middleware');

const verifyAdmin = (req, res, next) => {
    if (req.user && req.user.rol === 'admin') {
        next();
    } else {
        res.status(403).json({ message: "Acceso denegado. Se requieren permisos de administrador." });
    }
};

// Rutas de administración de licitaciones
router.get('/', verifyToken, verifyAdmin, adminLicitacionesController.getLicitaciones);
router.get('/destinatarios', verifyToken, verifyAdmin, adminLicitacionesController.getDestinatarios);
router.put('/:id/hospital', verifyToken, verifyAdmin, adminLicitacionesController.actualizarHospital);
router.delete('/:id', verifyToken, verifyAdmin, adminLicitacionesController.eliminarLicitacion);

module.exports = router;
