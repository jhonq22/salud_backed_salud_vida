const db = require('../../config/db');

const configuracionDiasController = {
    // Obtener todos los días configurados de un Centro de Salud específico
    getAll: async (req, res) => {
        const { centro_salud_id } = req.query;

        try {
            let query = 'SELECT * FROM configuracion_dias';
            let params = [];

            // Si envían el ID, filtramos, si no, traemos todo
            if (centro_salud_id) {
                query += ' WHERE centro_salud_id = ?';
                params.push(centro_salud_id);
            }

            query += ' ORDER BY dia_semana ASC';

            const [rows] = await db.query(query, params);
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    // Obtener un registro específico por ID
    getById: async (req, res) => {
        const { id } = req.params;
        try {
            const [rows] = await db.query('SELECT * FROM configuracion_dias WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Configuración no encontrada' });
            res.json(rows[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Guardar nueva configuración vinculada al hospital
    create: async (req, res) => {
        const { dia_semana, cupos_maximos, centro_salud_id } = req.body;

        // Validación de datos de entrada
        if (dia_semana === undefined || cupos_maximos === undefined || !centro_salud_id) {
            return res.status(400).json({ error: 'Todos los campos (Día, Cupos y Hospital) son obligatorios.' });
        }

        try {
            // Verificar si ese hospital ya tiene configurado ese día específico
            const [existente] = await db.query(
                'SELECT id FROM configuracion_dias WHERE dia_semana = ? AND centro_salud_id = ?',
                [dia_semana, centro_salud_id]
            );

            if (existente.length > 0) {
                return res.status(400).json({ error: 'Este hospital ya tiene una configuración para este día de la semana.' });
            }

            const [result] = await db.query(
                'INSERT INTO configuracion_dias (dia_semana, cupos_maximos, centro_salud_id) VALUES (?, ?, ?)',
                [dia_semana, cupos_maximos, centro_salud_id]
            );

            res.status(201).json({
                message: 'Configuración guardada con éxito para el centro de salud',
                id: result.insertId
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Actualizar configuración existente (Cupos o Día)
    update: async (req, res) => {
        const { id } = req.params;
        const { dia_semana, cupos_maximos, centro_salud_id } = req.body;

        if (!centro_salud_id) {
            return res.status(400).json({ error: 'El ID del centro de salud es obligatorio para actualizar.' });
        }

        try {
            // Verificamos que no estemos intentando cambiar a un día que ya tiene cupos en ese mismo hospital
            const [duplicado] = await db.query(
                'SELECT id FROM configuracion_dias WHERE dia_semana = ? AND centro_salud_id = ? AND id != ?',
                [dia_semana, centro_salud_id, id]
            );

            if (duplicado.length > 0) {
                return res.status(400).json({ error: 'No se puede actualizar: el hospital ya tiene otro registro para ese día.' });
            }

            const [result] = await db.query(
                'UPDATE configuracion_dias SET dia_semana = ?, cupos_maximos = ?, centro_salud_id = ? WHERE id = ?',
                [dia_semana, cupos_maximos, centro_salud_id, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Registro no encontrado' });
            }

            res.json({ message: 'Configuración del hospital actualizada correctamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = configuracionDiasController;