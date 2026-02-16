const db = require('../../config/db');

// Guardar o Actualizar Cateterismo Diagnóstico
const saveCateterismo = async (req, res) => {
    const {
        solicitud_paciente_id, dominancia_id,
        acd_proximal_numero, acd_proximal_texto, acd_media_numero, acd_media_texto,
        acd_distal_numero, acd_distal_texto, tp_sin_lesiones_numero, tp_sin_lesiones_texto,
        ada_proximal_numero, ada_proximal_texto, ada_media_numero, ada_media_texto,
        ada_distal_numero, ada_distal_texto, ada_diagonal_uno_numero, ada_diagonal_uno_texto,
        ada_diagonal_dos_numero, ada_diagonal_dos_texto, ada_diagonal_tres_numero, ada_diagonal_tres_texto,
        acx_proximal_numero, acx_proximal_texto, acx_media_numero, acx_media_texto,
        acx_distal_numero, acx_ome_uno_numero, acx_ome_uno_texto, acx_ome_dos_numero,
        acx_ome_dos_texto, acx_ome_tres_numero, acx_ome_tres_texto, acx_ramo_medio_numero,
        acx_ramo_medio_texto
    } = req.body;

    if (!solicitud_paciente_id) {
        return res.status(400).json({ message: "El solicitud_paciente_id es obligatorio" });
    }

    try {
        // 1. Verificar existencia
        const [exist] = await db.query(
            'SELECT id FROM cateterismo_diagnostico_hemodinamia WHERE solicitud_paciente_id = ?',
            [solicitud_paciente_id]
        );

        if (exist.length > 0) {
            // 2. Si existe, UPDATE
            await db.query(
                `UPDATE cateterismo_diagnostico_hemodinamia SET 
                dominancia_id = ?, acd_proximal_numero = ?, acd_proximal_texto = ?, acd_media_numero = ?, acd_media_texto = ?, 
                acd_distal_numero = ?, acd_distal_texto = ?, tp_sin_lesiones_numero = ?, tp_sin_lesiones_texto = ?, 
                ada_proximal_numero = ?, ada_proximal_texto = ?, ada_media_numero = ?, ada_media_texto = ?, 
                ada_distal_numero = ?, ada_distal_texto = ?, ada_diagonal_uno_numero = ?, ada_diagonal_uno_texto = ?, 
                ada_diagonal_dos_numero = ?, ada_diagonal_dos_texto = ?, ada_diagonal_tres_numero = ?, ada_diagonal_tres_texto = ?, 
                acx_proximal_numero = ?, acx_proximal_texto = ?, acx_media_numero = ?, acx_media_texto = ?, 
                acx_distal_numero = ?, acx_ome_uno_numero = ?, acx_ome_uno_texto = ?, acx_ome_dos_numero = ?, 
                acx_ome_dos_texto = ?, acx_ome_tres_numero = ?, acx_ome_tres_texto = ?, acx_ramo_medio_numero = ?, 
                acx_ramo_medio_texto = ?, fecha_actualizacion = CURRENT_TIMESTAMP
                WHERE solicitud_paciente_id = ?`,
                [
                    dominancia_id, acd_proximal_numero, acd_proximal_texto, acd_media_numero, acd_media_texto,
                    acd_distal_numero, acd_distal_texto, tp_sin_lesiones_numero, tp_sin_lesiones_texto,
                    ada_proximal_numero, ada_proximal_texto, ada_media_numero, ada_media_texto,
                    ada_distal_numero, ada_distal_texto, ada_diagonal_uno_numero, ada_diagonal_uno_texto,
                    ada_diagonal_dos_numero, ada_diagonal_dos_texto, ada_diagonal_tres_numero, ada_diagonal_tres_texto,
                    acx_proximal_numero, acx_proximal_texto, acx_media_numero, acx_media_texto,
                    acx_distal_numero, acx_ome_uno_numero, acx_ome_uno_texto, acx_ome_dos_numero,
                    acx_ome_dos_texto, acx_ome_tres_numero, acx_ome_tres_texto, acx_ramo_medio_numero,
                    acx_ramo_medio_texto, solicitud_paciente_id
                ]
            );
            return res.status(200).json({ message: 'Cateterismo actualizado con éxito' });
        } else {
            // 3. Si no existe, INSERT
            await db.query(
                `INSERT INTO cateterismo_diagnostico_hemodinamia 
                (solicitud_paciente_id, dominancia_id, acd_proximal_numero, acd_proximal_texto, acd_media_numero, acd_media_texto, acd_distal_numero, acd_distal_texto, tp_sin_lesiones_numero, tp_sin_lesiones_texto, ada_proximal_numero, ada_proximal_texto, ada_media_numero, ada_media_texto, ada_distal_numero, ada_distal_texto, ada_diagonal_uno_numero, ada_diagonal_uno_texto, ada_diagonal_dos_numero, ada_diagonal_dos_texto, ada_diagonal_tres_numero, ada_diagonal_tres_texto, acx_proximal_numero, acx_proximal_texto, acx_media_numero, acx_media_texto, acx_distal_numero, acx_ome_uno_numero, acx_ome_uno_texto, acx_ome_dos_numero, acx_ome_dos_texto, acx_ome_tres_numero, acx_ome_tres_texto, acx_ramo_medio_numero, acx_ramo_medio_texto) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    solicitud_paciente_id, dominancia_id, acd_proximal_numero, acd_proximal_texto, acd_media_numero, acd_media_texto,
                    acd_distal_numero, acd_distal_texto, tp_sin_lesiones_numero, tp_sin_lesiones_texto,
                    ada_proximal_numero, ada_proximal_texto, ada_media_numero, ada_media_texto,
                    ada_distal_numero, ada_distal_texto, ada_diagonal_uno_numero, ada_diagonal_uno_texto,
                    ada_diagonal_dos_numero, ada_diagonal_dos_texto, ada_diagonal_tres_numero, ada_diagonal_tres_texto,
                    acx_proximal_numero, acx_proximal_texto, acx_media_numero, acx_media_texto,
                    acx_distal_numero, acx_ome_uno_numero, acx_ome_uno_texto, acx_ome_dos_numero,
                    acx_ome_dos_texto, acx_ome_tres_numero, acx_ome_tres_texto, acx_ramo_medio_numero,
                    acx_ramo_medio_texto
                ]
            );
            return res.status(201).json({ message: 'Cateterismo guardado con éxito' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

const getCateterismoBySolicitud = async (req, res) => {
    const { solicitudId } = req.params;
    try {
        const [rows] = await db.query(
            'SELECT * FROM cateterismo_diagnostico_hemodinamia WHERE solicitud_paciente_id = ? AND estatus = 1',
            [solicitudId]
        );
        res.json(rows[0] || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { saveCateterismo, getCateterismoBySolicitud };