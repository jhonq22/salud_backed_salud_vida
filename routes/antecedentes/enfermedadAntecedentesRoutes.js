const express = require('express');
const router = express.Router();
const enfermedadController = require('../../controllers/antecedentes/enfermedadAntecedentesController');

// Ruta para guardar o actualizar (POST)
router.post('/', enfermedadController.saveEnfermedadActual);

// Ruta para obtener por ID de solicitud (GET)
router.get('/paciente/:solicitudId', enfermedadController.getEnfermedadBySolicitud);

// Ruta para obtener opciones de catálogo por padre_id
router.get('/catalogo/:padre_id', enfermedadController.lista_catologo_enfermedad);

module.exports = router;