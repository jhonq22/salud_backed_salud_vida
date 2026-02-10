const express = require('express');
const router = express.Router();
const representanteController = require('../controllers/representanteController');

router.get('/', representanteController.getAllRepresentantes);
router.get('/paciente/:paciente_id', representanteController.getRepresentanteByPacienteId);
router.post('/', representanteController.createRepresentante);
router.put('/:id', representanteController.updateRepresentante);

module.exports = router;