const db = require('../../config/db');

const CrudListaTipoController = {
    // ==========================================
    // SECCIÓN: TIPO OPERACIONES
    // ==========================================

    getOperaciones: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM tipo_operaciones ORDER BY tipo_operacion ASC');
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    saveOperacion: async (req, res) => {
        const { id, tipo_operacion, estatus } = req.body;
        if (!tipo_operacion) return res.status(400).json({ error: 'El nombre es obligatorio' });

        try {
            const [existe] = await db.query(
                'SELECT id FROM tipo_operaciones WHERE tipo_operacion = ? AND id != ? AND estatus = 1',
                [tipo_operacion, id || 0]
            );
            if (existe.length > 0) return res.status(400).json({ error: 'Ya existe un registro con este nombre' });

            if (id) {
                await db.query('UPDATE tipo_operaciones SET tipo_operacion = ?, estatus = ? WHERE id = ?', [tipo_operacion, estatus, id]);
                return res.json({ message: 'Actualizado con éxito' });
            } else {
                const [result] = await db.query('INSERT INTO tipo_operaciones (tipo_operacion, estatus) VALUES (?, 1)', [tipo_operacion]);
                return res.status(201).json({ message: 'Creado con éxito', id: result.insertId });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    deleteOperacion: async (req, res) => {
        const { id } = req.params;
        try {
            await db.query('UPDATE tipo_operaciones SET estatus = 0 WHERE id = ?', [id]);
            res.json({ message: 'Registro desactivado' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==========================================
    // SECCIÓN: CENTROS DE SALUD
    // ==========================================

    getCentros: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM lista_centro_salud ORDER BY descripcion ASC');
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    saveCentro: async (req, res) => {
        const { id, descripcion, estatus } = req.body;
        if (!descripcion) return res.status(400).json({ error: 'La descripción es obligatoria' });

        try {
            const [existe] = await db.query(
                'SELECT id FROM lista_centro_salud WHERE descripcion = ? AND id != ? AND estatus = 1',
                [descripcion, id || 0]
            );
            if (existe.length > 0) return res.status(400).json({ error: 'Este centro de salud ya está registrado' });

            if (id) {
                await db.query('UPDATE lista_centro_salud SET descripcion = ?, estatus = ? WHERE id = ?', [descripcion, estatus, id]);
                return res.json({ message: 'Centro de salud actualizado' });
            } else {
                const [result] = await db.query('INSERT INTO lista_centro_salud (descripcion, estatus) VALUES (?, 1)', [descripcion]);
                return res.status(201).json({ message: 'Centro de salud creado', id: result.insertId });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    deleteCentro: async (req, res) => {
        const { id } = req.params;
        try {
            await db.query('UPDATE lista_centro_salud SET estatus = 0 WHERE id = ?', [id]);
            res.json({ message: 'Centro de salud desactivado' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==========================================
    // SECCIÓN: ESPECIALIDADES (Nueva)
    // ==========================================

    getEspecialidades: async (req, res) => {
        try {
            // Obtenemos todas las especialidades ordenadas alfabéticamente
            const [rows] = await db.query('SELECT * FROM especialidades ORDER BY descripcion ASC');
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    saveEspecialidad: async (req, res) => {
        const { id, descripcion, estatus } = req.body;
        if (!descripcion) return res.status(400).json({ error: 'La descripción de la especialidad es obligatoria' });

        try {
            // Evitar duplicados activos
            const [existe] = await db.query(
                'SELECT id FROM especialidades WHERE descripcion = ? AND id != ? AND estatus = 1',
                [descripcion, id || 0]
            );

            if (existe.length > 0) {
                return res.status(400).json({ error: 'Esta especialidad ya se encuentra registrada' });
            }

            if (id) {
                // Modo Edición
                await db.query(
                    'UPDATE especialidades SET descripcion = ?, estatus = ? WHERE id = ?',
                    [descripcion, estatus, id]
                );
                return res.json({ message: 'Especialidad actualizada correctamente' });
            } else {
                // Modo Creación
                const [result] = await db.query(
                    'INSERT INTO especialidades (descripcion, estatus) VALUES (?, 1)',
                    [descripcion]
                );
                return res.status(201).json({
                    message: 'Especialidad creada con éxito',
                    id: result.insertId
                });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    deleteEspecialidad: async (req, res) => {
        const { id } = req.params;
        try {
            // Realizamos un borrado lógico (cambio de estatus)
            await db.query('UPDATE especialidades SET estatus = 0 WHERE id = ?', [id]);
            res.json({ message: 'Especialidad desactivada' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = CrudListaTipoController;