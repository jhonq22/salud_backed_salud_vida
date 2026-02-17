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

        // 1. Buscar pendientes
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

            // 2. Verificar existencia del paciente
            const [existente] = await connection.query(
                'SELECT id FROM pacientes WHERE cedula = ?',
                [temp.cedula]
            );

            if (existente.length > 0) {
                pacienteId = existente[0].id;
            } else {
                // 3. Crear paciente si no existe
                const [nuevo] = await connection.query(
                    `INSERT INTO pacientes 
                    (cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, 
                     telefono_celular, correo, estatus, es_cedulado) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`,
                    [
                        temp.cedula, temp.primer_nombre, temp.segundo_nombre,
                        temp.primer_apellido, temp.segundo_apellido,
                        temp.telefono, temp.correo
                    ]
                );
                pacienteId = nuevo.insertId;
            }

            // 4. Crear Solicitud con el centro_salud_id seleccionado
            await connection.query(
                `INSERT INTO registrar_solicitud_pacientes 
                (paciente_id, fecha_cita, estatus_solicitud_id, tipo_operacion_id, centro_salud_id, estatus, fecha_creacion) 
                VALUES (?, ?, 1, 1, ?, 1, NOW())`,
                [pacienteId, temp.fecha_cita_asignada, centro_salud_id]
            );

            // 5. Marcar temporal como procesado
            await connection.query(
                'UPDATE pacientes_cita_temporal SET estatus = "procesado" WHERE id = ?',
                [temp.id]
            );

            procesados++;
        }

        await connection.commit();

        res.json({
            status: false, // Para que el front limpie la vista
            msg: 'Confirmación exitosa',
            total_procesados: procesados
        });

    } catch (error) {
        await connection.rollback();
        console.error("Error en confirmación:", error);
        res.status(500).json({
            status: true,
            msg: 'Error en la confirmación',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

module.exports = { confirmarCitas };