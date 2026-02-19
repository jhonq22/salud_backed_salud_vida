const express = require('express');
const router = express.Router();
const solicitudController = require('../controllers/solicitudController');


const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


const { subirExcelTemporal, obtenerPacientesTemporales, obtenerEstadoHospital } = require('../controllers/migrar_citas/MigrarCitasController');
const { confirmarCitas } = require('../controllers/migrar_citas/confirmacionController');

router.get('/ver-temporales', obtenerPacientesTemporales);

// Rutas de Listado
router.get('/', solicitudController.getSolicitudes);
router.get('/pendientes', solicitudController.getSolicitudesPendientesAreaMedica);
router.get('/pendientes-administrativas', solicitudController.getSolicitudesPendientesAreaAdministrativa);
router.get('/pendientes-centro/:centro_salud_id', solicitudController.getSolicitudesPendientesPorCentro);
router.get('/pendientes-medicas', solicitudController.getSolicitudesPendientesAreaMedica);
router.get('/administrativas/:id', solicitudController.getSolicitudesAdministrativas); // Estatus 1
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

// Actualizaciones de tipo de operación y marcapaso
router.put('/update-tipo-operacion-y-marca-paso/:id', solicitudController.updateTipoOperacionYMarcaPaso);

// Rutas de Migración de Citas
router.post('/subir-excel-temporal', upload.single('archivo'), subirExcelTemporal);
router.post('/confirmar-citas', confirmarCitas);
router.get('/estado-hospital/:centro_salud_id', obtenerEstadoHospital);


module.exports = router;