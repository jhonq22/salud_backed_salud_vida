const express = require('express');
const router = express.Router();
const configuracionDiasController = require('../../controllers/migrar_citas/configuracionDiasController');

// Rutas para /api/configuracion-dias
router.get('/', configuracionDiasController.getAll);
router.get('/:id', configuracionDiasController.getById);
router.post('/', configuracionDiasController.create);
router.put('/:id', configuracionDiasController.update);

module.exports = router;