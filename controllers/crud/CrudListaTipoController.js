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
    },




    // ==========================================
    // SECCIÓN: MARCAS
    // ==========================================

    getMarcas: async (req, res) => {
        try {
            // Hacemos un JOIN para que el frontend reciba el nombre del tipo de marcapasos y sea fácil armar la tabla
            const query = `
                SELECT m.*, t.tipo AS tipo_marca_nombre 
                FROM marcas m 
                LEFT JOIN tipo_marca_pasos t ON m.tipo_marca_id = t.id 
                ORDER BY m.marca ASC
            `;
            const [rows] = await db.query(query);
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    saveMarca: async (req, res) => {
        const { id, marca, tipo_marca_id, estatus } = req.body;
        if (!marca) return res.status(400).json({ error: 'El nombre de la marca es obligatorio' });
        if (!tipo_marca_id) return res.status(400).json({ error: 'El tipo de marca es obligatorio' });

        try {
            // Validamos que no exista la misma marca para el mismo tipo_marca_id
            const [existe] = await db.query(
                'SELECT id FROM marcas WHERE marca = ? AND tipo_marca_id = ? AND id != ? AND estatus = 1',
                [marca, tipo_marca_id, id || 0]
            );

            if (existe.length > 0) {
                return res.status(400).json({ error: 'Esta marca ya se encuentra registrada para este tipo de marcapasos' });
            }

            if (id) {
                // Modo Edición
                await db.query(
                    'UPDATE marcas SET marca = ?, tipo_marca_id = ?, estatus = ? WHERE id = ?',
                    [marca, tipo_marca_id, estatus, id]
                );
                return res.json({ message: 'Marca actualizada correctamente' });
            } else {
                // Modo Creación
                const [result] = await db.query(
                    'INSERT INTO marcas (marca, tipo_marca_id, estatus) VALUES (?, ?, 1)',
                    [marca, tipo_marca_id]
                );
                return res.status(201).json({
                    message: 'Marca creada con éxito',
                    id: result.insertId
                });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    deleteMarca: async (req, res) => {
        const { id } = req.params;
        try {
            await db.query('UPDATE marcas SET estatus = 0 WHERE id = ?', [id]);
            res.json({ message: 'Marca desactivada' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==========================================
    // SECCIÓN: MODELOS
    // ==========================================

    getModelos: async (req, res) => {
        try {
            // Hacemos un JOIN para traer también el nombre de la marca asociada
            const query = `
                SELECT md.*, m.marca AS marca_nombre 
                FROM modelos md 
                LEFT JOIN marcas m ON md.marca_id = m.id 
                ORDER BY md.modelo ASC
            `;
            const [rows] = await db.query(query);
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    saveModelo: async (req, res) => {
        const { id, modelo, marca_id, estatus } = req.body;
        if (!modelo) return res.status(400).json({ error: 'El nombre del modelo es obligatorio' });
        if (!marca_id) return res.status(400).json({ error: 'La marca es obligatoria' });

        try {
            // Validamos que no exista el mismo modelo para la misma marca
            const [existe] = await db.query(
                'SELECT id FROM modelos WHERE modelo = ? AND marca_id = ? AND id != ? AND estatus = 1',
                [modelo, marca_id, id || 0]
            );

            if (existe.length > 0) {
                return res.status(400).json({ error: 'Este modelo ya se encuentra registrado para esta marca' });
            }

            if (id) {
                // Modo Edición
                await db.query(
                    'UPDATE modelos SET modelo = ?, marca_id = ?, estatus = ? WHERE id = ?',
                    [modelo, marca_id, estatus, id]
                );
                return res.json({ message: 'Modelo actualizado correctamente' });
            } else {
                // Modo Creación
                const [result] = await db.query(
                    'INSERT INTO modelos (modelo, marca_id, estatus) VALUES (?, ?, 1)',
                    [modelo, marca_id]
                );
                return res.status(201).json({
                    message: 'Modelo creado con éxito',
                    id: result.insertId
                });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    deleteModelo: async (req, res) => {
        const { id } = req.params;
        try {
            await db.query('UPDATE modelos SET estatus = 0 WHERE id = ?', [id]);
            res.json({ message: 'Modelo desactivado' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // ==========================================
    // SECCIÓN: MATERIALES USADOS (tipo_general_materiales)
    // ==========================================

    getMaterialesUsados: async (req, res) => {
        try {
            const [rows] = await db.query(
                'SELECT * FROM tipo_general_materiales ORDER BY tipo ASC, orden ASC, nombre ASC'
            );
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getTiposMaterialesUsados: async (req, res) => {
        try {
            const [rows] = await db.query(
                'SELECT DISTINCT tipo FROM tipo_general_materiales WHERE tipo IS NOT NULL AND tipo != "" ORDER BY tipo ASC'
            );
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getMaterialesPorTipo: async (req, res) => {
        const { tipo } = req.params;
        try {
            const [rows] = await db.query(
                `SELECT id AS value, id, nombre AS label, nombre, tipo, orden 
                 FROM tipo_general_materiales 
                 WHERE tipo = ? AND estatus = 1 
                 ORDER BY orden ASC, nombre ASC`,
                [tipo]
            );
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    saveMaterialUsado: async (req, res) => {
        const { id, nombre, tipo, orden, estatus, audit_usu_id, audit_dep_id } = req.body;

        if (!nombre || !nombre.trim()) {
            return res.status(400).json({ error: 'El nombre del material es obligatorio' });
        }
        if (!tipo || !tipo.trim()) {
            return res.status(400).json({ error: 'El tipo de material es obligatorio' });
        }

        const parsedOrden = parseInt(orden, 10);
        if (isNaN(parsedOrden)) {
            return res.status(400).json({ error: 'El orden debe ser un número entero' });
        }

        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

        try {
            // Validar que el tipo seleccionado exista en la base de datos
            const [tipoExiste] = await db.query(
                'SELECT 1 FROM tipo_general_materiales WHERE tipo = ? LIMIT 1',
                [tipo.trim()]
            );
            if (tipoExiste.length === 0) {
                return res.status(400).json({ error: 'El tipo seleccionado no es válido o no está registrado' });
            }

            // Validar si ya existe un material con el mismo nombre y tipo activo (excluyendo el actual)
            const [existe] = await db.query(
                'SELECT id FROM tipo_general_materiales WHERE LOWER(nombre) = LOWER(?) AND tipo = ? AND id != ? AND estatus = 1',
                [nombre.trim(), tipo.trim(), id || 0]
            );

            if (existe.length > 0) {
                return res.status(400).json({ error: 'Ya existe un material activo con este nombre en la categoría seleccionada' });
            }

            const estatusVal = estatus !== undefined && estatus !== null ? (Number(estatus) === 1 ? 1 : 0) : 1;

            if (id) {
                // Modo Edición
                await db.query(
                    `UPDATE tipo_general_materiales 
                     SET nombre = ?, tipo = ?, orden = ?, estatus = ?, fecha_actualizacion = NOW(),
                         audit_usu_id = COALESCE(?, audit_usu_id),
                         audit_ip = COALESCE(?, audit_ip),
                         audit_dep_id = COALESCE(?, audit_dep_id)
                     WHERE id = ?`,
                    [nombre.trim(), tipo.trim(), parsedOrden, estatusVal, audit_usu_id || null, clientIp, audit_dep_id || null, id]
                );
                return res.json({ message: 'Material actualizado correctamente' });
            } else {
                // Modo Creación
                const [result] = await db.query(
                    `INSERT INTO tipo_general_materiales 
                     (nombre, tipo, orden, estatus, fecha_creacion, fecha_actualizacion, audit_usu_id, audit_ip, audit_dep_id) 
                     VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?, ?)`,
                    [nombre.trim(), tipo.trim(), parsedOrden, estatusVal, audit_usu_id || null, clientIp, audit_dep_id || null]
                );
                return res.status(201).json({
                    message: 'Material creado con éxito',
                    id: result.insertId
                });
            }
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    deleteMaterialUsado: async (req, res) => {
        const { id } = req.params;
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
        try {
            await db.query(
                'UPDATE tipo_general_materiales SET estatus = 0, fecha_actualizacion = NOW(), audit_ip = COALESCE(?, audit_ip) WHERE id = ?',
                [clientIp, id]
            );
            res.json({ message: 'Material desactivado con éxito' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    activarMaterialUsado: async (req, res) => {
        const { id } = req.params;
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
        try {
            await db.query(
                'UPDATE tipo_general_materiales SET estatus = 1, fecha_actualizacion = NOW(), audit_ip = COALESCE(?, audit_ip) WHERE id = ?',
                [clientIp, id]
            );
            res.json({ message: 'Material activado con éxito' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};





module.exports = CrudListaTipoController;