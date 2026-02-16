// routes/cateterismoTerapeuticoRoutes.js
const express = require('express');
const router = express.Router();
const terapeuticoCtrl = require('../../controllers/hemodinamia/CateterismoTerapeuticoController');

router.post('/', terapeuticoCtrl.saveTerapeutico);
router.get('/paciente/:solicitudId', terapeuticoCtrl.getTerapeuticoBySolicitud);

module.exports = router;