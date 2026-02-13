const db = require('../config/db');

const ComplicacionesImplantadasController = {

    // --- COMPLICACIONES INMEDIATAS ---
    saveComplicaciones: async (req, res) => {
        const { solicitud_paciente_id, ...data } = req.body;
        try {
            const [exist] = await db.query('SELECT id FROM complicaciones_inmediatas WHERE solicitud_paciente_id = ?', [solicitud_paciente_id]);

            if (exist.length > 0) {
                await db.query('UPDATE complicaciones_inmediatas SET ? WHERE solicitud_paciente_id = ?', [data, solicitud_paciente_id]);
                res.json({ message: "Complicaciones actualizadas" });
            } else {
                await db.query('INSERT INTO complicaciones_inmediatas SET ?', { ...data, solicitud_paciente_id });
                res.json({ message: "Complicaciones guardadas" });
            }
        } catch (error) {
            res.status(500).json({ message: "Error en complicaciones", error });
        }
    },

    getComplicaciones: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM complicaciones_inmediatas WHERE solicitud_paciente_id = ?', [req.params.id]);
            res.json(rows[0] || null);
        } catch (error) {
            res.status(500).json({ message: "Error al obtener complicaciones", error });
        }
    },

    // --- SIGNOS VITALES EGRESO ---
    saveSignosVitales: async (req, res) => {
        const { solicitud_paciente_id, ...data } = req.body;
        try {
            const [exist] = await db.query('SELECT id FROM registro_egreso_signos_vitales WHERE solicitud_paciente_id = ?', [solicitud_paciente_id]);

            if (exist.length > 0) {
                await db.query('UPDATE registro_egreso_signos_vitales SET ? WHERE solicitud_paciente_id = ?', [data, solicitud_paciente_id]);
                res.json({ message: "Signos vitales actualizados" });
            } else {
                await db.query('INSERT INTO registro_egreso_signos_vitales SET ?', { ...data, solicitud_paciente_id });
                res.json({ message: "Signos vitales guardados" });
            }
        } catch (error) {
            res.status(500).json({ message: "Error en signos vitales", error });
        }
    },

    getSignosVitales: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM registro_egreso_signos_vitales WHERE solicitud_paciente_id = ?', [req.params.id]);
            res.json(rows[0] || null);
        } catch (error) {
            res.status(500).json({ message: "Error al obtener signos", error });
        }
    },

    // --- PLAN Y RECOMENDACIONES ---
    savePlan: async (req, res) => {
        const { solicitud_paciente_id, ...data } = req.body;
        try {
            const [exist] = await db.query('SELECT id FROM registro_plan_recomendaciones WHERE solicitud_paciente_id = ?', [solicitud_paciente_id]);

            if (exist.length > 0) {
                await db.query('UPDATE registro_plan_recomendaciones SET ? WHERE solicitud_paciente_id = ?', [data, solicitud_paciente_id]);
                res.json({ message: "Plan actualizado" });
            } else {
                await db.query('INSERT INTO registro_plan_recomendaciones SET ?', { ...data, solicitud_paciente_id });
                res.json({ message: "Plan guardado" });
            }
        } catch (error) {
            res.status(500).json({ message: "Error en plan", error });
        }
    },

    getPlan: async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM registro_plan_recomendaciones WHERE solicitud_paciente_id = ?', [req.params.id]);
            res.json(rows[0] || null);
        } catch (error) {
            res.status(500).json({ message: "Error al obtener plan", error });
        }
    }
};

module.exports = ComplicacionesImplantadasController;