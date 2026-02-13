const express = require('express');
const router = express.Router();
const controller = require('../controllers/ComplicacionesImplantadasController');

// Rutas Complicaciones
router.post('/complicaciones', controller.saveComplicaciones);
router.get('/complicaciones/:id', controller.getComplicaciones);

// Rutas Signos Vitales
router.post('/signos-vitales', controller.saveSignosVitales);
router.get('/signos-vitales/:id', controller.getSignosVitales);

// Rutas Plan y Recomendaciones
router.post('/plan', controller.savePlan);
router.get('/plan/:id', controller.getPlan);

module.exports = router;