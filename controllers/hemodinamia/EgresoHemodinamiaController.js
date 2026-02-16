const db = require('../../config/db');

/**
 * Guarda o Actualiza el Plan de Egreso (Upsert)
 */
const saveEgreso = async (req, res) => {
    const {
        solicitud_paciente_id,
        dx_final_id,
        plan_diagnostico_egreso_id,
        reposo_medico
    } = req.body;

    if (!solicitud_paciente_id) {
        return res.status(400).json({ message: "El ID de solicitud es obligatorio." });
    }

    try {
        // Verificar si ya existe un registro para esta solicitud
        const [exist] = await db.query(
            'SELECT id FROM egreso_hemodinamia WHERE solicitud_paciente_id = ?',
            [solicitud_paciente_id]
        );

        if (exist.length > 0) {
            // Caso: UPDATE
            await db.query(
                `UPDATE egreso_hemodinamia SET 
                    dx_final_id = ?, 
                    plan_diagnostico_egreso_id = ?, 
                    reposo_medico = ?, 
                    fecha_actualizacion = CURRENT_TIMESTAMP 
                WHERE solicitud_paciente_id = ?`,
                [dx_final_id, plan_diagnostico_egreso_id, reposo_medico, solicitud_paciente_id]
            );
            return res.json({ message: 'Plan de egreso actualizado correctamente.' });
        } else {
            // Caso: INSERT
            await db.query(
                `INSERT INTO egreso_hemodinamia 
                (solicitud_paciente_id, dx_final_id, plan_diagnostico_egreso_id, reposo_medico) 
                VALUES (?, ?, ?, ?)`,
                [solicitud_paciente_id, dx_final_id, plan_diagnostico_egreso_id, reposo_medico]
            );
            return res.status(201).json({ message: 'Plan de egreso creado correctamente.' });
        }
    } catch (error) {
        console.error("Error en saveEgreso:", error);
        res.status(500).json({ error: "Error interno del servidor al guardar." });
    }
};

/**
 * Obtiene el Plan de Egreso por solicitud_paciente_id
 */
const getEgresoBySolicitud = async (req, res) => {
    const { solicitudId } = req.params;

    if (!solicitudId) {
        return res.status(400).json({ message: "ID de solicitud no proporcionado." });
    }

    try {
        const [rows] = await db.query(
            `SELECT 
                solicitud_paciente_id, 
                dx_final_id, 
                plan_diagnostico_egreso_id, 
                reposo_medico 
             FROM egreso_hemodinamia 
             WHERE solicitud_paciente_id = ? AND estatus = true`,
            [solicitudId]
        );

        // Retornamos el primer resultado o un objeto vacío si no existe
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.json(null);
        }
    } catch (error) {
        console.error("Error en getEgresoBySolicitud:", error);
        res.status(500).json({ error: "Error al obtener los datos de egreso." });
    }
};

module.exports = {
    saveEgreso,
    getEgresoBySolicitud
};