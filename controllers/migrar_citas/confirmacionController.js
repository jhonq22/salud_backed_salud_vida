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
            // ==========================================
            // NUEVA VALIDACIÓN: Evitar solicitudes duplicadas
            // ==========================================
            const codGobierno = temp.codificacion_buen_gobierno || '';

            const [solicitudActiva] = await connection.query(
                `SELECT rsp.id 
                 FROM registrar_solicitud_pacientes rsp
                 INNER JOIN pacientes p ON rsp.paciente_id = p.id
                 WHERE (p.cedula = ? OR (p.codificacion_buen_gobierno = ? AND p.codificacion_buen_gobierno != ''))
                   AND (rsp.estatus = 1 AND rsp.estatus_solicitud_id != 6)
                 LIMIT 1`,
                [temp.cedula, codGobierno]
            );

            if (solicitudActiva.length > 0) {
                await connection.rollback();
                return res.status(400).json({
                    status: true,
                    msg: `La cédula ${temp.cedula} o código ya tiene una solicitud asignada y no puede registrar otra hasta que la finalice.`
                });
            }
            // ==========================================

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

            // ==========================================
            // LÓGICA DE TIPO DE OPERACIÓN Y MARCAPASO
            // ==========================================
            const tipoOp = temp.tipo_operacion ? temp.tipo_operacion.toUpperCase().trim() : '';

            let valorMarcapaso = 0;
            let tipoOperacionId = 1; // Valor por defecto en caso de que no coincida con ninguno

            if (tipoOp === 'MARCAPASO') {
                valorMarcapaso = 1;
                tipoOperacionId = 1;
            } else if (tipoOp === 'HEMODINAMIA') {
                valorMarcapaso = 0;
                tipoOperacionId = 2;
            }

            // Crear solicitud usando las variables dinámicas
            await connection.query(
                `INSERT INTO registrar_solicitud_pacientes 
                (paciente_id, fecha_cita, estatus_solicitud_id, tipo_operacion_id, centro_salud_id, estatus, fecha_creacion, marcapaso) 
                VALUES (?, ?, 8, ?, ?, 1, NOW(), ?)`,
                [pacienteId, temp.fecha_cita_asignada, tipoOperacionId, centro_salud_id, valorMarcapaso]
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

const eliminarTemporales = async (req, res) => {
    const { centro_salud_id } = req.params;

    if (!centro_salud_id) {
        return res.status(400).json({ status: false, msg: 'Es necesario el ID del centro de salud.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction(); // Usamos transacción por seguridad

        const [result] = await connection.query(
            'DELETE FROM pacientes_cita_temporal WHERE estatus = "en_espera" AND centro_salud_id = ?',
            [centro_salud_id]
        );

        if (result.affectedRows > 0) {
            // ==========================================
            // NUEVO: Sincronizar el puntero de fechas
            // ==========================================
            // 1. Buscamos la última fecha real de los que sí fueron procesados
            const [ultimaReal] = await connection.query(
                'SELECT MAX(fecha_cita_asignada) as max_fecha FROM pacientes_cita_temporal WHERE estatus = "procesado" AND centro_salud_id = ?',
                [centro_salud_id]
            );

            // Si no hay procesados previos, la dejamos en NULL para que arranque desde la fecha_inicio_reparto
            const fechaSincronizada = ultimaReal[0].max_fecha || null;

            // 2. Actualizamos la tabla de control para retroceder el cursor
            await connection.query(
                'UPDATE control_asignacion_citas SET ultima_fecha_asignada = ? WHERE centro_salud_id = ?',
                [fechaSincronizada, centro_salud_id]
            );

            await connection.commit();

            return res.json({
                status: true,
                msg: `Se han eliminado ${result.affectedRows} registros en espera y sincronizado el calendario.`
            });
        } else {
            await connection.commit();
            return res.json({
                status: true,
                msg: 'No se encontraron registros en espera para este hospital.'
            });
        }

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error al eliminar temporales:", error);
        return res.status(500).json({
            status: false,
            msg: 'Hubo un error al intentar limpiar la lista.',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};



const eliminarTemporalPorId = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();

    try {
        // Iniciamos una transacción para asegurar que todo ocurra o nada ocurra
        await connection.beginTransaction();

        // 1. Obtener el centro_salud_id antes de eliminar el registro
        const [paciente] = await connection.query(
            'SELECT centro_salud_id FROM pacientes_cita_temporal WHERE id = ?',
            [id]
        );

        // Si el ID no existe
        if (paciente.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                status: false,
                msg: 'No se encontró el registro especificado para eliminar.'
            });
        }

        const centro_salud_id = paciente[0].centro_salud_id;

        // 2. Ejecutamos la eliminación del paciente individual
        await connection.query(
            'DELETE FROM pacientes_cita_temporal WHERE id = ?',
            [id]
        );

        // 3. Sincronizar el puntero de fechas para este hospital específico
        // Buscamos la fecha máxima de los pacientes que quedan (tanto en_espera como procesados)
        const [ultimaReal] = await connection.query(
            `SELECT MAX(fecha_cita_asignada) as max_fecha 
             FROM pacientes_cita_temporal 
             WHERE centro_salud_id = ?`,
            [centro_salud_id]
        );

        // Si ya no quedan más pacientes en la tabla para ese hospital, se vuelve NULL
        const fechaSincronizada = ultimaReal[0].max_fecha || null;

        // 4. Actualizamos la tabla de control con el nuevo límite real
        await connection.query(
            'UPDATE control_asignacion_citas SET ultima_fecha_asignada = ? WHERE centro_salud_id = ?',
            [fechaSincronizada, centro_salud_id]
        );

        // Confirmamos todos los cambios en la base de datos
        await connection.commit();

        return res.json({
            status: true,
            msg: `El registro con ID ${id} ha sido eliminado y el calendario del hospital fue sincronizado correctamente.`
        });

    } catch (error) {
        // Si algo falla, revertimos cualquier cambio para evitar corrupción de datos
        if (connection) await connection.rollback();
        console.error("Error al eliminar el registro temporal:", error);
        return res.status(500).json({
            status: false,
            msg: 'Hubo un error al intentar eliminar el registro.',
            error: error.message
        });
    } finally {
        if (connection) connection.release();
    }
};


module.exports = { confirmarCitas, eliminarTemporales, eliminarTemporalPorId };