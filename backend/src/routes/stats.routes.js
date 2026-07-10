const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const verifyToken = require('../middlewares/auth.middleware');

// Definimos los endpoints con verifyToken
router.get('/resumen', verifyToken, statsController.getResumenGeneral);
router.get('/mensual', verifyToken, statsController.getBalanceMensual);
router.get('/competidores', verifyToken, statsController.getTopCompetidores);
router.get('/productos-perdidos', verifyToken, statsController.getTopProductosPerdidos);
router.get('/productos-ganados', verifyToken, statsController.getTopProductosGanados);
router.get('/eficacia-hospital', verifyToken, statsController.getEficaciaPorHospital);
router.get('/provincias', verifyToken, statsController.getEficaciaPorProvincia);
router.get('/price-gap', verifyToken, statsController.getDiferenciaPrecioPromedio);
router.get('/hospitales', verifyToken, statsController.getHospitales);
router.get('/producto-detalle', verifyToken, statsController.getProductoDetalle);
router.get('/competidor-detalle', verifyToken, statsController.getCompetidorDetalle);

module.exports = router;