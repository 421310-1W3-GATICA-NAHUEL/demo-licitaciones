const express = require('express');
const router = express.Router();
const notificacionesController = require('../controllers/notificaciones.controller');
const verifyToken = require('../middlewares/auth.middleware');

router.get('/', verifyToken, notificacionesController.getNotificaciones);
router.post('/marcar-leido', verifyToken, notificacionesController.marcarLeidas);

module.exports = router;
