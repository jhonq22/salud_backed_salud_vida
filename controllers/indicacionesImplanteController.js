const db = require('../config/db');

const indicacionesController = {
    // Crear registro
    create: async (req, res) => {
        try {
            const data = req.body;
            const query = `INSERT INTO indicaciones_implante_nuevos 
                (solicitud_paciente_id, relacionado_frecuencia_cardiaca_id, relacionado_trastornos_conduccion_id, 
                relacionado_trastornos_funcionales_id, relacionado_trastornos_otros_id, hb, gb, plaquetas, 
                creatinina, urea, audit_usu_id, audit_ip, audit_dep_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            const values = [
                data.solicitud_paciente_id, data.relacionado_frecuencia_cardiaca_id,
                data.relacionado_trastornos_conduccion_id, data.relacionado_trastornos_funcionales_id,
                data.relacionado_trastornos_otros_id, data.hb, data.gb, data.plaquetas,
                data.creatinina, data.urea, data.audit_usu_id, data.audit_ip, data.audit_dep_id
            ];

            const [result] = await db.query(query, values);
            res.status(201).json({ message: 'Registro creado', id: result.insertId });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Obtener todos
    getAll: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM indicaciones_implante_nuevos WHERE estatus = 1');
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Obtener por ID de solicitud
    getBySolicitud: async (req, res) => {
        try {
            const [rows] = await db.query(
                'SELECT * FROM indicaciones_implante_nuevos WHERE solicitud_paciente_id = ? AND estatus = 1',
                [req.params.id]
            );
            res.json(rows[0] || {});
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Actualizar
    update: async (req, res) => {
        try {
            const { id } = req.params;
            const data = req.body;
            const query = `UPDATE indicaciones_implante_nuevos SET 
                relacionado_frecuencia_cardiaca_id = ?, relacionado_trastornos_conduccion_id = ?, 
                relacionado_trastornos_funcionales_id = ?, relacionado_trastornos_otros_id = ?, 
                hb = ?, gb = ?, plaquetas = ?, creatinina = ?, urea = ?, 
                audit_usu_id = ?, audit_ip = ? WHERE id = ?`;

            await db.query(query, [...Object.values(data), id]);
            res.json({ message: 'Registro actualizado' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Eliminación lógica
    delete: async (req, res) => {
        try {
            await db.query('UPDATE indicaciones_implante_nuevos SET estatus = 0 WHERE id = ?', [req.params.id]);
            res.json({ message: 'Registro eliminado' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = indicacionesController;