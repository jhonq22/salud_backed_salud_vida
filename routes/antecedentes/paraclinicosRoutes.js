const express = require('express');
const router = express.Router();
const paraclinicosController = require('../../controllers/antecedentes/paraclinicosController');

// --- CATÁLOGOS ---
// ERROR CORREGIDO: Se agregó "paraclinicosController." antes del nombre de la función
router.get('/catalogo/:categoria', paraclinicosController.lista_catalogo_paraclinicos);

// --- ENDPOINTS ECG ---
router.post('/ecg', paraclinicosController.saveECG);
router.get('/ecg/:solicitudId', paraclinicosController.getECG);

// --- ENDPOINTS ECO ---
router.post('/eco', paraclinicosController.saveECO);
router.get('/eco/:solicitudId', paraclinicosController.getECO);

// --- ENDPOINTS RX ---
router.post('/rx', paraclinicosController.saveRX);
router.get('/rx/:solicitudId', paraclinicosController.getRX);

module.exports = router;