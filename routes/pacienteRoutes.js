// routes/pacienteRoutes.js
const express = require('express');
const router = express.Router();
const pacienteController = require('../controllers/pacienteController');

// Definición de las rutas
router.get('/', pacienteController.getAllPacientes);           // GET /api/pacientes
router.get('/:id', pacienteController.getPacienteById);        // GET /api/pacientes/1
router.post('/', pacienteController.createPaciente);           // POST /api/pacientes
router.put('/:id', pacienteController.updatePaciente);         // PUT /api/pacientes/1
router.delete('/:id', pacienteController.deletePaciente);      // DELETE /api/pacientes/1

module.exports = router;