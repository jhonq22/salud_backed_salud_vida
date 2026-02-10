const express = require('express');
const router = express.Router();
const tipoListaController = require('../controllers/tipoListaController');

// Ubicaciones y Geografía
router.get('/estados', tipoListaController.getEstados);
router.get('/municipios/:id_estado', tipoListaController.getMunicipiosByEstado);
router.get('/parroquias/:id_municipio', tipoListaController.getParroquiasByMunicipio);
router.get('/paises', tipoListaController.getPaises);

// Listas de Caracterización
router.get('/estatus-solicitudes', tipoListaController.getEstatusSolicitudes);
router.get('/tipo-operaciones', tipoListaController.getTipoOperaciones);
router.get('/nivel-estudios', tipoListaController.getNivelEstudios);
router.get('/etnias', tipoListaController.getEtniasIndigenas);

// Listas de Marcapasos (NUEVAS)
router.get('/marcapasos-tipos', tipoListaController.getTiposMarcapasos);
router.get('/marcapasos-marcas/:id_tipo', tipoListaController.getMarcasByTipo);
router.get('/marcapasos-modelos/:id_marca', tipoListaController.getModelosByMarca);

module.exports = router;