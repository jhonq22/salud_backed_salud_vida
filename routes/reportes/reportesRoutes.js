const express = require('express');
const router = express.Router();
const ReportesController = require('../../controllers/reportes/ReportesController');

// Ruta para guardar o actualizar antecedentes (POST)
router.get('/sabana/:solicitud_id', ReportesController.getSabanaPaciente);
router.get('/marcapasos/:solicitud_id', ReportesController.getReporteMarcapasos);

// Ruta para obtener antecedentes por ID de solicitud (GET)

module.exports = router;