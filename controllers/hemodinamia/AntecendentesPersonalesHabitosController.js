const db = require('../../config/db');


/**
 * ANTECEDENTES PERSONALES HEMODINAMIA
 */
const saveAntecedentes = async (req, res) => {
    const {
        solicitud_paciente_id, hta, diabetes, dislipidemia, erc, tabaquismo,
        alergia_yodo, alergia_medicamentos, patologia_base, otra_patologia_base
    } = req.body;

    if (!solicitud_paciente_id) return res.status(400).json({ message: "El solicitud_paciente_id es obligatorio" });

    try {
        const [exist] = await db.query('SELECT id FROM antecedentes_personales_hemodinamia WHERE solicitud_paciente_id = ?', [solicitud_paciente_id]);

        if (exist.length > 0) {
            await db.query(
                `UPDATE antecedentes_personales_hemodinamia SET 
                hta = ?, diabetes = ?, dislipidemia = ?, erc = ?, tabaquismo = ?, alergia_yodo = ?, 
                alergia_medicamentos = ?, patologia_base = ?, otra_patologia_base = ?, fecha_actualizacion = CURRENT_TIMESTAMP
                WHERE solicitud_paciente_id = ?`,
                [hta, diabetes, dislipidemia, erc, tabaquismo, alergia_yodo, alergia_medicamentos, patologia_base, otra_patologia_base, solicitud_paciente_id]
            );
            return res.status(200).json({ message: 'Antecedentes actualizados con éxito' });
        } else {
            await db.query(
                `INSERT INTO antecedentes_personales_hemodinamia 
                (solicitud_paciente_id, hta, diabetes, dislipidemia, erc, tabaquismo, alergia_yodo, alergia_medicamentos, patologia_base, otra_patologia_base) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [solicitud_paciente_id, hta, diabetes, dislipidemia, erc, tabaquismo, alergia_yodo, alergia_medicamentos, patologia_base, otra_patologia_base]
            );
            return res.status(201).json({ message: 'Antecedentes guardados con éxito' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * EXAMEN FISICO HEMODINAMIA
 */

const saveExamenFisico = async (req, res) => {
    const {
        solicitud_paciente_id, ta, fr, fc, peso, talla,
        soplos, crepitantes, pulso_femoral_derecho,
        pulso_femoral_izquierdo, pulso_radial_derecho, pulso_radial_izquierdo
    } = req.body;

    if (!solicitud_paciente_id) return res.status(400).json({ message: "El solicitud_paciente_id es obligatorio" });

    try {
        const [exist] = await db.query('SELECT id FROM examen_fisico_hemodinamia WHERE solicitud_paciente_id = ?', [solicitud_paciente_id]);

        if (exist.length > 0) {
            // UPDATE con nuevos campos
            await db.query(
                `UPDATE examen_fisico_hemodinamia SET 
                    ta = ?, fr = ?, fc = ?, peso = ?, talla = ?, 
                    soplos = ?, crepitantes = ?, pulso_femoral_derecho = ?, 
                    pulso_femoral_izquierdo = ?, pulso_radial_derecho = ?, pulso_radial_izquierdo = ?,
                    fecha_actualizacion = CURRENT_TIMESTAMP 
                WHERE solicitud_paciente_id = ?`,
                [
                    ta, fr, fc, peso, talla,
                    soplos, crepitantes, pulso_femoral_derecho,
                    pulso_femoral_izquierdo, pulso_radial_derecho, pulso_radial_izquierdo,
                    solicitud_paciente_id
                ]
            );
            return res.status(200).json({ message: 'Examen físico actualizado' });
        } else {
            // INSERT con nuevos campos
            await db.query(
                `INSERT INTO examen_fisico_hemodinamia 
                (solicitud_paciente_id, ta, fr, fc, peso, talla, soplos, crepitantes, pulso_femoral_derecho, pulso_femoral_izquierdo, pulso_radial_derecho, pulso_radial_izquierdo) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    solicitud_paciente_id, ta, fr, fc, peso, talla,
                    soplos, crepitantes, pulso_femoral_derecho,
                    pulso_femoral_izquierdo, pulso_radial_derecho, pulso_radial_izquierdo
                ]
            );
            return res.status(201).json({ message: 'Examen físico guardado' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


/**
 * LABORATORIOS HEMODINAMIA 
 */
const saveLaboratorios = async (req, res) => {
    const {
        solicitud_paciente_id, hgb, hcto, pqt, glicemia, urea,
        creat, pt, ptt, hiv, vdrl, estudio_induccion_isquemia_id
    } = req.body;

    if (!solicitud_paciente_id) return res.status(400).json({ message: "El solicitud_paciente_id es obligatorio" });

    try {
        const [exist] = await db.query('SELECT id FROM laboratorios_hemodinamia WHERE solicitud_paciente_id = ?', [solicitud_paciente_id]);

        if (exist.length > 0) {
            await db.query(
                `UPDATE laboratorios_hemodinamia SET 
                    hgb=?, hcto=?, pqt=?, glicemia=?, urea=?, creat=?, 
                    pt=?, ptt=?, hiv=?, vdrl=?, estudio_induccion_isquemia_id=?, 
                    fecha_actualizacion = CURRENT_TIMESTAMP 
                WHERE solicitud_paciente_id = ?`,
                [hgb, hcto, pqt, glicemia, urea, creat, pt, ptt, hiv, vdrl, estudio_induccion_isquemia_id, solicitud_paciente_id]
            );
            return res.status(200).json({ message: 'Laboratorios actualizados con éxito' });
        } else {
            await db.query(
                `INSERT INTO laboratorios_hemodinamia 
                (solicitud_paciente_id, hgb, hcto, pqt, glicemia, urea, creat, pt, ptt, hiv, vdrl, estudio_induccion_isquemia_id) 
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
                [solicitud_paciente_id, hgb, hcto, pqt, glicemia, urea, creat, pt, ptt, hiv, vdrl, estudio_induccion_isquemia_id]
            );
            return res.status(201).json({ message: 'Laboratorios guardados con éxito' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * LISTA ESTUDIO INDUCCION ISQUEMIA (GET APARTE)
 */
const getListaInduccion = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, descripcion FROM lista_estudio_induccion_isquemia WHERE estatus = 1 ORDER BY descripcion ASC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET TODOS LOS DATOS POR SOLICITUD
 */
const getHemodinamiaBySolicitud = async (req, res) => {
    const { solicitudId } = req.params;
    try {
        const [ant] = await db.query('SELECT * FROM antecedentes_personales_hemodinamia WHERE solicitud_paciente_id = ?', [solicitudId]);
        const [fis] = await db.query('SELECT * FROM examen_fisico_hemodinamia WHERE solicitud_paciente_id = ?', [solicitudId]);
        const [lab] = await db.query('SELECT * FROM laboratorios_hemodinamia WHERE solicitud_paciente_id = ?', [solicitudId]);

        res.json({
            antecedentes: ant[0] || null,
            examen_fisico: fis[0] || null,
            laboratorios: lab[0] || null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    saveAntecedentes,
    saveExamenFisico,
    saveLaboratorios,
    getHemodinamiaBySolicitud
}