const db = require('../../config/db');

const examenFisicoController = {

    // =========================================================================
    // 1. GET: OBTENER ÁRBOL DE CONFIGURACIÓN (PADRES, HIJOS Y NIETOS)
    // =========================================================================
    // Este endpoint arma toda la estructura dinámica para el Frontend
    getConfiguracionFisico: async (req, res) => {
        try {
            // 1. Obtenemos las SECCIONES (Padres - Morado)
            const [secciones] = await db.query(`
                SELECT id as seccion_id, nombre, orden 
                FROM fisico_secciones 
                WHERE estatus = 1 
                ORDER BY orden
            `);

            // 2. Obtenemos los PARÁMETROS (Hijos - Anaranjado)
            const [parametros] = await db.query(`
                SELECT * FROM fisico_parametros 
                WHERE estatus = 1 
                ORDER BY seccion_id, orden
            `);

            // 3. Obtenemos todas las OPCIONES (Nietos y Bisnietos - Verde)
            const [opciones] = await db.query(`
                SELECT * FROM fisico_opciones 
                WHERE estatus = 1
            `);

            // 4. Procesamos la estructura en forma de árbol
            const arbolExamenFisico = secciones.map(sec => {
                // Filtramos parámetros que pertenecen a esta sección
                const paramsDeSeccion = parametros.filter(p => p.seccion_id === sec.seccion_id).map(param => {

                    // Filtramos opciones principales (Nietos) para este parámetro
                    const opcionesPrincipales = opciones.filter(o => o.parametro_id === param.id && o.padre_opcion_id === null).map(opc => {

                        // Filtramos sub-opciones (Bisnietos) para esta opción
                        const subOpciones = opciones.filter(sub => sub.padre_opcion_id === opc.id);

                        return {
                            ...opc,
                            sub_opciones: subOpciones
                        };
                    });

                    return {
                        ...param,
                        opciones: opcionesPrincipales
                    };
                });

                return {
                    ...sec,
                    activo: false, // Flag útil para los checkboxes del frontend
                    parametros: paramsDeSeccion
                };
            });

            res.status(200).json({
                success: true,
                data: arbolExamenFisico
            });

        } catch (error) {
            console.error("Error al obtener configuración del examen físico:", error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    },

    // =========================================================================
    // 2. POST: GUARDAR EXAMEN FÍSICO Y SIGNOS VITALES
    // =========================================================================
    guardarExamenPaciente: async (req, res) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const {
                solicitud_paciente_id,
                signosVitales,
                examenFisico,
                usuario_audit
            } = req.body;

            // --- A. GUARDAR SIGNOS VITALES ---
            if (signosVitales) {
                const [existeSV] = await connection.query(
                    'SELECT id FROM paciente_examen_signos_vitales WHERE solicitud_paciente_id = ?',
                    [solicitud_paciente_id]
                );

                if (existeSV.length > 0) {
                    await connection.query(`
                        UPDATE paciente_examen_signos_vitales 
                        SET peso=?, talla=?, fc=?, fr=?, ta=?, so2=?, audit_usu_id=? 
                        WHERE solicitud_paciente_id=?`,
                        [signosVitales.peso, signosVitales.talla, signosVitales.fc, signosVitales.fr, signosVitales.ta, signosVitales.so2, usuario_audit, solicitud_paciente_id]
                    );
                } else {
                    await connection.query(`
                        INSERT INTO paciente_examen_signos_vitales 
                        (solicitud_paciente_id, peso, talla, fc, fr, ta, so2, audit_usu_id) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [solicitud_paciente_id, signosVitales.peso, signosVitales.talla, signosVitales.fc, signosVitales.fr, signosVitales.ta, signosVitales.so2, usuario_audit]
                    );
                }
            }

            // --- B. GUARDAR EXAMEN FÍSICO (OPCIONES DINÁMICAS) ---
            if (examenFisico && examenFisico.length > 0) {
                // Borramos registros previos para evitar duplicidad
                await connection.query(
                    'DELETE FROM paciente_examen_fisico WHERE solicitud_paciente_id = ?',
                    [solicitud_paciente_id]
                );

                // Preparación de inserción masiva
                const values = examenFisico.map(item => [
                    solicitud_paciente_id,
                    item.seccion_id,
                    item.parametro_id,
                    item.opcion_id || null,
                    item.padre_opcion_id || null,
                    item.valor_texto || null,
                    usuario_audit
                ]);

                await connection.query(`
                    INSERT INTO paciente_examen_fisico 
                    (solicitud_paciente_id, seccion_id, parametro_id, opcion_id, padre_opcion_id, valor_texto, audit_usu_id) 
                    VALUES ?`,
                    [values]
                );
            }

            await connection.commit();
            res.status(200).json({ success: true, message: 'Examen físico guardado exitosamente.' });

        } catch (error) {
            await connection.rollback();
            console.error("Error al guardar examen físico:", error);
            res.status(500).json({ success: false, message: 'Error al guardar los datos.' });
        } finally {
            connection.release();
        }
    },

    // =========================================================================
    // 3. GET: OBTENER EXAMEN DE UN PACIENTE ESPECÍFICO
    // =========================================================================
    getExamenPaciente: async (req, res) => {
        try {
            const { solicitud_paciente_id } = req.params;

            const [signosVitales] = await db.query(
                'SELECT * FROM paciente_examen_signos_vitales WHERE solicitud_paciente_id = ?',
                [solicitud_paciente_id]
            );

            const [examenFisico] = await db.query(
                'SELECT * FROM paciente_examen_fisico WHERE solicitud_paciente_id = ?',
                [solicitud_paciente_id]
            );

            res.status(200).json({
                success: true,
                data: {
                    signosVitales: signosVitales[0] || null,
                    examenFisico: examenFisico || []
                }
            });

        } catch (error) {
            console.error("Error al consultar examen del paciente:", error);
            res.status(500).json({ success: false, message: 'Error al consultar los datos.' });
        }
    }
};

module.exports = examenFisicoController;