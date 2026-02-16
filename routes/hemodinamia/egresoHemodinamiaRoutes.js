const express = require('express');
const router = express.Router();
const egresoCtrl = require('../../controllers/hemodinamia/EgresoHemodinamiaController');

// POST: /api/egreso-hemodinamia
router.post('/', egresoCtrl.saveEgreso);

// GET: /api/egreso-hemodinamia/paciente/:solicitudId
router.get('/paciente/:solicitudId', egresoCtrl.getEgresoBySolicitud);

module.exports = router;