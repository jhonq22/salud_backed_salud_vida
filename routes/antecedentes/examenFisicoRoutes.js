const express = require('express');
const router = express.Router();
const examenFisicoController = require('../../controllers/antecedentes/examenFisicoController');

// 1. Obtener toda la estructura del formulario (Padres, hijos, nietos)
// IMPORTANTE: Pon esta ruta ANTES de la que lleva un ID (:solicitud_paciente_id) para evitar conflictos.
router.get('/configuracion', examenFisicoController.getConfiguracionFisico);

// 2. Guardar o actualizar el examen físico y signos vitales de un paciente
router.post('/guardar', examenFisicoController.guardarExamenPaciente);

// 3. Consultar un examen físico ya guardado (para editar o visualizar)
router.get('/:solicitud_paciente_id', examenFisicoController.getExamenPaciente);

module.exports = router;