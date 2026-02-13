const express = require('express');
const router = express.Router();
const tecnicaController = require('../controllers/tecnicaProcedimientoController');

// Guardar nuevo procedimiento
router.post('/', tecnicaController.createTecnica);

// Obtener los datos del procedimiento de un paciente específico
router.get('/paciente/:solicitudId', tecnicaController.getTecnicaBySolicitud);

module.exports = router;