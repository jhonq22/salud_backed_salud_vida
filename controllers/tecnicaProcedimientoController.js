const db = require('../config/db');

// Guardar técnica de procedimiento (Crea si no existe, actualiza si existe)
const createTecnica = async (req, res) => {
    const {
        solicitud_paciente_id,
        general_id,
        via_acceso_id,
        otros_via_acesso,
        bolsillo_mcp_id,
        colocacion_electrodos_id,
        lugar_estimulacion_id,
        otros_lugar_estimulacion,
        tamano_septum
    } = req.body;

    if (!solicitud_paciente_id) {
        return res.status(400).json({ message: "El solicitud_paciente_id es obligatorio" });
    }

    try {
        // 1. Verificar si ya existe el registro
        const [exist] = await db.query(
            'SELECT id FROM tecnica_procedimiento_implantado WHERE solicitud_paciente_id = ?',
            [solicitud_paciente_id]
        );

        if (exist.length > 0) {
            // 2. Si existe, hacemos UPDATE
            await db.query(
                `UPDATE tecnica_procedimiento_implantado SET 
                    general_id = ?, 
                    via_acceso_id = ?, 
                    otros_via_acesso = ?, 
                    bolsillo_mcp_id = ?, 
                    colocacion_electrodos_id = ?, 
                    lugar_estimulacion_id = ?, 
                    otros_lugar_estimulacion = ?, 
                    tamano_septum = ?
                WHERE solicitud_paciente_id = ?`,
                [
                    general_id, via_acceso_id, otros_via_acesso,
                    bolsillo_mcp_id, colocacion_electrodos_id, lugar_estimulacion_id,
                    otros_lugar_estimulacion, tamano_septum, solicitud_paciente_id
                ]
            );

            return res.status(200).json({
                message: 'Técnica de procedimiento actualizada con éxito'
            });
        } else {
            // 3. Si no existe, hacemos INSERT
            const [result] = await db.query(
                `INSERT INTO tecnica_procedimiento_implantado 
                (solicitud_paciente_id, general_id, via_acceso_id, otros_via_acesso, 
                bolsillo_mcp_id, colocacion_electrodos_id, lugar_estimulacion_id, 
                otros_lugar_estimulacion, tamano_septum) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    solicitud_paciente_id, general_id, via_acceso_id, otros_via_acesso,
                    bolsillo_mcp_id, colocacion_electrodos_id, lugar_estimulacion_id,
                    otros_lugar_estimulacion, tamano_septum
                ]
            );

            return res.status(201).json({
                message: 'Técnica de procedimiento guardada con éxito',
                id: result.insertId
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Obtener técnica por solicitud_paciente_id
const getTecnicaBySolicitud = async (req, res) => {
    const { solicitudId } = req.params;
    try {
        const [rows] = await db.query(
            'SELECT * FROM tecnica_procedimiento_implantado WHERE solicitud_paciente_id = ? AND estatus = 1',
            [solicitudId]
        );

        // Si no hay filas, retornamos null o un objeto vacío según prefieras, 
        // pero 200 OK para que el front no lo trate como error fatal
        if (rows.length === 0) {
            return res.status(200).json(null);
        }

        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createTecnica,
    getTecnicaBySolicitud
};