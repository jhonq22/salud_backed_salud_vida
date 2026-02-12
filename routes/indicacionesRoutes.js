const express = require('express');
const router = express.Router();
const indicacionesController = require('../controllers/indicacionesImplanteController');

router.post('/', indicacionesController.create);
router.get('/', indicacionesController.getAll);
router.get('/solicitud/:id', indicacionesController.getBySolicitud);
router.put('/:id', indicacionesController.update);
router.delete('/:id', indicacionesController.delete);

module.exports = router;