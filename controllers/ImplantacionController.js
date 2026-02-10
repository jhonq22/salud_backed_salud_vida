const db = require('../config/db');

const ImplantacionController = {
    // --- 1. GENERADOR (Actualizado: modelo_id -> modelo) ---
    async saveGenerador(req, res) {
        try {
            const { solicitud_paciente_id, marca_id, modelo, serial } = req.body;
            const [exist] = await db.query('SELECT id FROM Generador_implantado WHERE solicitud_paciente_id = ? AND estatus = 1', [solicitud_paciente_id]);
            if (exist.length > 0) return res.status(400).json({ message: "Ya existe un generador registrado" });

            await db.query('INSERT INTO Generador_implantado (solicitud_paciente_id, marca_id, modelo, serial) VALUES (?, ?, ?, ?)',
                [solicitud_paciente_id, marca_id, modelo, serial]);
            res.status(201).json({ message: "Generador guardado" });
        } catch (e) { res.status(500).json({ error: e.message }); }
    },

    // --- 2. ELECTRODO VENTRICULAR (Actualizado: modelo_id -> modelo) ---
    async saveElectrodoVentricular(req, res) {
        try {
            const { solicitud_paciente_id, marca_id, modelo, serial } = req.body;
            const [exist] = await db.query('SELECT id FROM electrodo_verticular_implantado WHERE solicitud_paciente_id = ? AND estatus = 1', [solicitud_paciente_id]);
            if (exist.length > 0) return res.status(400).json({ message: "Ya existe un electrodo ventricular registrado" });

            await db.query('INSERT INTO electrodo_verticular_implantado (solicitud_paciente_id, marca_id, modelo, serial) VALUES (?, ?, ?, ?)',
                [solicitud_paciente_id, marca_id, modelo, serial]);
            res.status(201).json({ message: "Electrodo ventricular guardado" });
        } catch (e) { res.status(500).json({ error: e.message }); }
    },

    // --- 3. NUEVO: ELECTRODO AURICULAR (Incluye modelo, serial y medida) ---
    async saveElectrodoAuricular(req, res) {
        try {
            const { solicitud_paciente_id, marca_id, modelo, serial, medida, modo_estimulacion } = req.body;
            const [exist] = await db.query('SELECT id FROM electrodo_auricular_implantado WHERE solicitud_paciente_id = ? AND estatus = 1', [solicitud_paciente_id]);
            if (exist.length > 0) return res.status(400).json({ message: "Ya existe un electrodo auricular registrado" });

            await db.query('INSERT INTO electrodo_auricular_implantado (solicitud_paciente_id, marca_id, modelo, serial, medida, modo_estimulacion) VALUES (?, ?, ?, ?, ?, ?)',
                [solicitud_paciente_id, marca_id, modelo, serial, medida, modo_estimulacion]);
            res.status(201).json({ message: "Electrodo auricular guardado" });
        } catch (e) { res.status(500).json({ error: e.message }); }
    },

    // --- 4. PARÁMETROS MEDIDOS VENTRICULAR ---
    async saveParametrosMedidosVent(req, res) {
        try {
            const { solicitud_paciente_id, umbral_captura, impedancia, duracion, modo_estimulacion } = req.body;
            await db.query('INSERT INTO parametro_medidos_ventricular_implantado (solicitud_paciente_id, umbral_captura, impedancia, duracion, modo_estimulacion) VALUES (?, ?, ?, ?, ?)',
                [solicitud_paciente_id, umbral_captura, impedancia, duracion, modo_estimulacion]);
            res.status(201).json({ message: "Mediciones ventriculares guardadas" });
        } catch (e) { res.status(500).json({ error: e.message }); }
    },

    // --- 5. PARÁMETROS PROGRAMACIÓN VENTRICULAR ---
    async saveParametrosProgVent(req, res) {
        try {
            const { solicitud_paciente_id, amplitud_r, fc_minima } = req.body;
            await db.query('INSERT INTO parametro_programacion_ventricular_implantado (solicitud_paciente_id, amplitud_r, fc_minima) VALUES (?, ?, ?)',
                [solicitud_paciente_id, amplitud_r, fc_minima]);
            res.status(201).json({ message: "Programación ventricular guardada" });
        } catch (e) { res.status(500).json({ error: e.message }); }
    },

    // --- 6. PARÁMETROS MEDIDOS AURICULAR ---
    async saveParametrosMedidosAur(req, res) {
        try {
            const { solicitud_paciente_id, umbral_captura, impedancia, duracion, modo_estimulacion } = req.body;
            await db.query('INSERT INTO parametro_medidos_auricular_implantado (solicitud_paciente_id, umbral_captura, impedancia, duracion, modo_estimulacion) VALUES (?, ?, ?, ?, ?)',
                [solicitud_paciente_id, umbral_captura, impedancia, duracion, modo_estimulacion]);
            res.status(201).json({ message: "Mediciones auriculares guardadas" });
        } catch (e) { res.status(500).json({ error: e.message }); }
    },

    // --- 7. PARÁMETROS PROGRAMACIÓN AURICULAR ---
    async saveParametrosProgAur(req, res) {
        try {
            const { solicitud_paciente_id, amplitud_a, fc_minima } = req.body;
            await db.query('INSERT INTO parametro_programacion_auricular_implantado (solicitud_paciente_id, amplitud_a, fc_minima) VALUES (?, ?, ?)',
                [solicitud_paciente_id, amplitud_a, fc_minima]);
            res.status(201).json({ message: "Programación auricular guardada" });
        } catch (e) { res.status(500).json({ error: e.message }); }
    },

    // --- GET COMPLETO ACTUALIZADO ---
    async getTodoPorSolicitud(req, res) {
        const { id } = req.params;
        try {
            const [gen] = await db.query('SELECT * FROM Generador_implantado WHERE solicitud_paciente_id = ?', [id]);
            const [elecV] = await db.query('SELECT * FROM electrodo_verticular_implantado WHERE solicitud_paciente_id = ?', [id]);
            const [elecA] = await db.query('SELECT * FROM electrodo_auricular_implantado WHERE solicitud_paciente_id = ?', [id]);
            const [medV] = await db.query('SELECT * FROM parametro_medidos_ventricular_implantado WHERE solicitud_paciente_id = ?', [id]);
            const [progV] = await db.query('SELECT * FROM parametro_programacion_ventricular_implantado WHERE solicitud_paciente_id = ?', [id]);
            const [medA] = await db.query('SELECT * FROM parametro_medidos_auricular_implantado WHERE solicitud_paciente_id = ?', [id]);
            const [progA] = await db.query('SELECT * FROM parametro_programacion_auricular_implantado WHERE solicitud_paciente_id = ?', [id]);

            res.json({
                generador: gen[0] || null,
                electrodoVentricular: elecV[0] || null,
                electrodoAuricular: elecA[0] || null,
                medidosVentricular: medV[0] || null,
                progVentricular: progV[0] || null,
                medidosAuricular: medA[0] || null,
                progAuricular: progA[0] || null
            });
        } catch (e) { res.status(500).json({ error: e.message }); }
    }
};

module.exports = ImplantacionController;