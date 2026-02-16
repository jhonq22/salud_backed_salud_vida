const express = require('express');
const router = express.Router();
const cateterismoController = require('../../controllers/hemodinamia/cateterismoController');


// Cateterismo
router.post('/', cateterismoController.saveCateterismo);
router.get('/paciente/:solicitudId', cateterismoController.getCateterismoBySolicitud);


module.exports = router;