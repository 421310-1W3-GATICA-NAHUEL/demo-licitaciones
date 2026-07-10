const express = require('express');
const router = express.Router();
const seguimientoController = require('../controllers/seguimiento.controller');
const verifyToken = require('../middlewares/auth.middleware');

const lockEmpresaMiddleware = (req, res, next) => {
    if (req.user && req.user.empresa_acceso && req.user.empresa_acceso !== 'TODAS') {
        req.query.empresa = req.user.empresa_acceso;
        if (req.body) {
            req.body.empresa = req.user.empresa_acceso;
        }
    }
    next();
};

// =========================
// LISTADO PRINCIPAL
// =========================
router.get('/', verifyToken, lockEmpresaMiddleware, seguimientoController.getSeguimientos);

// =========================
// DETALLE DESPLEGABLE
// =========================
router.get('/detalle/:idProceso', verifyToken, lockEmpresaMiddleware, seguimientoController.getDetalleSeguimiento);

// =========================
// ACTUALIZAR SEGUIMIENTO
// =========================
router.put('/:idProceso', verifyToken, lockEmpresaMiddleware, seguimientoController.updateSeguimiento);

module.exports = router;