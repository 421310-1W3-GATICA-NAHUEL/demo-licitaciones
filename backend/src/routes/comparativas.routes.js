const express = require('express');
const router = express.Router();
const comparativasController = require('../controllers/comparativas.controller');
const verifyToken = require('../middlewares/auth.middleware');

router.get('/competidores', verifyToken, comparativasController.getCompetidores);
router.get('/sugerencias-productos', verifyToken, comparativasController.getSugerenciasProductos);
router.get('/', verifyToken, comparativasController.getComparativas);

module.exports = router;