const db = require('../config/db');

// Obtener todos los representantes
const getAllRepresentantes = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM pacientes_representante');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener representante por ID de paciente
const getRepresentanteByPacienteId = async (req, res) => {
    const { paciente_id } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM pacientes_representante WHERE paciente_id = ?', [paciente_id]);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Crear representante
const createRepresentante = async (req, res) => {
    const {
        paciente_id, cedula, primer_nombre, segundo_nombre, primer_apellido,
        segundo_apellido, sexo, fecha_nacimiento, edad, parentesco,
        estado_civil, nivel_estudio_id, ocupacion, telefono_local,
        telefono_celular, correo, estatus
    } = req.body;

    try {
        const sql = `INSERT INTO pacientes_representante 
            (paciente_id, cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, 
            sexo, fecha_nacimiento, edad, parentesco, estado_civil, nivel_estudio_id, 
            ocupacion, telefono_local, telefono_celular, correo, estatus) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const [result] = await db.query(sql, [
            paciente_id, cedula, primer_nombre, segundo_nombre, primer_apellido,
            segundo_apellido, sexo, fecha_nacimiento, edad, parentesco,
            estado_civil, nivel_estudio_id, ocupacion, telefono_local,
            telefono_celular, correo, estatus || 1
        ]);
        res.status(201).json({ id: result.insertId, message: 'Representante creado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Actualizar representante
const updateRepresentante = async (req, res) => {
    const { id } = req.params;
    const fields = req.body;
    try {
        await db.query('UPDATE pacientes_representante SET ? WHERE id = ?', [fields, id]);
        res.json({ message: 'Representante actualizado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllRepresentantes,
    getRepresentanteByPacienteId,
    createRepresentante,
    updateRepresentante
};