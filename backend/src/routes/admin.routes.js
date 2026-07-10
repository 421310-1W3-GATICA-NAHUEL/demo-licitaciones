const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const verifyToken = require('../middlewares/auth.middleware');

router.get('/usuarios', verifyToken, adminController.getUsuarios);
router.put('/usuarios/:id', verifyToken, adminController.actualizarUsuario);
router.delete('/usuarios/:id', verifyToken, adminController.eliminarUsuario);
router.post('/usuarios/:id/aprobar', verifyToken, adminController.aprobarUsuario);
router.put('/usuarios/:id/foto', verifyToken, adminController.actualizarFotoUsuario);

// Rutas de Control de Mantenimiento
router.get('/mantenimiento', verifyToken, adminController.getMantenimiento);
router.post('/mantenimiento', verifyToken, adminController.updateMantenimiento);

module.exports = router;
