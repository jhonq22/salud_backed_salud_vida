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
                    ultimo_peso_kg AS peso_anterior,
                    ultimo_peso_fecha AS fecha_anterior,
                    peso_actual_kg AS peso_actual,
                    (peso_actual_kg - ultimo_peso_kg) AS diferencia,
                    sintomas, duracion, ross, nyha, otra_sintomatologia, retraso_pondoestatural
                FROM paciente_enfermedad_actual 
                WHERE solicitud_paciente_id = ? LIMIT 1
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