const db = require('../config/db');

const createSolicitud = async (req, res) => {
    const {
        paciente_id, centro_salud_id, posee_cedula_identidad, archivo_cedula_id,
        observacion_cedula, posee_informe_medico, archivo_informe_medico_id,
        observacion_informe_medico, tipo_operacion_id, tipo_marca_paso_id, marcapaso
    } = req.body;

    try {
        const sql = `INSERT INTO registrar_solicitud_pacientes 
            (paciente_id, centro_salud_id, posee_cedula_identidad, archivo_cedula_id, observacion_cedula, 
            posee_informe_medico, archivo_informe_medico_id, observacion_informe_medico, tipo_operacion_id, tipo_marca_paso_id, marcapaso) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const [result] = await db.query(sql, [
            paciente_id, centro_salud_id, posee_cedula_identidad, archivo_cedula_id,
            observacion_cedula, posee_informe_medico, archivo_informe_medico_id,
            observacion_informe_medico, tipo_operacion_id, tipo_marca_paso_id, marcapaso
        ]);

        res.status(201).json({ message: 'Solicitud creada', id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getSolicitudes = async (req, res) => {
    try {
        // Al usar SELECT *, ya incluye tipo_marca_paso_id automáticamente
        const [rows] = await db.query('SELECT * FROM registrar_solicitud_pacientes');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- API PARA EL PACIENTE: Obtener su solicitud actual ---
const getSolicitudByPacienteId = async (req, res) => {
    const { paciente_id } = req.params;
    try {
        const sql = `
            SELECT 
                s.*, 
                p.primer_nombre, p.primer_apellido, p.cedula, p.correo, p.telefono_celular,
                s.tipo_marca_paso_id,
                es.nombre_estatus AS estatus_nombre,
                DATE_FORMAT(s.fecha_creacion, '%e de %M de %Y') AS fecha_formateada
            FROM registrar_solicitud_pacientes s
            INNER JOIN pacientes p ON s.paciente_id = p.id
            LEFT JOIN estatus_solicitudes es ON s.estatus_solicitud_id = es.id
            WHERE s.paciente_id = ?
            ORDER BY s.fecha_creacion DESC LIMIT 1`;

        const [rows] = await db.query(sql, [paciente_id]);
        if (rows.length === 0) return res.status(404).json({ message: 'No se encontró solicitud para este paciente' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const getSolicitudById = async (req, res) => {
    const { id } = req.params;
    try {
        const sql = `
            SELECT 
                s.*, 
                p.primer_nombre, p.primer_apellido, p.cedula, p.correo, p.telefono_celular,
                s.tipo_operacion_id,
                s.tipo_marca_paso_id,
                es.nombre_estatus AS estatus_nombre,
                DATE_FORMAT(s.fecha_creacion, '%e de %M de %Y') AS fecha_formateada
            FROM registrar_solicitud_pacientes s
            INNER JOIN pacientes p ON s.paciente_id = p.id
            LEFT JOIN estatus_solicitudes es ON s.estatus_solicitud_id = es.id
            WHERE s.id = ?`;

        const [rows] = await db.query(sql, [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'No se encontró solicitud para este paciente' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// --- NUEVA API: Obtener todas las solicitudes con estatus 1
const getSolicitudesPendientesAreaAdministrativa = async (req, res) => {
    try {
        const sql = `
            SELECT 
                s.*, 
                p.primer_nombre, p.primer_apellido, p.cedula, p.correo, p.telefono_celular,
                s.tipo_marca_paso_id,
                es.nombre_estatus AS estatus_nombre,
                DATE_FORMAT(s.fecha_creacion, '%e de %M de %Y') AS fecha_solicitud
            FROM registrar_solicitud_pacientes s
            INNER JOIN pacientes p ON s.paciente_id = p.id
            LEFT JOIN estatus_solicitudes es ON s.estatus_solicitud_id = es.id
            WHERE s.estatus_solicitud_id IN (1)
            ORDER BY s.fecha_creacion DESC`;

        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// --- NUEVA API: Obtener todas las solicitudes con estatus 1 y 2 ---
const getSolicitudesPendientesAreaMedica = async (req, res) => {
    try {
        const sql = `
            SELECT 
                s.*, 
                p.primer_nombre, p.primer_apellido, p.cedula, p.correo, p.telefono_celular,
                s.tipo_marca_paso_id,
                es.nombre_estatus AS estatus_nombre,
                DATE_FORMAT(s.fecha_creacion, '%e de %M de %Y') AS fecha_solicitud
            FROM registrar_solicitud_pacientes s
            INNER JOIN pacientes p ON s.paciente_id = p.id
            LEFT JOIN estatus_solicitudes es ON s.estatus_solicitud_id = es.id
            WHERE s.estatus_solicitud_id IN (1, 2)
            ORDER BY s.fecha_creacion DESC`;

        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- API ADMINISTRATIVA: Solo 1 solicitud ---
const getSolicitudesAdministrativas = async (req, res) => {
    try {
        const sql = `
            SELECT 
                s.*, 
                p.primer_nombre, p.primer_apellido, p.cedula, p.edad, p.fecha_nacimiento, p.correo, p.telefono_celular,
                s.tipo_marca_paso_id,
                DATE_FORMAT(s.fecha_creacion, '%e de %M de %Y') AS fecha_solicitud
            FROM registrar_solicitud_pacientes s
            INNER JOIN pacientes p ON s.paciente_id = p.id
            WHERE s.estatus_solicitud_id = 1
            ORDER BY s.fecha_creacion DESC LIMIT 1`;

        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- API MÉDICA: Solo 1 solicitud ---
const getSolicitudesMedicas = async (req, res) => {
    try {
        const sql = `
            SELECT 
                s.*, 
                p.primer_nombre, p.primer_apellido, p.cedula, p.correo, p.telefono_celular,
                s.tipo_marca_paso_id,
                DATE_FORMAT(s.fecha_creacion, '%e de %M de %Y') AS fecha_solicitud
            FROM registrar_solicitud_pacientes s
            INNER JOIN pacientes p ON s.paciente_id = p.id
            WHERE s.estatus_solicitud_id = 2
            ORDER BY s.fecha_creacion DESC LIMIT 1`;

        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateEstatusFase = async (req, res) => {
    const { id } = req.params;
    const { estatus_solicitud_id } = req.body;
    try {
        await db.query('UPDATE registrar_solicitud_pacientes SET estatus_solicitud_id = ? WHERE id = ?', [estatus_solicitud_id, id]);
        res.json({ message: 'Estatus de solicitud actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateDatosMedicos = async (req, res) => {
    const { id } = req.params;
    const { tipo_operacion_id, tipo_marca_paso_id, marcapaso, centro_salud_id } = req.body;
    try {
        await db.query(
            'UPDATE registrar_solicitud_pacientes SET tipo_operacion_id = ?, tipo_marca_paso_id = ?, marcapaso = ?, centro_salud_id = ? WHERE id = ?',
            [tipo_operacion_id, tipo_marca_paso_id, marcapaso, centro_salud_id, id]
        );
        res.json({ message: 'Datos médicos de la solicitud actualizados' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateVerificacionDocumento = async (req, res) => {
    const { id } = req.params;
    const { tipo_documento, aprobado, observacion } = req.body;

    let campoPosee = '';
    let campoObservacion = '';

    if (tipo_documento === 'CEDULA') {
        campoPosee = 'posee_cedula_identidad';
        campoObservacion = 'observacion_cedula';
    } else if (tipo_documento === 'INFORME') {
        campoPosee = 'posee_informe_medico';
        campoObservacion = 'observacion_informe_medico';
    } else {
        return res.status(400).json({ error: 'Tipo de documento inválido.' });
    }

    if (!aprobado && (!observacion || observacion.trim() === '')) {
        return res.status(400).json({ error: 'La observación es obligatoria al rechazar.' });
    }

    try {
        const valorPosee = aprobado ? 1 : 0;
        const valorObservacion = aprobado ? null : observacion;
        const sql = `UPDATE registrar_solicitud_pacientes SET ${campoPosee} = ?, ${campoObservacion} = ? WHERE id = ?`;
        await db.query(sql, [valorPosee, valorObservacion, id]);
        res.json({ message: 'Verificación actualizada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteSolicitud = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM registrar_solicitud_pacientes WHERE id = ?', [id]);
        res.json({ message: 'Solicitud eliminada' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- FINALIZAR PROCESO ADMINISTRATIVO ---
const finalizarVerificacion = async (req, res) => {
    const { id } = req.params;
    const { centro_salud_id } = req.body;

    if (!centro_salud_id) {
        return res.status(400).json({ error: 'El Centro de Salud es obligatorio.' });
    }

    try {
        const [rows] = await db.query(
            'SELECT posee_cedula_identidad, posee_informe_medico FROM registrar_solicitud_pacientes WHERE id = ?',
            [id]
        );

        if (rows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });

        const { posee_cedula_identidad, posee_informe_medico } = rows[0];
        let nuevoEstatus = (posee_cedula_identidad === 1 && posee_informe_medico === 1) ? 2 : 4;

        await db.query(
            `UPDATE registrar_solicitud_pacientes 
             SET estatus_solicitud_id = ?, 
                 centro_salud_id = ? 
             WHERE id = ?`,
            [nuevoEstatus, centro_salud_id, id]
        );

        res.json({
            message: 'Verificación finalizada con éxito',
            nuevo_estatus_id: nuevoEstatus
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const asignarHospital = async (req, res) => {
    const { id } = req.params;
    const { centro_salud_id, tipo_operacion_id } = req.body;

    try {
        const sql = `
            UPDATE registrar_solicitud_pacientes 
            SET 
                centro_salud_id = ?, 
                tipo_operacion_id = ?,
                estatus_solicitud_id = 5 
            WHERE id = ?`;

        const [result] = await db.query(sql, [centro_salud_id, tipo_operacion_id, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Solicitud no encontrada" });
        }

        res.json({ message: "Hospital asignado y estatus actualizado a 5" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const updateTipoOperacionYMarcaPaso = async (req, res) => {
    const { id } = req.params;
    const { tipo_marca_paso_id, tipo_operacion_id } = req.body;

    try {
        let campos = [];
        let valores = [];

        if (tipo_marca_paso_id !== undefined && tipo_marca_paso_id !== null) {
            campos.push("tipo_marca_paso_id = ?");
            valores.push(tipo_marca_paso_id);
        }

        if (tipo_operacion_id !== undefined && tipo_operacion_id !== null) {
            campos.push("tipo_operacion_id = ?");
            valores.push(tipo_operacion_id);
        }

        if (campos.length === 0) {
            return res.status(400).json({ message: 'No se enviaron datos válidos para actualizar' });
        }

        valores.push(id);

        const sql = `UPDATE registrar_solicitud_pacientes SET ${campos.join(', ')} WHERE id = ?`;

        const [result] = await db.query(sql, valores);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }

        res.json({ message: 'Campos de operación y marcapaso actualizados correctamente' });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};





module.exports = {
    createSolicitud,
    getSolicitudes,
    getSolicitudByPacienteId,
    getSolicitudesAdministrativas,
    getSolicitudesMedicas,
    updateEstatusFase,
    updateDatosMedicos,
    updateVerificacionDocumento,
    deleteSolicitud,
    finalizarVerificacion,
    asignarHospital,
    getSolicitudesPendientesAreaMedica,
    getSolicitudesPendientesAreaAdministrativa,
    getSolicitudById,
    updateTipoOperacionYMarcaPaso
};