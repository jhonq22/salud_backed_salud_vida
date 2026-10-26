const db = require('../../config/db');

/**
 * =========================================================================
 * PANTALLA 1: ARTERIAS TERAPÉUTICAS
 * =========================================================================
 */

/**
 * GUARDAR O ACTUALIZAR CATETERISMO TERAPÉUTICO (UPSERT MAESTRO-DETALLE)
 */
const saveTerapeutico = async (req, res) => {
    const { 
        solicitud_paciente_id, 
        arterias_terapeuticas, 
        observaciones,
        cateteres_id,
        guias_id,
        otros_guias,
        contrastes_id,
        otros_contrastes,
        accseso_vascular_id,
        otros_vascular_acccessos,
        cantidad,
        balones_id,
        stent_id,
        medicamentos_utilizados_id,
        otros_medicamentos_utilizados,
        material_medico_quirurgico_id,
        syntax
    } = req.body;

    if (!solicitud_paciente_id) {
        return res.status(400).json({ message: "El solicitud_paciente_id es obligatorio" });
    }

    try {
        const [exist] = await db.query(
            'SELECT id FROM cateterismo_terapeutico_hemodinamia WHERE solicitud_paciente_id = ?',
            [solicitud_paciente_id]
        );

        let medicamentosJson = null;
        if (medicamentos_utilizados_id) {
            medicamentosJson = typeof medicamentos_utilizados_id === 'string' 
                ? medicamentos_utilizados_id 
                : JSON.stringify(medicamentos_utilizados_id);
        }

        let materialQuirurgicoJson = null;
        if (material_medico_quirurgico_id) {
            materialQuirurgicoJson = typeof material_medico_quirurgico_id === 'string' 
                ? material_medico_quirurgico_id 
                : JSON.stringify(material_medico_quirurgico_id);
        }

        const parsedCantidad = (cantidad !== null && cantidad !== undefined && cantidad !== '') 
            ? parseInt(cantidad, 10) : null;
        const parsedSyntax = (syntax !== null && syntax !== undefined && syntax !== '') 
            ? parseInt(syntax, 10) : null;

        let terapeuticoId;

        if (exist.length > 0) {
            terapeuticoId = exist[0].id;
            await db.query(
                `UPDATE cateterismo_terapeutico_hemodinamia SET 
                    observaciones = ?,
                    cateteres_id = ?,
                    guias_id = ?,
                    otros_guias = ?,
                    contrastes_id = ?,
                    otros_contrastes = ?,
                    accseso_vascular_id = ?,
                    otros_vascular_acccessos = ?,
                    cantidad = ?,
                    balones_id = ?,
                    stent_id = ?,
                    medicamentos_utilizados_id = ?,
                    otros_medicamentos_utilizados = ?,
                    material_medico_quirurgico_id = ?,
                    syntax = ?,
                    fecha_actualizacion = CURRENT_TIMESTAMP 
                WHERE id = ?`,
                [
                    observaciones || null,
                    cateteres_id || null,
                    guias_id || null,
                    otros_guias || null,
                    contrastes_id || null,
                    otros_contrastes || null,
                    accseso_vascular_id || null,
                    otros_vascular_acccessos || null,
                    parsedCantidad,
                    balones_id || null,
                    stent_id || null,
                    medicamentosJson,
                    otros_medicamentos_utilizados || null,
                    materialQuirurgicoJson,
                    parsedSyntax,
                    terapeuticoId
                ]
            );

            await db.query(
                'DELETE FROM cateterismo_terapeutico_detalle_arterias WHERE terapeutico_id = ?', 
                [terapeuticoId]
            );
        } else {
            const [result] = await db.query(
                `INSERT INTO cateterismo_terapeutico_hemodinamia 
                (solicitud_paciente_id, observaciones, cateteres_id, guias_id, otros_guias, contrastes_id, otros_contrastes, accseso_vascular_id, otros_vascular_acccessos, cantidad, balones_id, stent_id, medicamentos_utilizados_id, otros_medicamentos_utilizados, material_medico_quirurgico_id, syntax) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [
                    solicitud_paciente_id, 
                    observaciones || null,
                    cateteres_id || null,
                    guias_id || null,
                    otros_guias || null,
                    contrastes_id || null,
                    otros_contrastes || null,
                    accseso_vascular_id || null,
                    otros_vascular_acccessos || null,
                    parsedCantidad,
                    balones_id || null,
                    stent_id || null,
                    medicamentosJson,
                    otros_medicamentos_utilizados || null,
                    materialQuirurgicoJson,
                    parsedSyntax
                ]
            );
            terapeuticoId = result.insertId; 
        }

        if (arterias_terapeuticas && arterias_terapeuticas.length > 0) {
            const arteriasValues = arterias_terapeuticas.map(a => [
                terapeuticoId,
                a.arteria_nombre,
                a.lesion_residual_hemodinamia || null,
                a.flujo_hemodinamia || null,
                a.tipo_json_hemodinamia ? JSON.stringify(a.tipo_json_hemodinamia) : null,
                a.tecnica_hemodinamia || null,
                a.medina_hemodinamia || null
            ]);

            await db.query(
                `INSERT INTO cateterismo_terapeutico_detalle_arterias 
                (terapeutico_id, arteria_nombre, lesion_residual_hemodinamia, flujo_hemodinamia, tipo_json_hemodinamia, tecnica_hemodinamia, medina_hemodinamia) 
                VALUES ?`,
                [arteriasValues]
            );
        }

        return res.status(200).json({ message: 'Cateterismo terapéutico guardado con éxito' });
        
    } catch (error) {
        console.error("Error en saveTerapeutico:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * OBTENER DATOS DEL CATETERISMO TERAPÉUTICO POR SOLICITUD
 */
const getTerapeuticoBySolicitud = async (req, res) => {
    const { solicitudId } = req.params;
    
    try {
        const [maestro] = await db.query(
            'SELECT * FROM cateterismo_terapeutico_hemodinamia WHERE solicitud_paciente_id = ?', 
            [solicitudId]
        );

        if (maestro.length === 0) {
            return res.json({ arterias_terapeuticas: [] }); 
        }

        const datosTerapeutico = maestro[0];
        const terapeuticoId = datosTerapeutico.id;

        const [arterias] = await db.query(
            'SELECT * FROM cateterismo_terapeutico_detalle_arterias WHERE terapeutico_id = ?', 
            [terapeuticoId]
        );

        const arteriasFormateadas = arterias.map(art => ({
            ...art,
            tipo_json_hemodinamia: art.tipo_json_hemodinamia ? JSON.parse(art.tipo_json_hemodinamia) : []
        }));

        res.json({
            ...datosTerapeutico,
            observaciones: datosTerapeutico.observaciones || '',
            arterias_terapeuticas: arteriasFormateadas
        });

    } catch (error) {
        console.error("Error en getTerapeuticoBySolicitud:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * =========================================================================
 * PANTALLA 2: DATOS GENERALES DEL TERAPÉUTICO
 * =========================================================================
 */

const saveTerapeuticoGeneral = async (req, res) => {
    const { 
        solicitud_paciente_id, 
        tecnica_cateterismo_terapeutico_id, 
        intervencion_realizada_id, 
        complicaciones_procedimiento_terapeutico, 
        complicaciones_acceso_terapeutico, 
        sugerencia_terapeuticas_id,
        territorio_angioplastia_id
    } = req.body;

    if (!solicitud_paciente_id) {
        return res.status(400).json({ message: "El solicitud_paciente_id es obligatorio" });
    }

    try {
        const [exist] = await db.query(
            'SELECT id FROM cateterismo_terapeutico_hemodinamia WHERE solicitud_paciente_id = ?',
            [solicitud_paciente_id]
        );

        const intervencionJson = intervencion_realizada_id ? JSON.stringify(intervencion_realizada_id) : null;
        const compProcedimientoJson = complicaciones_procedimiento_terapeutico ? JSON.stringify(complicaciones_procedimiento_terapeutico) : null;

        if (exist.length > 0) {
            await db.query(
                `UPDATE cateterismo_terapeutico_hemodinamia SET 
                    tecnica_cateterismo_terapeutico_id = ?, 
                    intervencion_realizada_id = ?, 
                    complicaciones_procedimiento_terapeutico = ?, 
                    complicaciones_acceso_terapeutico = ?, 
                    sugerencia_terapeuticas_id = ?,
                    territorio_angioplastia_id = ?,
                    fecha_actualizacion = CURRENT_TIMESTAMP
                WHERE solicitud_paciente_id = ?`,
                [
                    tecnica_cateterismo_terapeutico_id || null,
                    intervencionJson,
                    compProcedimientoJson, 
                    complicaciones_acceso_terapeutico || null, 
                    sugerencia_terapeuticas_id || null,
                    territorio_angioplastia_id || null,
                    solicitud_paciente_id
                ]
            );
            return res.status(200).json({ message: 'Datos generales terapéuticos actualizados con éxito' });
        } else {
            await db.query(
                `INSERT INTO cateterismo_terapeutico_hemodinamia 
                (solicitud_paciente_id, tecnica_cateterismo_terapeutico_id, intervencion_realizada_id, complicaciones_procedimiento_terapeutico, complicaciones_acceso_terapeutico, sugerencia_terapeuticas_id, territorio_angioplastia_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`, 
                [
                    solicitud_paciente_id,
                    tecnica_cateterismo_terapeutico_id || null,
                    intervencionJson,
                    compProcedimientoJson, 
                    complicaciones_acceso_terapeutico || null, 
                    sugerencia_terapeuticas_id || null,
                    territorio_angioplastia_id || null 
                ]
            );
            return res.status(201).json({ message: 'Datos generales terapéuticos guardados con éxito' });
        }

    } catch (error) {
        console.error("Error en saveTerapeuticoGeneral:", error);
        res.status(500).json({ error: error.message });
    }
};

const getTerapeuticoGeneralBySolicitud = async (req, res) => {
    const { solicitudId } = req.params;
    
    try {
        const [maestro] = await db.query(
            `SELECT id, solicitud_paciente_id, tecnica_cateterismo_terapeutico_id, 
                    intervencion_realizada_id, complicaciones_procedimiento_terapeutico, 
                    complicaciones_acceso_terapeutico, sugerencia_terapeuticas_id, territorio_angioplastia_id 
             FROM cateterismo_terapeutico_hemodinamia 
             WHERE solicitud_paciente_id = ?`, 
            [solicitudId]
        );

        if (maestro.length === 0) {
            return res.json({}); 
        }

        const datosGenerales = maestro[0];
        
        if (datosGenerales.intervencion_realizada_id) {
            try {
                datosGenerales.intervencion_realizada_id = JSON.parse(datosGenerales.intervencion_realizada_id);
            } catch (e) {
                datosGenerales.intervencion_realizada_id = [];
            }
        } else {
            datosGenerales.intervencion_realizada_id = [];
        }

        if (datosGenerales.complicaciones_procedimiento_terapeutico) {
            try {
                datosGenerales.complicaciones_procedimiento_terapeutico = JSON.parse(datosGenerales.complicaciones_procedimiento_terapeutico);
            } catch (e) {
                datosGenerales.complicaciones_procedimiento_terapeutico = [];
            }
        } else {
            datosGenerales.complicaciones_procedimiento_terapeutico = [];
        }

        res.json(datosGenerales);

    } catch (error) {
        console.error("Error en getTerapeuticoGeneralBySolicitud:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    saveTerapeutico,
    getTerapeuticoBySolicitud,
    saveTerapeuticoGeneral,
    getTerapeuticoGeneralBySolicitud
};