const db = require('../../config/db');

// Función para calcular edad
const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return null;
    const hoy = new Date();
    const cumple = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
        edad--;
    }
    return edad;
};

const confirmarCitas = async (req, res) => {
    const { centro_salud_id } = req.body;

    if (!centro_salud_id) {
        return res.status(400).json({ status: true, msg: 'El ID del centro de salud es obligatorio.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [temporales] = await connection.query(
            'SELECT * FROM pacientes_cita_temporal WHERE estatus = "en_espera"'
        );

        if (temporales.length === 0) {
            await connection.rollback();
            return res.json({ status: false, msg: 'No hay pacientes pendientes por confirmar' });
        }

        let procesados = 0;

        for (const temp of temporales) {
            let pacienteId = null;
            const edadCalculada = calcularEdad(temp.fecha_nacimiento);

            const [existente] = await connection.query(
                'SELECT id FROM pacientes WHERE cedula = ?',
                [temp.cedula]
            );

            if (existente.length > 0) {
                pacienteId = existente[0].id;
                await connection.query(
                    `UPDATE pacientes SET 
                        codificacion_buen_gobierno = ?,
                        fecha_nacimiento = ?,
                        edad = ?,
                        telefono_local = ?,
                        telefono_celular = ?,
                        estado_id = 24,
                        municipio_id = 462,
                        parroquia_id = 1117
                     WHERE id = ?`,
                    [temp.codificacion_buen_gobierno, temp.fecha_nacimiento, edadCalculada, temp.telefono, temp.telefono2, pacienteId]
                );
            } else {
                const [nuevo] = await connection.query(
                    `INSERT INTO pacientes 
                    (cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, 
                     telefono_local, telefono_celular, correo, fecha_nacimiento, edad, codificacion_buen_gobierno, 
                     estado_id, municipio_id, parroquia_id, estatus, es_cedulado) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 24, 462, 1117, 1, 1)`,
                    [
                        temp.cedula, temp.primer_nombre, temp.segundo_nombre, temp.primer_apellido, temp.segundo_apellido,
                        temp.telefono, temp.telefono2, temp.correo, temp.fecha_nacimiento, edadCalculada, temp.codificacion_buen_gobierno
                    ]
                );
                pacienteId = nuevo.insertId;
            }

            // Crear solicitud
            await connection.query(
                `INSERT INTO registrar_solicitud_pacientes 
                (paciente_id, fecha_cita, estatus_solicitud_id, tipo_operacion_id, centro_salud_id, estatus, fecha_creacion) 
                VALUES (?, ?, 1, 1, ?, 1, NOW())`,
                [pacienteId, temp.fecha_cita_asignada, centro_salud_id]
            );

            // Marcar procesado
            await connection.query(
                'UPDATE pacientes_cita_temporal SET estatus = "procesado" WHERE id = ?',
                [temp.id]
            );

            procesados++;
        }

        await connection.commit();
        res.json({ status: false, msg: 'Confirmación exitosa', total_procesados: procesados });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error en confirmación:", error);
        res.status(500).json({ status: true, msg: 'Error en la confirmación', error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = { confirmarCitas };