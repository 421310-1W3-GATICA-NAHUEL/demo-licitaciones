const express = require('express');
const router = express.Router();
const multer = require('multer');

// Importamos los controladores
const {
    analizarDocumentoComparativa,
    guardarMasivo,
    analizarDocumentoDiarias,
    guardarMasivoDiarias,
    analizarDocumentoSeguimiento,
    guardarMasivoSeguimiento
} = require('../controllers/importarController');

// =========================
// VALIDACIÓN DE ARCHIVO
// =========================
const fileFilter = (req, file, cb) => {
    const tiposPermitidos = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv', // .csv
        'application/octet-stream'
    ];

    if (tiposPermitidos.includes(file.mimetype) || 
        file.originalname.endsWith('.xlsx') || 
        file.originalname.endsWith('.xls') ||
        file.originalname.endsWith('.csv')) {
        cb(null, true);
    } else {
        cb(new Error('Formato no soportado. Suba un archivo Excel (.xlsx, .xls) o CSV (.csv).'), false);
    }
};

// =========================
// MULTER CONFIG
// =========================
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: fileFilter,
    limits: { fileSize: 15 * 1024 * 1024 }
});

const verifyToken = require('../middlewares/auth.middleware');

const verifyImportPermission = (req, res, next) => {
    if (req.user && (req.user.puede_importar === 1 || req.user.puede_importar === true || req.user.rol === 'admin')) {
        next();
    } else {
        res.status(403).json({ error: "No tienes permisos de importación. Solicita autorización al administrador." });
    }
};

// =========================
// RUTAS (Endpoints)
// =========================

// --- COMPARATIVAS ---
router.post('/analizar', verifyToken, verifyImportPermission, upload.single('archivo'), analizarDocumentoComparativa);
router.post('/guardar-masivo', verifyToken, verifyImportPermission, guardarMasivo);

// --- DIARIAS ---
router.post('/analizar-diarias', verifyToken, verifyImportPermission, upload.single('archivo'), analizarDocumentoDiarias);
router.post('/guardar-diarias', verifyToken, verifyImportPermission, guardarMasivoDiarias);

// --- SEGUIMIENTO ---
router.post('/analizar-seguimiento', verifyToken, verifyImportPermission, upload.single('archivo'), analizarDocumentoSeguimiento);
router.post('/guardar-seguimiento', verifyToken, verifyImportPermission, guardarMasivoSeguimiento);

// =========================
// MANEJO DE ERRORES
// =========================
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                error: 'El archivo es demasiado grande. El límite es de 15MB.' 
            });
        }
        return res.status(400).json({ error: 'Error en la subida del archivo.' });
    } else if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
});

module.exports = router;