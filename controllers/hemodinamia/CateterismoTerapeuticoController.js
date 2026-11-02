const db = require('../../config/db');

// --- HELPERS DE SERIALIZACIÓN Y NORMALIZACIÓN DE INSUMOS JSON ---
const parseRawJsonInput = (rawInput) => {
    if (rawInput === null || rawInput === undefined || rawInput === '') return [];
    let parsed = rawInput;
    if (typeof rawInput === 'string') {
        const trimmed = rawInput.trim();
        if (!trimmed) return [];
        try {
            parsed = JSON.parse(trimmed);
        } catch (e) {
            return !isNaN(Number(trimmed)) ? [Number(trimmed)] : [];
        }
    }
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === 'object' && parsed !== null) return [parsed];
    if (typeof parsed === 'number' || (typeof parsed === 'string' && !isNaN(Number(parsed)))) {
        return [Number(parsed)];
    }
    return [];
};

const serializeInsumoJson = (rawInput, tipo = 'general') => {
    const arr = parseRawJsonInput(rawInput);
    if (arr.length === 0) return null;

    const normalized = arr.map(item => {
        const isObj = item !== null && typeof item === 'object';
        const rawId = isObj ? (item.id ?? item.value ?? null) : item;
        const id = (rawId !== null && rawId !== undefined && rawId !== '' && !isNaN(Number(rawId)))
            ? Number(rawId)
            : rawId;
        const label = isObj ? String(item.label ?? item.nombre ?? '').trim() : '';
        const rawCant = isObj ? item.cantidad : 1;
        const cantidad = (rawCant !== undefined && rawCant !== null && rawCant !== '' && !isNaN(Number(rawCant)) && Number(rawCant) > 0)
            ? Number(rawCant)
            : 1;

        if (id === null && !label) return null;

        if (tipo === 'cateteres') {
            return {
                id,
                label,
                cantidad,
                medida1: isObj ? String(item.medida1 ?? '').trim() : '',
                medida2: isObj ? String(item.medida2 ?? '').trim() : '',
                unidad: 'FR'
            };
        }

        if (tipo === 'balones') {
            return {
                id,
                label,
                cantidad,
                medida1: isObj ? String(item.medida1 ?? '').trim() : '',
                medida2: isObj ? String(item.medida2 ?? '').trim() : ''
            };
        }

        return {
            id,
            label,
            cantidad
        };
    }).filter(Boolean);

    return normalized.length > 0 ? JSON.stringify(normalized) : null;
};

const normalizeInsumoJson = (rawDbVal, tipo = 'general', catalogMap = {}) => {
    const arr = parseRawJsonInput(rawDbVal);
    if (arr.length === 0) return [];

    return arr.map(item => {
        const isObj = item !== null && typeof item === 'object';
        const rawId = isObj ? (item.id ?? item.value ?? null) : item;
        const id = (rawId !== null && rawId !== undefined && rawId !== '' && !isNaN(Number(rawId)))
            ? Number(rawId)
            : rawId;
        const label = String((isObj ? (item.label ?? item.nombre) : '') || catalogMap[id] || '').trim();
        const rawCant = isObj ? item.cantidad : 1;
        const cantidad = (rawCant !== undefined && rawCant !== null && rawCant !== '' && !isNaN(Number(rawCant)) && Number(rawCant) > 0)
            ? Number(rawCant)
            : 1;
        const medida1 = isObj ? String(item.medida1 ?? '').trim() : '';
        const medida2 = isObj ? String(item.medida2 ?? '').trim() : '';

        if (id === null && !label) return null;

        const baseObj = { id, label, cantidad, medida1, medida2 };
        if (tipo === 'cateteres') {
            baseObj.unidad = (isObj && item.unidad) ? String(item.unidad) : 'FR';
        }
        return baseObj;
    }).filter(Boolean);
};

