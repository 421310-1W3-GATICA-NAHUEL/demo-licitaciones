const express = require('express');
const router = express.Router();
const iaController = require('../controllers/ia.controller');
const verificarToken = require('../middlewares/auth.middleware');

router.post('/consultar', verificarToken, iaController.procesarMensaje);

module.exports = router;