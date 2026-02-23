const express = require('express');
const router = express.Router();
const antecedentesController = require('../../controllers/antecedentes/antecedentesController');

// Ruta para guardar o actualizar antecedentes (POST)
router.post('/', antecedentesController.saveAntecedentes);

// Ruta para obtener antecedentes por ID de solicitud (GET)
router.get('/paciente/:solicitudId', antecedentesController.getAntecedentesBySolicitud);

// Ruta para obtener opciones de catálogo de antecedentes por padre_id
router.get('/catalogo/:padre_id', antecedentesController.lista_catalogo_antecedentes);

module.exports = router;