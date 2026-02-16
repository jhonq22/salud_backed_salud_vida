const db = require('../../config/db');

/**
 * Guarda o Actualiza la información terapéutica (Upsert)
 */
const saveTerapeutico = async (req, res) => {
    const {
        solicitud_paciente_id,
        conclusiones_cateterismo_id,
        intervencion_realizada_id,
        intervencion_realizada_otros
    } = req.body;

    if (!solicitud_paciente_id) {
        return res.status(400).json({ message: "ID de solicitud requerido" });
    }

    try {
        const [exist] = await db.query(
            'SELECT id FROM cateterismo_terapeutico_hemodinamia WHERE solicitud_paciente_id = ?',
            [solicitud_paciente_id]
        );

        if (exist.length > 0) {
            // UPDATE
            await db.query(
                `UPDATE cateterismo_terapeutico_hemodinamia SET 
                    conclusiones_cateterismo_id = ?, 
                    intervencion_realizada_id = ?, 
                    intervencion_realizada_otros = ?, 
                    fecha_actualizacion = CURRENT_TIMESTAMP 
                WHERE solicitud_paciente_id = ?`,
                [conclusiones_cateterismo_id, intervencion_realizada_id, intervencion_realizada_otros, solicitud_paciente_id]
            );
            return res.json({ message: 'Terapéutico actualizado con éxito' });
        } else {
            // INSERT
            await db.query(
                `INSERT INTO cateterismo_terapeutico_hemodinamia 
                (solicitud_paciente_id, conclusiones_cateterismo_id, intervencion_realizada_id, intervencion_realizada_otros) 
                VALUES (?, ?, ?, ?)`,
                [solicitud_paciente_id, conclusiones_cateterismo_id, intervencion_realizada_id, intervencion_realizada_otros]
            );
            return res.status(201).json({ message: 'Terapéutico creado con éxito' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Obtiene los datos terapéuticos de un paciente específico
 */
const getTerapeuticoBySolicitud = async (req, res) => {
    const { solicitudId } = req.params;

    if (!solicitudId) {
        return res.status(400).json({ message: "ID de solicitud es necesario" });
    }

    try {
        const [rows] = await db.query(
            `SELECT 
                solicitud_paciente_id, 
                conclusiones_cateterismo_id, 
                intervencion_realizada_id, 
                intervencion_realizada_otros 
             FROM cateterismo_terapeutico_hemodinamia 
             WHERE solicitud_paciente_id = ? AND estatus = true`,
            [solicitudId]
        );

        // Retornamos el primer resultado o null si no existe
        res.json(rows[0] || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    saveTerapeutico,
    getTerapeuticoBySolicitud
};