const collectMissingMaterialIds = (fieldsValues) => {
    const ids = new Set();
    fieldsValues.forEach(rawVal => {
        const arr = parseRawJsonInput(rawVal);
        arr.forEach(item => {
            const isObj = item !== null && typeof item === 'object';
            const hasLabel = isObj && String(item.label ?? item.nombre ?? '').trim() !== '';
            const rawId = isObj ? (item.id ?? item.value) : item;
            if (!hasLabel && rawId !== null && rawId !== undefined && rawId !== '' && !isNaN(Number(rawId))) {
                ids.add(Number(rawId));
            }
        });
    });
    return [...ids];
};

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
        syntax,
        cat
    } = req.body;

    const solicitud_paciente_id = req.body.solicitud_paciente_id || req.params.solicitudId;

    if (!solicitud_paciente_id) {
        return res.status(400).json({ message: "El solicitud_paciente_id es obligatorio" });
    }

    try {
        const [exist] = await db.query(
            'SELECT id FROM cateterismo_terapeutico_hemodinamia WHERE solicitud_paciente_id = ?',
            [solicitud_paciente_id]
        );

        // Serialización JSON de insumos y materiales múltiples
        const cateteresJson = serializeInsumoJson(cateteres_id, 'cateteres');
        const guiasJson = serializeInsumoJson(guias_id, 'general');
        const contrastesJson = serializeInsumoJson(contrastes_id, 'general');
        const accsesoVascularJson = serializeInsumoJson(accseso_vascular_id, 'general');
        const balonesJson = serializeInsumoJson(balones_id, 'balones');
        const stentJson = serializeInsumoJson(stent_id, 'general');
        const medicamentosJson = serializeInsumoJson(medicamentos_utilizados_id, 'general');
        const materialQuirurgicoJson = serializeInsumoJson(material_medico_quirurgico_id, 'general');

        const parsedCantidad = (cantidad !== null && cantidad !== undefined && cantidad !== '') 
            ? parseInt(cantidad, 10) : null;
        const parsedSyntax = (syntax !== null && syntax !== undefined && syntax !== '') 
            ? parseInt(syntax, 10) : null;
        const parsedCat = (cat !== null && cat !== undefined && String(cat).trim() !== '')
            ? String(cat).trim().slice(0, 50) : null;

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
                    cat = ?,
                    fecha_actualizacion = CURRENT_TIMESTAMP 
                WHERE id = ?`,
                [
                    observaciones || null,
                    cateteresJson,
                    guiasJson,
                    otros_guias || null,
                    contrastesJson,
                    otros_contrastes || null,
                    accsesoVascularJson,
                    otros_vascular_acccessos || null,
                    parsedCantidad,
                    balonesJson,
                    stentJson,
                    medicamentosJson,
                    otros_medicamentos_utilizados || null,
                    materialQuirurgicoJson,
                    parsedSyntax,
                    parsedCat,
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
                (solicitud_paciente_id, observaciones, cateteres_id, guias_id, otros_guias, contrastes_id, otros_contrastes, accseso_vascular_id, otros_vascular_acccessos, cantidad, balones_id, stent_id, medicamentos_utilizados_id, otros_medicamentos_utilizados, material_medico_quirurgico_id, syntax, cat) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [
                    solicitud_paciente_id, 
                    observaciones || null,
                    cateteresJson,
                    guiasJson,
                    otros_guias || null,
                    contrastesJson,
                    otros_contrastes || null,
                    accsesoVascularJson,
                    otros_vascular_acccessos || null,
                    parsedCantidad,
                    balonesJson,
                    stentJson,
                    medicamentosJson,
                    otros_medicamentos_utilizados || null,
                    materialQuirurgicoJson,
                    parsedSyntax,
                    parsedCat
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
            return res.json({
                cateteres_id: [],
                guias_id: [],
                contrastes_id: [],
                accseso_vascular_id: [],
                balones_id: [],
                stent_id: [],
                medicamentos_utilizados_id: [],
                material_medico_quirurgico_id: [],
                arterias_terapeuticas: []
            }); 
        }

        const datosTerapeutico = maestro[0];
        const terapeuticoId = datosTerapeutico.id;

        // Resolver labels faltantes desde tipo_general_materiales para retrocompatibilidad
        const missingIds = collectMissingMaterialIds([
            datosTerapeutico.cateteres_id,
            datosTerapeutico.guias_id,
            datosTerapeutico.contrastes_id,
            datosTerapeutico.accseso_vascular_id,
            datosTerapeutico.balones_id,
            datosTerapeutico.stent_id,
            datosTerapeutico.medicamentos_utilizados_id,
            datosTerapeutico.material_medico_quirurgico_id
        ]);

        const catalogMap = {};
        if (missingIds.length > 0) {
            const [matRows] = await db.query(
                'SELECT id, nombre FROM tipo_general_materiales WHERE id IN (?)',
                [missingIds]
            );
            matRows.forEach(m => { catalogMap[m.id] = m.nombre; });
        }

        datosTerapeutico.cateteres_id = normalizeInsumoJson(datosTerapeutico.cateteres_id, 'cateteres', catalogMap);
        datosTerapeutico.guias_id = normalizeInsumoJson(datosTerapeutico.guias_id, 'general', catalogMap);
        datosTerapeutico.contrastes_id = normalizeInsumoJson(datosTerapeutico.contrastes_id, 'general', catalogMap);
        datosTerapeutico.accseso_vascular_id = normalizeInsumoJson(datosTerapeutico.accseso_vascular_id, 'general', catalogMap);
        datosTerapeutico.balones_id = normalizeInsumoJson(datosTerapeutico.balones_id, 'balones', catalogMap);
        datosTerapeutico.stent_id = normalizeInsumoJson(datosTerapeutico.stent_id, 'general', catalogMap);
        datosTerapeutico.medicamentos_utilizados_id = normalizeInsumoJson(datosTerapeutico.medicamentos_utilizados_id, 'general', catalogMap);
        datosTerapeutico.material_medico_quirurgico_id = normalizeInsumoJson(datosTerapeutico.material_medico_quirurgico_id, 'general', catalogMap);

        const [arterias] = await db.query(
            'SELECT * FROM cateterismo_terapeutico_detalle_arterias WHERE terapeutico_id = ?', 
            [terapeuticoId]
        );

        const arteriasFormateadas = arterias.map(art => {
            let parsedTipos = [];
            if (art.tipo_json_hemodinamia) {
                try {
                    parsedTipos = typeof art.tipo_json_hemodinamia === 'string'
                        ? JSON.parse(art.tipo_json_hemodinamia)
                        : art.tipo_json_hemodinamia;
                } catch (e) {
                    parsedTipos = [];
                }
            }
            return {
                ...art,
                tipo_json_hemodinamia: parsedTipos
            };
        });

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
                datosGenerales.intervencion_realizada_id = typeof datosGenerales.intervencion_realizada_id === 'string'
                    ? JSON.parse(datosGenerales.intervencion_realizada_id)
                    : datosGenerales.intervencion_realizada_id;
            } catch (e) {
                datosGenerales.intervencion_realizada_id = [];
            }
        } else {
            datosGenerales.intervencion_realizada_id = [];
        }

        if (datosGenerales.complicaciones_procedimiento_terapeutico) {
            try {
                datosGenerales.complicaciones_procedimiento_terapeutico = typeof datosGenerales.complicaciones_procedimiento_terapeutico === 'string'
                    ? JSON.parse(datosGenerales.complicaciones_procedimiento_terapeutico)
                    : datosGenerales.complicaciones_procedimiento_terapeutico;
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
