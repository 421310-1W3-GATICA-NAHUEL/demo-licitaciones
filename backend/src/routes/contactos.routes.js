const express = require('express');
const router = express.Router();
const contactosController = require('../controllers/contactos.controller');
const verifyToken = require('../middlewares/auth.middleware');

router.get('/', verifyToken, contactosController.getContactos);
router.get('/destinatarios', verifyToken, contactosController.getDestinatarios);
router.post('/', verifyToken, contactosController.crearContacto);
router.put('/:id', verifyToken, contactosController.actualizarContacto);
router.delete('/:id', verifyToken, contactosController.eliminarContacto);

module.exports = router;
