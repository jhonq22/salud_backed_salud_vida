const db = require('../../config/db');

const confirmarCitas = async (req, res) => {
    // Recibimos el centro_salud_id desde el frontend
    const { centro_salud_id } = req.body;

    if (!centro_salud_id) {
        return res.status(400).json({
            status: true,
            msg: 'El ID del centro de salud es obligatorio.'
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Buscar registros en la tabla temporal con estatus 'en_espera'
        const [temporales] = await connection.query(
            'SELECT * FROM pacientes_cita_temporal WHERE estatus = "en_espera"'
        );

        if (temporales.length === 0) {
            await connection.rollback();
            return res.json({
                status: false,
                msg: 'No hay pacientes pendientes por confirmar'
            });
        }

        let procesados = 0;

        for (const temp of temporales) {
            let pacienteId = null;

            // 2. Verificar si el paciente ya existe por cédula
            const [existente] = await connection.query(
                'SELECT id FROM pacientes WHERE cedula = ?',
                [temp.cedula]
            );

            if (existente.length > 0) {
                // --- ACTUALIZAR PACIENTE EXISTENTE ---
                pacienteId = existente[0].id;
                await connection.query(
                    `UPDATE pacientes SET 
                        codificacion_buen_gobierno = ?,
                        estado_id = 24,
                        municipio_id = 462,
                        parroquia_id = 1117
                     WHERE id = ?`,
                    [temp.codificacion_buen_gobierno, pacienteId]
                );
            } else {
                // --- INSERTAR NUEVO PACIENTE ---
                // Se incluyen los datos geográficos por defecto y el código 1x10 del excel
                const [nuevo] = await connection.query(
                    `INSERT INTO pacientes 
                    (cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, 
                     telefono_celular, correo, codificacion_buen_gobierno, 
                     estado_id, municipio_id, parroquia_id, estatus, es_cedulado) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 24, 462, 1117, 1, 1)`,
                    [
                        temp.cedula,
                        temp.primer_nombre,
                        temp.segundo_nombre,
                        temp.primer_apellido,
                        temp.segundo_apellido,
                        temp.telefono,
                        temp.correo,
                        temp.codificacion_buen_gobierno
                    ]
                );
                pacienteId = nuevo.insertId;
            }

            // 3. Crear la solicitud de cita vinculada al hospital seleccionado
            await connection.query(
                `INSERT INTO registrar_solicitud_pacientes 
                (paciente_id, fecha_cita, estatus_solicitud_id, tipo_operacion_id, centro_salud_id, estatus, fecha_creacion) 
                VALUES (?, ?, 1, 1, ?, 1, NOW())`,
                [pacienteId, temp.fecha_cita_asignada, centro_salud_id]
            );

            // 4. Marcar el registro temporal como procesado para que no vuelva a aparecer
            await connection.query(
                'UPDATE pacientes_cita_temporal SET estatus = "procesado" WHERE id = ?',
                [temp.id]
            );

            procesados++;
        }

        await connection.commit();

        res.json({
            status: false, // Cambiado a false según tu lógica para que el front limpie la vista
            msg: 'Confirmación exitosa',
            total_procesados: procesados
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error en confirmación:", error);
        res.status(500).json({
            status: true,
            msg: 'Error en la confirmación',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = { confirmarCitas };