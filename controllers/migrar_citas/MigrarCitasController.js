const xlsx = require('xlsx');
const db = require('../../config/db');

/**
 * Utilidad para sumar días a una fecha
 */
const sumarDias = (fecha, dias) => {
    const res = new Date(fecha);
    res.setDate(res.getDate() + dias);
    return res;
};

/**
 * Utilidad para formatear fecha a YYYY-MM-DD
 */
const fechaSQL = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const subirExcelTemporal = async (req, res) => {
    try {
        const { centro_salud_id } = req.body;

        if (!req.file) return res.status(400).json({ msg: 'Falta el archivo Excel' });
        if (!centro_salud_id) return res.status(400).json({ msg: 'Debe seleccionar un hospital antes de subir el archivo' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const datosRaw = xlsx.utils.sheet_to_json(sheet);

        if (datosRaw.length === 0) {
            return res.status(200).json({ msg: 'El Excel no tiene datos.' });
        }

        // --- OBTENER CONFIGURACIÓN DE CUPOS DEL HOSPITAL ---
        const [config] = await db.query(
            'SELECT dia_semana, cupos_maximos FROM configuracion_dias WHERE centro_salud_id = ?',
            [centro_salud_id]
        );

        if (config.length === 0) {
            return res.status(400).json({ msg: 'El hospital seleccionado no tiene cupos configurados.' });
        }

        const cuposPorDia = {};
        config.forEach(c => {
            cuposPorDia[c.dia_semana] = c.cupos_maximos;
        });

        const pacientesParaInsertar = [];

        // --- PROCESAR CADA FILA DEL EXCEL ---
        for (const fila of datosRaw) {
            // REINICIO: Cada paciente empieza buscando desde hoy
            let fechaCursor = new Date();

            const filaLimpia = {};
            Object.keys(fila).forEach(key => {
                const keyNormalizada = key.toString().trim().toUpperCase();
                filaLimpia[keyNormalizada] = fila[key];
            });

            if (!filaLimpia['CEDULA']) continue;

            let asignado = false;
            let intentos = 0;

            while (!asignado && intentos < 365) {
                // Ajuste de día: JS (0=Dom, 1=Lun) -> DB (1=Lun, 7=Dom)
                let diaSemanaJS = fechaCursor.getDay();
                let diaSemanaDB = (diaSemanaJS === 0) ? 7 : diaSemanaJS;

                const fechaStr = fechaSQL(fechaCursor);
                const limite = cuposPorDia[diaSemanaDB] || 0;

                // Si el día no tiene cupos configurados o es 0, saltar al siguiente día
                if (limite === 0) {
                    fechaCursor = sumarDias(fechaCursor, 1);
                    intentos++;
                    continue;
                }

                // 1. Consultar ocupación en Solicitudes Reales (Oficiales)
                const [oficiales] = await db.query(
                    'SELECT COUNT(*) as total FROM registrar_solicitud_pacientes WHERE fecha_cita = ? AND centro_salud_id = ?',
                    [fechaStr, centro_salud_id]
                );

                // 2. Consultar ocupación en Tabla Temporal (en_espera)
                const [temporales] = await db.query(
                    'SELECT COUNT(*) as total FROM pacientes_cita_temporal WHERE fecha_cita_asignada = ? AND estatus = "en_espera"',
                    [fechaStr]
                );

                // 3. Contar los que ya asignamos en este mismo ciclo de Excel (en memoria)
                const enMemoria = pacientesParaInsertar.filter(p => p.fecha_cita_asignada === fechaStr).length;

                const totalOcupado = (oficiales[0].total || 0) + (temporales[0].total || 0) + enMemoria;

                if (totalOcupado < limite) {
                    pacientesParaInsertar.push({
                        codificacion_buen_gobierno: filaLimpia['CODIGO 1X10'] || null,
                        cedula: filaLimpia['CEDULA'],
                        primer_nombre: filaLimpia['PRIMER NOMBRE'],
                        segundo_nombre: filaLimpia['SEGUNDO NOMBRE'] || null,
                        primer_apellido: filaLimpia['PRIMER APELLIDO'],
                        segundo_apellido: filaLimpia['SEGUNDO APELLIDO'] || null,
                        telefono: filaLimpia['CONTACTO'] || filaLimpia['TELEFONO'],
                        direccion: filaLimpia['DIRECCION'] || null,
                        estado: filaLimpia['ESTADO'] || null,
                        municipio: filaLimpia['MUNICIPIO'] || null,
                        correo: filaLimpia['CORREO ELECTRONICO'] || null,
                        fecha_cita_asignada: fechaStr
                    });
                    asignado = true;
                } else {
                    // Si el día está lleno, pasar al siguiente día y re-evaluar
                    fechaCursor = sumarDias(fechaCursor, 1);
                }
                intentos++;
            }
        }

        // --- INSERCIÓN FINAL ---
        if (pacientesParaInsertar.length > 0) {
            const values = pacientesParaInsertar.map(p => [
                p.codificacion_buen_gobierno, p.cedula, p.primer_nombre, p.segundo_nombre,
                p.primer_apellido, p.segundo_apellido, p.telefono, p.direccion,
                p.estado, p.municipio, p.correo, p.fecha_cita_asignada
            ]);

            await db.query(
                `INSERT INTO pacientes_cita_temporal 
                (codificacion_buen_gobierno, cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, telefono, direccion, estado, municipio, correo, fecha_cita_asignada) 
                VALUES ?`,
                [values]
            );
        }

        res.json({
            msg: 'Proceso terminado exitosamente',
            cantidad: pacientesParaInsertar.length
        });

    } catch (error) {
        console.error("Error en subirExcelTemporal:", error);
        res.status(500).json({ msg: 'Error interno del servidor', error: error.message });
    }
};

const obtenerPacientesTemporales = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM pacientes_cita_temporal WHERE estatus = "en_espera" ORDER BY fecha_cita_asignada ASC'
        );
        res.json({ status: rows.length > 0, data: rows });
    } catch (error) {
        res.status(500).json({ status: false, msg: 'Error al obtener datos' });
    }
};

module.exports = { subirExcelTemporal, obtenerPacientesTemporales };