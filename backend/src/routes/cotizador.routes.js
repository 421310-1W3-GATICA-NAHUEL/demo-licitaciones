const express = require('express');
const router = express.Router();
const multer = require('multer');
const cotizadorController = require('../controllers/cotizador.controller');
const verifyToken = require('../middlewares/auth.middleware');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'image/png',
            'image/jpeg'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido. Solo se admiten PDFs, planillas Excel e imágenes (PNG/JPEG).'));
        }
    }
}).single('archivo');

const uploadMiddleware = (req, res, next) => {
    upload(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'El archivo excede el límite máximo de tamaño de 10MB.' });
            }
            return res.status(400).json({ error: err.message });
        }
        next();
    });
};

// Rutas del cotizador
router.post('/procesar', verifyToken, uploadMiddleware, cotizadorController.procesarCotizacion);
router.post('/buscar-matches', verifyToken, cotizadorController.buscarMatchesYHistorial);
router.post('/guardar-mapeo', verifyToken, cotizadorController.guardarMapeoManual);

module.exports = router;
