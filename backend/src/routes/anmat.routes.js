const express = require('express');
const router = express.Router();
const verifyToken = require('../middlewares/auth.middleware');
const {
    getProductosPM,
    crearProductoPM,
    actualizarProductoPM,
    eliminarProductoPM,
    importarProductosPM,
    buscarPM,
    buscarProductosInventario
} = require('../controllers/anmat.controller');

router.get('/',          verifyToken, getProductosPM);
router.get('/buscar',    verifyToken, buscarPM);
router.get('/productos', verifyToken, buscarProductosInventario);
router.post('/',         verifyToken, crearProductoPM);
router.post('/importar', verifyToken, importarProductosPM);
router.put('/:id',       verifyToken, actualizarProductoPM);
router.delete('/:id',    verifyToken, eliminarProductoPM);

module.exports = router;
