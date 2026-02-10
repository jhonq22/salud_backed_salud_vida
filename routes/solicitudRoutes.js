const express = require('express');
const router = express.Router();
const solicitudController = require('../controllers/solicitudController');

// Rutas de Listado
router.get('/', solicitudController.getSolicitudes);
router.get('/pendientes', solicitudController.getSolicitudesPendientesAreaMedica);
router.get('/pendientes-administrativas', solicitudController.getSolicitudesPendientesAreaAdministrativa);
router.get('/pendientes-medicas', solicitudController.getSolicitudesPendientesAreaMedica);
router.get('/administrativas', solicitudController.getSolicitudesAdministrativas); // Estatus 1
router.get('/medicas', solicitudController.getSolicitudesMedicas);             // Estatus 2
router.get('/paciente/:paciente_id', solicitudController.getSolicitudByPacienteId);
router.get('/:id', solicitudController.getSolicitudById);

// Creación y Eliminación
router.post('/', solicitudController.createSolicitud);
router.delete('/:id', solicitudController.deleteSolicitud);

// Actualizaciones de proceso y documentos
router.patch('/update-fase/:id', solicitudController.updateEstatusFase);
router.put('/update-medico/:id', solicitudController.updateDatosMedicos);
router.put('/verificar-documento/:id', solicitudController.updateVerificacionDocumento);
router.put('/finalizar-verificacion/:id', solicitudController.finalizarVerificacion);
router.put('/asignar-hospital/:id', solicitudController.asignarHospital);



module.exports = router;