const express = require('express');
const router = express.Router();
const multer = require('multer');
const verifyToken = require('../middlewares/auth.middleware');
const { analizarPdf, confirmarImportacion } = require('../controllers/importarPdf.controller');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // límite de 10MB
});

router.post('/analizar', verifyToken, upload.single('file'), analizarPdf);
router.post('/confirmar', verifyToken, confirmarImportacion);

module.exports = router;
