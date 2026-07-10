const express = require('express');
const router = express.Router();
const multer = require('multer');
const inventarioController = require('../controllers/inventario.controller');
const verifyToken = require('../middlewares/auth.middleware');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 } // Límite de 15MB
});

// Rutas de inventario
router.get('/', verifyToken, inventarioController.obtenerInventario);
router.get('/stats', verifyToken, inventarioController.obtenerStatsInventario);
router.post('/importar', verifyToken, upload.single('archivo'), inventarioController.importarExcelInventario);

module.exports = router;
