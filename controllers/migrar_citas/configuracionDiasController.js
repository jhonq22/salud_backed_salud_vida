const db = require('../../config/db');

const configuracionDiasController = {
    // Obtener todos los días configurados
    getAll: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM configuracion_dias ORDER BY dia_semana ASC');
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

    // Guardar nueva configuración
    create: async (req, res) => {
        const { dia_semana, cupos_maximos } = req.body;

        if (dia_semana === undefined || cupos_maximos === undefined) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
        }

        try {
            const [result] = await db.query(
                'INSERT INTO configuracion_dias (dia_semana, cupos_maximos) VALUES (?, ?)',
                [dia_semana, cupos_maximos]
            );
            res.status(201).json({
                message: 'Configuración guardada',
                id: result.insertId
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Actualizar configuración existente
    update: async (req, res) => {
        const { id } = req.params;
        const { dia_semana, cupos_maximos } = req.body;

        try {
            const [result] = await db.query(
                'UPDATE configuracion_dias SET dia_semana = ?, cupos_maximos = ? WHERE id = ?',
                [dia_semana, cupos_maximos, id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Registro no encontrado' });
            }

            res.json({ message: 'Configuración actualizada correctamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = configuracionDiasController;