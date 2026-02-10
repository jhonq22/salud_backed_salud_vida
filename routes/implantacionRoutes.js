const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ImplantacionController');

router.post('/generador', ctrl.saveGenerador);
router.post('/electrodo-ventricular', ctrl.saveElectrodoVentricular);
router.post('/electrodo-auricular', ctrl.saveElectrodoAuricular); // <-- Nueva ruta
router.post('/medidos-ventricular', ctrl.saveParametrosMedidosVent);
router.post('/prog-ventricular', ctrl.saveParametrosProgVent);
router.post('/medidos-auricular', ctrl.saveParametrosMedidosAur);
router.post('/prog-auricular', ctrl.saveParametrosProgAur);

router.get('/todo/:id', ctrl.getTodoPorSolicitud);

module.exports = router;