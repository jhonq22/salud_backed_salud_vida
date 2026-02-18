const express = require('express');
const router = express.Router();
const CrudListaTipoController = require('../../controllers/crud/CrudListaTipoController');

// Listar todos los activos
router.get('/tipo-operaciones', CrudListaTipoController.getOperaciones);
// Guardar (id: null) o Actualizar (id: valor)
router.post('/tipo-operaciones', CrudListaTipoController.saveOperacion);
// Desactivar (cambiar estatus a 0)
router.delete('/tipo-operaciones/:id', CrudListaTipoController.deleteOperacion);

// Listar centroSalud
router.get('/centro-salud', CrudListaTipoController.getCentros);
// Guardar (id: null) o Actualizar (id: valor)
router.post('/centro-salud', CrudListaTipoController.saveCentro);
// Desactivar (cambiar estatus a 0)
router.delete('/centro-salud/:id', CrudListaTipoController.deleteCentro);

module.exports = router;