const db = require('../../config/db');

const ReportesController = {
    /**
     * Obtiene la "Sábana" completa del paciente
     * Solución nativa en JS para evitar errores de JSON en MariaDB (XAMPP)
     */
    getSabanaPaciente: async (req, res) => {
        try {
            const { solicitud_id } = req.params;

            if (!solicitud_id) {
                return res.status(400).json({
                    success: false,
                    message: "El parámetro solicitud_id es requerido."
                });
            }

            // 1. ENFERMEDAD ACTUAL (Monitoreo de peso y datos generales)
            const [enfActualResult] = await db.query(`
                SELECT 
                    pea.ultimo_peso_kg AS peso_anterior,
                    pea.ultimo_peso_fecha AS fecha_anterior,
                    pea.peso_actual_kg AS peso_actual,
                    (pea.peso_actual_kg - pea.ultimo_peso_kg) AS diferencia,
                    pea.sintomas, 
                    pea.duracion, 
                    pea.ross, 
                    pea.nyha, 
                    pea.otra_sintomatologia, 
                    pea.retraso_pondoestatural,
                    pea.portador_cardiopatia_estructural,
                    -- Nombres de catálogos
                    c_inicio_sint.nombre AS inicio_sintomatologia_nombre,
                    c_tipo_portador.nombre AS tipo_portador_nombre,
                    c_en_condicion.nombre AS en_condicion_nombre,
                    c_ic.nombre AS ic_nombre,
                    c_origen_t.nombre AS origen_torasico_nombre,
                    c_presentacion.nombre AS presentacion_nombre,
                    c_riesgos.nombre AS riesgos_nombre,
                    c_inicio.nombre AS inicio_nombre,
                    c_fin.nombre AS fin_nombre,
                    c_concomitante.nombre AS concomitante_nombre,
                    c_frec_sincope.nombre AS frecuencia_sincope_nombre,
                    c_aparicion.nombre AS aparicion_nombre,
                    c_frec_pre.nombre AS frecuencia_pre_sincope_nombre,
                    c_clase_funcional.nombre AS clase_funcional_nombre
                FROM paciente_enfermedad_actual pea
                -- CORRECCIÓN: inicio_sintomologia_id (sin la 'a')
                LEFT JOIN enfermedad_actual_catalogos c_inicio_sint ON pea.inicio_sintomalogia_id = c_inicio_sint.id
                LEFT JOIN enfermedad_actual_catalogos c_tipo_portador ON pea.tipo_portador_id = c_tipo_portador.id
                -- CORRECCIÓN: en_condiccion_id (con doble 'c' según tu imagen)
                LEFT JOIN enfermedad_actual_catalogos c_en_condicion ON pea.en_condiccion_id = c_en_condicion.id
                LEFT JOIN enfermedad_actual_catalogos c_ic ON pea.ic_id = c_ic.id
                LEFT JOIN enfermedad_actual_catalogos c_origen_t ON pea.origen_torasico_id = c_origen_t.id
                LEFT JOIN enfermedad_actual_catalogos c_presentacion ON pea.presentacion_id = c_presentacion.id
                LEFT JOIN enfermedad_actual_catalogos c_riesgos ON pea.riesgos_id = c_riesgos.id
                LEFT JOIN enfermedad_actual_catalogos c_inicio ON pea.inicio_id = c_inicio.id
                LEFT JOIN enfermedad_actual_catalogos c_fin ON pea.fin_id = c_fin.id
                -- CORRECCIÓN: concamitante_id (con 'a' en lugar de 'o')
                LEFT JOIN enfermedad_actual_catalogos c_concomitante ON pea.concamitante_id = c_concomitante.id
                LEFT JOIN enfermedad_actual_catalogos c_frec_sincope ON pea.frecuencia_sincope_id = c_frec_sincope.id
                LEFT JOIN enfermedad_actual_catalogos c_aparicion ON pea.aparicion_id = c_aparicion.id
                LEFT JOIN enfermedad_actual_catalogos c_frec_pre ON pea.frecuencia_pre_sincope_id = c_frec_pre.id
                LEFT JOIN enfermedad_actual_catalogos c_clase_funcional ON pea.clase_funcional_id = c_clase_funcional.id
                WHERE pea.solicitud_paciente_id = ? LIMIT 1
            `, [solicitud_id]);

            // 2. SIGNOS VITALES
            const [signosResult] = await db.query(`
                SELECT peso, talla, fc, fr, ta, so2 
                FROM paciente_examen_signos_vitales 
                WHERE solicitud_paciente_id = ? LIMIT 1
            `, [solicitud_id]);

            // 3. ANTECEDENTES (Adaptado a tu estructura real sin catalogo_id)
            const [antecedentesResult] = await db.query(`
                SELECT 
                    tipo AS grupo, 
                    hospitalizacion_personales_mayores, patologia_base, 
                    hospitalizacion_neonatal, habitos, quirurgico, familiares, 
                    neonatal_pan, neonatal_tan, neonatal_eg, otras
                FROM pacientes_antecedentes 
                WHERE solicitud_paciente_id = ? AND estatus = 1
            `, [solicitud_id]);

            // 4. EXAMEN FÍSICO (Cruzando las tablas maestras)
            const [fisicoResult] = await db.query(`
                SELECT 
                    S.nombre AS seccion_nombre,
                    P.nombre AS parametro,
                    COALESCE(O_RES.texto_opcion, RES.valor_texto) AS valor
                FROM paciente_examen_fisico RES
                INNER JOIN fisico_secciones S ON RES.seccion_id = S.id
                INNER JOIN fisico_parametros P ON RES.parametro_id = P.id
                LEFT JOIN fisico_opciones O_RES ON RES.opcion_id = O_RES.id
                WHERE RES.solicitud_paciente_id = ? AND RES.estatus = 1 AND S.estatus = 1
                ORDER BY S.orden ASC, P.orden ASC
            `, [solicitud_id]);

            // Agrupamos el examen físico por sección usando JavaScript
            const examenFisicoAgrupado = [];
            const mapSecciones = new Map();

            fisicoResult.forEach(row => {
                if (!mapSecciones.has(row.seccion_nombre)) {
                    mapSecciones.set(row.seccion_nombre, {
                        seccion: row.seccion_nombre,
                        parametros: []
                    });
                    examenFisicoAgrupado.push(mapSecciones.get(row.seccion_nombre));
                }
                mapSecciones.get(row.seccion_nombre).parametros.push({
                    parametro: row.parametro,
                    valor: row.valor
                });
            });

            // 5. PARACLÍNICOS (ECG, ECO, RX)
            const [ecgResult] = await db.query(`
                SELECT C.nombre_opcion AS ritmo, E.frecuencia_cardiaca AS fc, 
                       E.eje_qrs AS eje, E.descripcion_hallazgos AS hallazgos
                FROM paciente_paraclinico_ecg E 
                LEFT JOIN paraclinico_catalogos C ON E.ritmo_id = C.id
                WHERE E.solicitud_paciente_id = ? LIMIT 1
            `, [solicitud_id]);

            const [ecoResult] = await db.query(`
                SELECT CONCAT(fevi_simpson, '%') AS fevi, ddvi, 
                       IF(fop, 'SI', 'NO') AS fop, IF(vcsip, 'SI', 'NO') AS vcsip
                FROM paciente_paraclinico_eco 
                WHERE solicitud_paciente_id = ? LIMIT 1
            `, [solicitud_id]);

            const [rxResult] = await db.query(`
                SELECT ict, C.nombre_opcion AS flujo, 
                       crecimiento_cavidades AS cavidades, otros_hallazgos AS otros
                FROM paciente_paraclinico_rx R
                LEFT JOIN paraclinico_catalogos C ON R.flujo_pulmonar_id = C.id
                WHERE R.solicitud_paciente_id = ? LIMIT 1
            `, [solicitud_id]);

            // 6. CONSTRUCCIÓN DEL JSON FINAL
            const sabana_paciente_completa = {
                enfermedad_actual: {
                    monitoreo_peso: enfActualResult[0] ? {
                        peso_anterior: enfActualResult[0].peso_anterior,
                        fecha_anterior: enfActualResult[0].fecha_anterior,
                        peso_actual: enfActualResult[0].peso_actual,
                        diferencia: enfActualResult[0].diferencia
                    } : null,
                    detalles: enfActualResult[0] || null
                },
                signos_vitales: signosResult[0] || null,
                antecedentes: antecedentesResult,
                examen_fisico: examenFisicoAgrupado,
                paraclinicos: {
                    ecg: ecgResult[0] || null,
                    eco: ecoResult[0] || null,
                    rx: rxResult[0] || null
                }
            };

            // Enviamos la respuesta limpia al frontend
            res.json({
                success: true,
                data: sabana_paciente_completa
            });

        } catch (error) {
            console.error("Error en ReportesController:", error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },


    

getReporteMarcapasos: async (req, res) => {
        try {
            const { solicitud_id } = req.params;

            if (!solicitud_id) {
                return res.status(400).json({
                    success: false,
                    message: "El parámetro solicitud_id es requerido."
                });
            }

            // 1. INDICACIONES FUNCIONALES
            const [indicacionesResult] = await db.query(`
                SELECT 
                    i.id AS registro_id,
                    i.solicitud_paciente_id,
                    f.descripcion AS frecuencia_cardiaca,
                    c.descripcion AS trastornos_conduccion,
                    fun.descripcion AS trastornos_funcionales,
                    o.descripcion AS trastornos_otros,
                    i.hb, i.gb, i.plaquetas, i.creatinina, i.urea
                FROM indicaciones_implante_nuevos i
                LEFT JOIN lista_relacionado_frecuencia_cardiaca f ON i.relacionado_frecuencia_cardiaca_id = f.id
                LEFT JOIN lista_relacionado_trastornos_conduccion c ON i.relacionado_trastornos_conduccion_id = c.id
                LEFT JOIN lista_relacionado_trastornos_funcionales fun ON i.relacionado_trastornos_funcionales_id = fun.id
                LEFT JOIN lista_relacionado_trastornos_otros o ON i.relacionado_trastornos_otros_id = o.id
                WHERE i.solicitud_paciente_id = ?
                ORDER BY i.id DESC LIMIT 1;
            `, [solicitud_id]);

            // 2. IMPLANTACIONES (Generador y Electrodos)
            const [implantacionResult] = await db.query(`
                SELECT 
                    -- Generador
                    g.serial AS generador_serial, ma_g.marca AS generador_marca, mo_g.modelo AS generador_modelo,
                    -- Electrodo Ventricular
                    ev.serial AS electrodo_vent_serial, ma_ev.marca AS electrodo_vent_marca, mo_ev.modelo AS electrodo_vent_modelo, ev.medida AS electrodo_vent_medida, ev.nueva_medida AS electrodo_vent_nueva_medida,
                    -- Electrodo Auricular
                    ea.serial AS electrodo_aur_serial, ma_ea.marca AS electrodo_aur_marca, mo_ea.modelo AS electrodo_aur_modelo, ea.medida AS electrodo_aur_medida, ea.nueva_medida AS electrodo_aur_nueva_medida,
                    -- Modos y Parámetros
                    me.modo_estimulacion, me.r_modo,
                    pmv.umbral_captura AS vent_umbral, pmv.impedancia AS vent_impedancia, pmv.duracion AS vent_duracion,
                    ppv.amplitud_r AS vent_amplitud_r, ppv.fc_minima AS vent_fc_minima, ppv.voltios AS vent_voltios, ppv.tiempos AS vent_tiempos,
                    pma.umbral_captura AS aur_umbral, pma.impedancia AS aur_impedancia, pma.duracion AS aur_duracion,
                    ppa.amplitud_a AS aur_amplitud_a, ppa.fc_minima AS aur_fc_minima
                FROM generador_implantado g
                LEFT JOIN marcas ma_g ON g.marca_id = ma_g.id
                LEFT JOIN modelos mo_g ON g.modelo_id = mo_g.id
                LEFT JOIN electrodo_verticular_implantado ev ON g.solicitud_paciente_id = ev.solicitud_paciente_id
                LEFT JOIN marcas ma_ev ON ev.marca_id = ma_ev.id
                LEFT JOIN modelos mo_ev ON ev.modelo_id = mo_ev.id
                LEFT JOIN electrodo_auricular_implantado ea ON g.solicitud_paciente_id = ea.solicitud_paciente_id
                LEFT JOIN marcas ma_ea ON ea.marca_id = ma_ea.id
                LEFT JOIN modelos mo_ea ON ea.modelo_id = mo_ea.id
                LEFT JOIN modo_estimulacion_implantado me ON g.solicitud_paciente_id = me.solicitud_paciente_id
                LEFT JOIN parametro_medidos_ventricular_implantado pmv ON g.solicitud_paciente_id = pmv.solicitud_paciente_id
                LEFT JOIN parametro_programacion_ventricular_implantado ppv ON g.solicitud_paciente_id = ppv.solicitud_paciente_id
                LEFT JOIN parametro_medidos_auricular_implantado pma ON g.solicitud_paciente_id = pma.solicitud_paciente_id
                LEFT JOIN parametro_programacion_auricular_implantado ppa ON g.solicitud_paciente_id = ppa.solicitud_paciente_id
                WHERE g.solicitud_paciente_id = ? LIMIT 1;
            `, [solicitud_id]);

            // 3. TÉCNICA DE PROCEDIMIENTO
            const [tecnicaResult] = await db.query(`
                SELECT 
                    t.id AS tecnica_id, t.localizacion, tg.descripcion AS tecnica_anestesia, va.descripcion AS via_acceso, t.otro_via_acesso, bm.descripcion AS bolsillo_mcp,
                    GROUP_CONCAT(le_el.descripcion SEPARATOR ', ') AS electrodos_nombres,
                    le.descripcion AS lugar_estimulacion, t.otros_lugar_estimulacion, t.tamano_septum
                FROM tecnica_procedimiento_implantado t
                LEFT JOIN lista_general_tecnica_procedimiento tg ON t.general_id = tg.id
                LEFT JOIN lista_via_acesso_tecnica_procedimiento va ON t.via_acceso_id = va.id
                LEFT JOIN lista_bolsillo_mcp_tecnica_procedimiento bm ON t.bolsillo_mcp_id = bm.id
                LEFT JOIN lista_lugar_estimulacion_tecnica_procedimiento le ON t.lugar_estimulacion_id = le.id
                LEFT JOIN lista_colocacion_electrodos_tecnica_procedimiento le_el ON JSON_CONTAINS(t.colocacion_electrodos_id, CAST(le_el.id AS CHAR), '$')
                WHERE t.solicitud_paciente_id = ?
                GROUP BY t.id LIMIT 1;
            `, [solicitud_id]);

            // 4. COMPLICACIONES Y EGRESO
            const [complicacionesResult] = await db.query(`
                SELECT 
                    IF(ci.ninguna = 1, 'Sí', 'No') AS ninguna, IF(ci.hematoma = 1, 'Sí', 'No') AS hematoma, IF(ci.neumotorax = 1, 'Sí', 'No') AS neumotorax,
                    IF(ci.hemotorax = 1, 'Sí', 'No') AS hemotorax, IF(ci.fallecimiento = 1, 'Sí', 'No') AS fallecimiento, IF(ci.desplazamiento_electrodo = 1, 'Sí', 'No') AS desplazamiento_electrodo,
                    IF(ci.bloqueo_salida = 1, 'Sí', 'No') AS bloqueo_salida, IF(ci.lesion_plexo_braquial = 1, 'Sí', 'No') AS lesion_plexo_braquial, IF(ci.perforacion_cardiaca = 1, 'Sí', 'No') AS perforacion_cardiaca,
                    IF(ci.tvp = 1, 'Sí', 'No') AS tvp, IF(ci.sindrome_mcp = 1, 'Sí', 'No') AS sindrome_mcp, IF(ci.insuficiencia_tricuspidea_signif = 1, 'Sí', 'No') AS insuficiencia_tricuspidea_signif,
                    IF(ci.estimulacion_diafragmatica_reint = 1, 'Sí', 'No') AS estimulacion_diafragmatica_reint, IF(ci.otra = 1, 'Sí', 'No') AS otra, ci.otra_descripcion,
                    sv.fc_lpm AS frecuencia_cardiaca, sv.fr_rpm AS frecuencia_respiratoria, sv.ta_mmhg AS tension_arterial, sv.sato2_porcentaje AS saturacion_oxigeno, sv.temperatura_c AS temperatura,
                    IF(pr.plan_aposito_compresivo_48h = 1, 'Sí', 'No') AS plan_aposito_compresivo_48h, IF(pr.plan_radiografia_torax_control = 1, 'Sí', 'No') AS plan_radiografia_torax_control,
                    IF(pr.plan_inmovilizacion_parcial_ms_izq = 1, 'Sí', 'No') AS plan_inmovilizacion_parcial_ms_izq, IF(pr.plan_atb_cefalosporina_7dias = 1, 'Sí', 'No') AS plan_atb_cefalosporina_7dias,
                    IF(pr.plan_analgesico_aine_5dias = 1, 'Sí', 'No') AS plan_analgesico_aine_5dias, IF(pr.plan_ecg_control = 1, 'Sí', 'No') AS plan_ecg_control, IF(pr.plan_control_7dias = 1, 'Sí', 'No') AS plan_control_7dias
                FROM complicaciones_inmediatas ci
                LEFT JOIN registro_egreso_signos_vitales sv ON ci.solicitud_paciente_id = sv.solicitud_paciente_id
                LEFT JOIN registro_plan_recomendaciones pr ON ci.solicitud_paciente_id = pr.solicitud_paciente_id
                WHERE ci.solicitud_paciente_id = ? LIMIT 1;
            `, [solicitud_id]);

            // 5. CONSTRUCCIÓN DEL JSON FINAL
            const reporte_marcapasos_completo = {
                indicaciones_funcionales: indicacionesResult[0] || null,
                tecnica_procedimiento: tecnicaResult[0] || null,
                implantacion: implantacionResult[0] || null,
                complicaciones_y_egreso: complicacionesResult[0] || null
            };

            // Enviamos la respuesta
            res.json({
                success: true,
                data: reporte_marcapasos_completo
            });

        } catch (error) {
            console.error("Error al generar reporte de marcapasos:", error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
};

module.exports = ReportesController;