
const express = require('express');
const router = express.Router();
const controller = require('../../controllers/hemodinamia/AntecendentesPersonalesHabitosController');

// Rutas para Guardado y Actualización (Upsert)
router.post('/antecedentes', controller.saveAntecedentes);
router.post('/examen-fisico', controller.saveExamenFisico);
router.post('/laboratorios', controller.saveLaboratorios);


// Ruta para obtener todos los datos de hemodinamia de una solicitud
router.get('/datos-completos/:solicitudId', controller.getHemodinamiaBySolicitud);

module.exports = router;