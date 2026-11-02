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

// Guardar o Actualizar Cateterismo Diagnóstico (Maestro - Detalle)
const saveCateterismo = async (req, res) => {
    const {
        dominancia_id, 
        descripcion,
        complicaciones_procedimiento, // Se recibe como array para ser JSON
        complicaciones_acceso,        // Se recibe como INT
        conclusiones_id,
        conclusiones_otros,
        sugerencia_diagnostico_id,
        cateteres_id,
        guias_id,
        otros_guias,
        contrastes_id,
        otros_contrastes,
        cantidad,
        ventriculografia_id,
        medicamentos_utilizados_id,
        otros_medicamentos_utilizados,
        material_medico_quirurgico_id,
        syntax,
        cat,
        arterias 
    } = req.body;

    const solicitud_paciente_id = req.body.solicitud_paciente_id || req.params.solicitudId;

    if (!solicitud_paciente_id) {
        return res.status(400).json({ message: "El solicitud_paciente_id es obligatorio" });
    }

    try {
        // 1. Verificar si ya existe la cabecera (Maestro)
        const [exist] = await db.query(
            'SELECT id FROM cateterismo_diagnostico_hemodinamia WHERE solicitud_paciente_id = ?',
            [solicitud_paciente_id]
        );

        let cateterismoId;

        // --- FORMATEO DE CAMPOS ---
        const conclusionesJson = conclusiones_id ? JSON.stringify(conclusiones_id) : null;
        // Se aplica stringify al MultiSelect
        const compProcedimientoJson = complicaciones_procedimiento ? JSON.stringify(complicaciones_procedimiento) : null;

        // Serialización JSON de insumos y materiales múltiples
        const cateteresJson = serializeInsumoJson(cateteres_id, 'cateteres');
        const guiasJson = serializeInsumoJson(guias_id, 'general');
        const contrastesJson = serializeInsumoJson(contrastes_id, 'general');
        const ventriculografiaJson = serializeInsumoJson(ventriculografia_id, 'general');
        const medicamentosJson = serializeInsumoJson(medicamentos_utilizados_id, 'general');
        const materialQuirurgicoJson = serializeInsumoJson(material_medico_quirurgico_id, 'general');

        const parseNumOrNull = (val) => {
            if (val === undefined || val === null || val === '') return null;
            const parsed = Number(val);
            return isNaN(parsed) ? null : parsed;
        };

        const parsedCantidad = parseNumOrNull(cantidad);
        const parsedSyntax = parseNumOrNull(syntax);
        const parsedCat = (cat !== undefined && cat !== null && String(cat).trim() !== '')
            ? String(cat).trim().slice(0, 50)
            : null;

        if (exist.length > 0) {
            // 2. Si existe, hacemos UPDATE del maestro
            cateterismoId = exist[0].id;
            
            await db.query(
                `UPDATE cateterismo_diagnostico_hemodinamia SET 
                    dominancia_id = ?, 
                    descripcion = ?, 
                    complicaciones_procedimiento = ?, 
                    complicaciones_acceso = ?, 
                    conclusiones_id = ?,
                    conclusiones_otros = ?,
                    sugerencia_diagnostico_id = ?,
                    cateteres_id = ?,
                    guias_id = ?,
                    otros_guias = ?,
                    contrastes_id = ?,
                    otros_contrastes = ?,
                    cantidad = ?,
                    ventriculografia_id = ?,
                    medicamentos_utilizados_id = ?,
                    otros_medicamentos_utilizados = ?,
                    material_medico_quirurgico_id = ?,
                    syntax = ?,
                    cat = ?,
                    fecha_actualizacion = CURRENT_TIMESTAMP
                WHERE id = ?`,
                [
                    dominancia_id || null, 
                    descripcion || null, 
                    compProcedimientoJson,         // JSON stringified (MultiSelect)
                    complicaciones_acceso || null, // INT directo (Autocomplete)
                    conclusionesJson,
                    conclusiones_otros || null,
                    sugerencia_diagnostico_id || null,
                    cateteresJson,
                    guiasJson,
                    otros_guias || null,
                    contrastesJson,
                    otros_contrastes || null,
                    parsedCantidad,
                    ventriculografiaJson,
                    medicamentosJson,
                    otros_medicamentos_utilizados || null,
                    materialQuirurgicoJson,
                    parsedSyntax,
                    parsedCat,
                    cateterismoId
                ]
            );

            // 3. Limpiamos el detalle anterior
            await db.query(
                'DELETE FROM cateterismo_detalle_arterias WHERE cateterismo_id = ?', 
                [cateterismoId]
            );

        } else {
            // 4. Si no existe, hacemos INSERT del maestro
            const [result] = await db.query(
                `INSERT INTO cateterismo_diagnostico_hemodinamia 
                (solicitud_paciente_id, dominancia_id, descripcion, complicaciones_procedimiento, complicaciones_acceso, conclusiones_id, conclusiones_otros, sugerencia_diagnostico_id, cateteres_id, guias_id, otros_guias, contrastes_id, otros_contrastes, cantidad, ventriculografia_id, medicamentos_utilizados_id, otros_medicamentos_utilizados, material_medico_quirurgico_id, syntax, cat) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                [
                    solicitud_paciente_id, 
                    dominancia_id || null, 
                    descripcion || null,
                    compProcedimientoJson,         // JSON stringified (MultiSelect)
                    complicaciones_acceso || null, // INT directo (Autocomplete)
                    conclusionesJson,
                    conclusiones_otros || null,
                    sugerencia_diagnostico_id || null,
                    cateteresJson,
                    guiasJson,
                    otros_guias || null,
                    contrastesJson,
                    otros_contrastes || null,
                    parsedCantidad,
                    ventriculografiaJson,
                    medicamentosJson,
                    otros_medicamentos_utilizados || null,
                    materialQuirurgicoJson,
                    parsedSyntax,
                    parsedCat
                ]
            );
            
            cateterismoId = result.insertId; 
        }

        // 5. Insertamos el detalle (Arterias)
        if (arterias && arterias.length > 0) {
            const arteriasValues = arterias.map(a => [
                cateterismoId,
                a.arteria_nombre,
                a.calibre_id || null,
                a.lesion_id || null,
                a.segmento_id || null,
                a.tipo_id || null,
                a.flujo_id || null
            ]);

            await db.query(
                `INSERT INTO cateterismo_detalle_arterias 
                (cateterismo_id, arteria_nombre, calibre_id, lesion_id, segmento_id, tipo_id, flujo_id) 
                VALUES ?`,
                [arteriasValues]
            );
        }

        return res.status(200).json({ message: 'Cateterismo guardado con éxito' });
        
    } catch (error) {
        console.error("Error en saveCateterismo:", error);
        res.status(500).json({ error: error.message });
    }
};

// Obtener Cateterismo Diagnóstico y sus Arterias
const getCateterismoBySolicitud = async (req, res) => {
    const { solicitudId } = req.params;
    
    try {
        // 1. Buscamos el maestro
        const [masterRows] = await db.query(
            'SELECT * FROM cateterismo_diagnostico_hemodinamia WHERE solicitud_paciente_id = ? AND estatus = 1',
            [solicitudId]
        );

        if (masterRows.length === 0) {
            return res.json(null);
        }

        const cateterismo = masterRows[0];

        // Resolver labels faltantes desde tipo_general_materiales para retrocompatibilidad
        const missingIds = collectMissingMaterialIds([
            cateterismo.cateteres_id,
            cateterismo.guias_id,
            cateterismo.contrastes_id,
            cateterismo.ventriculografia_id,
            cateterismo.medicamentos_utilizados_id,
            cateterismo.material_medico_quirurgico_id
        ]);

        const catalogMap = {};
        if (missingIds.length > 0) {
            const [matRows] = await db.query(
                'SELECT id, nombre FROM tipo_general_materiales WHERE id IN (?)',
                [missingIds]
            );
            matRows.forEach(m => { catalogMap[m.id] = m.nombre; });
        }

        cateterismo.cateteres_id = normalizeInsumoJson(cateterismo.cateteres_id, 'cateteres', catalogMap);
        cateterismo.guias_id = normalizeInsumoJson(cateterismo.guias_id, 'general', catalogMap);
        cateterismo.contrastes_id = normalizeInsumoJson(cateterismo.contrastes_id, 'general', catalogMap);
        cateterismo.ventriculografia_id = normalizeInsumoJson(cateterismo.ventriculografia_id, 'general', catalogMap);
        cateterismo.medicamentos_utilizados_id = normalizeInsumoJson(cateterismo.medicamentos_utilizados_id, 'general', catalogMap);
        cateterismo.material_medico_quirurgico_id = normalizeInsumoJson(cateterismo.material_medico_quirurgico_id, 'general', catalogMap);

        // 2. Buscamos el detalle asociado al ID del maestro
        const [detailRows] = await db.query(
            'SELECT * FROM cateterismo_detalle_arterias WHERE cateterismo_id = ?',
            [cateterismo.id]
        );

        // 3. Adjuntamos las arterias al objeto de respuesta
        cateterismo.arterias = detailRows;

        res.json(cateterismo);
        
    } catch (error) {
        console.error("Error en getCateterismoBySolicitud:", error);
        res.status(500).json({ error: error.message });
    }
};



const activarTerapeutico = async (req, res) => {
    const { solicitudId } = req.params;
    
    try {
        const [rows] = await db.query(
            'SELECT sugerencia_diagnostico_id FROM cateterismo_diagnostico_hemodinamia WHERE solicitud_paciente_id = ? LIMIT 1',
            [solicitudId]
        );

        // Si no hay registro o la sugerencia no existe, es false
        if (rows.length === 0 || !rows[0].sugerencia_diagnostico_id) {
            return res.json(false);
        }

        const sugerenciaId = rows[0].sugerencia_diagnostico_id;

        // Si es 48 o 51, devuelve true, de lo contrario false
        if (sugerenciaId === 48 || sugerenciaId === 51) {
            return res.json(true);
        } else {
            return res.json(false);
        }
        
    } catch (error) {
        console.error("Error en activarTerapeutico:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { saveCateterismo, getCateterismoBySolicitud, activarTerapeutico };
