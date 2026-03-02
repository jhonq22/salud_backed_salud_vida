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
    }
};

module.exports = ReportesController;