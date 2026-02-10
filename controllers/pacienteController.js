const db = require('../config/db');

// 1. Obtener todos los pacientes
const getAllPacientes = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM pacientes ORDER BY id DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener pacientes', error: error.message });
    }
};

// 2. Obtener un paciente por ID
const getPacienteById = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM pacientes WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Paciente no encontrado' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error al buscar paciente', error: error.message });
    }
};

// 3. Crear un nuevo paciente
const createPaciente = async (req, res) => {
    const {
        cedula, es_cedulado, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        sexo, fecha_nacimiento, estado_civil, estado_id, municipio_id, parroquia_id,
        telefono_local, telefono_celular, correo, estatus,
        // Nuevos campos
        edad, pais_id, lugar_nacimiento, nivel_estudio_id, direccion_actual,
        institucion_referencia, otra_institucion, religion, etnia_indigena_id,
        bilingue, telefono_emergencia, correo_secundario, instagram, facebook,
        twitter, otras_redes, codificacion_buen_gobierno,
        // Campo agregado
        paciente_id
    } = req.body;

    try {
        const sql = `
            INSERT INTO pacientes 
            (cedula, es_cedulado, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, 
            sexo, fecha_nacimiento, estado_civil, estado_id, municipio_id, parroquia_id,
            telefono_local, telefono_celular, correo, estatus,
            edad, pais_id, lugar_nacimiento, nivel_estudio_id, direccion_actual,
            institucion_referencia, otra_institucion, religion, etnia_indigena_id,
            bilingue, telefono_emergencia, correo_secundario, instagram, facebook,
            twitter, otras_redes, codificacion_buen_gobierno, paciente_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            cedula, es_cedulado, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
            sexo, fecha_nacimiento, estado_civil, estado_id, municipio_id, parroquia_id,
            telefono_local, telefono_celular, correo, estatus || 1,
            edad, pais_id, lugar_nacimiento, nivel_estudio_id, direccion_actual,
            institucion_referencia, otra_institucion, religion, etnia_indigena_id,
            bilingue, telefono_emergencia, correo_secundario, instagram, facebook,
            twitter, otras_redes, codificacion_buen_gobierno, paciente_id || null
        ];

        const [result] = await db.query(sql, values);
        res.status(201).json({ message: 'Paciente creado exitosamente', id: result.insertId });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear paciente', error: error.message });
    }
};

// 4. Actualizar un paciente
const updatePaciente = async (req, res) => {
    const { id } = req.params;
    const {
        cedula, es_cedulado, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        sexo, fecha_nacimiento, estado_civil, estado_id, municipio_id, parroquia_id,
        telefono_local, telefono_celular, correo, estatus,
        // Nuevos campos
        edad, pais_id, lugar_nacimiento, nivel_estudio_id, direccion_actual,
        institucion_referencia, otra_institucion, religion, etnia_indigena_id,
        bilingue, telefono_emergencia, correo_secundario, instagram, facebook,
        twitter, otras_redes, codificacion_buen_gobierno,
        // Campo agregado
        paciente_id
    } = req.body;

    try {
        const sql = `
            UPDATE pacientes SET 
            cedula=?, es_cedulado=?, primer_nombre=?, segundo_nombre=?, primer_apellido=?, segundo_apellido=?, 
            sexo=?, fecha_nacimiento=?, estado_civil=?, estado_id=?, municipio_id=?, parroquia_id=?,
            telefono_local=?, telefono_celular=?, correo=?, estatus=?,
            edad=?, pais_id=?, lugar_nacimiento=?, nivel_estudio_id=?, direccion_actual=?,
            institucion_referencia=?, otra_institucion=?, religion=?, etnia_indigena_id=?,
            bilingue=?, telefono_emergencia=?, correo_secundario=?, instagram=?, facebook=?,
            twitter=?, otras_redes=?, codificacion_buen_gobierno=?, paciente_id=?
            WHERE id = ?
        `;

        const values = [
            cedula, es_cedulado, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
            sexo, fecha_nacimiento, estado_civil, estado_id, municipio_id, parroquia_id,
            telefono_local, telefono_celular, correo, estatus,
            edad, pais_id, lugar_nacimiento, nivel_estudio_id, direccion_actual,
            institucion_referencia, otra_institucion, religion, etnia_indigena_id,
            bilingue, telefono_emergencia, correo_secundario, instagram, facebook,
            twitter, otras_redes, codificacion_buen_gobierno, paciente_id || null, id
        ];

        const [result] = await db.query(sql, values);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Paciente no encontrado' });
        res.json({ message: 'Paciente actualizado exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar paciente', error: error.message });
    }
};

// 5. Eliminar paciente
const deletePaciente = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM pacientes WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Paciente no encontrado' });
        res.json({ message: 'Paciente eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar paciente', error: error.message });
    }
};

module.exports = { getAllPacientes, getPacienteById, createPaciente, updatePaciente, deletePaciente };