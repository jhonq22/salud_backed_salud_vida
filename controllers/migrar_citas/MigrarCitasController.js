const xlsx = require('xlsx');
const db = require('../../config/db');

const sumarDias = (fecha, dias) => {
    const res = new Date(fecha);
    res.setDate(res.getDate() + dias);
    return res;
};

const fechaSQL = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const subirExcelTemporal = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ msg: 'Falta el archivo Excel' });

        // --- DEPURACIÓN: LEER ARCHIVO ---
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convertimos a JSON
        const datosRaw = xlsx.utils.sheet_to_json(sheet);

        // ==========================================
        // 🔥 CONSOLE LOGS DE DEPURACIÓN 🔥
        // ==========================================
        console.log("--- INICIO DEPURACIÓN EXCEL ---");
        console.log("Nombre de la hoja detectada:", sheetName);
        console.log("Cantidad de filas detectadas:", datosRaw.length);

        if (datosRaw.length > 0) {
            console.log("Columnas detectadas en la primera fila:", Object.keys(datosRaw[0]));
            console.log("Contenido de la primera fila:", JSON.stringify(datosRaw[0], null, 2));
        } else {
            console.log("⚠️ EL EXCEL NO TIENE DATOS O LOS ENCABEZADOS NO ESTÁN EN LA FILA 1");
        }
        console.log("--- FIN DEPURACIÓN EXCEL ---");
        // ==========================================

        if (datosRaw.length === 0) {
            return res.status(200).json({
                msg: 'El servidor leyó el archivo pero no encontró datos.',
                debug_info: "Asegúrate que los datos empiecen en la fila 1 del Excel"
            });
        }

        const [config] = await db.query('SELECT * FROM configuracion_dias');
        const cuposPorDia = {};
        config.forEach(c => cuposPorDia[c.dia_semana] = c.cupos_maximos);

        let fechaCursor = new Date();
        const pacientesParaInsertar = [];

        for (const fila of datosRaw) {
            // Limpieza agresiva de llaves
            const filaLimpia = {};
            Object.keys(fila).forEach(key => {
                const keyNormalizada = key.toString().trim().toUpperCase();
                filaLimpia[keyNormalizada] = fila[key];
            });

            let asignado = false;
            let intentos = 0;

            while (!asignado && intentos < 365) {
                const diaSemana = fechaCursor.getDay();
                const fechaStr = fechaSQL(fechaCursor);
                const limite = cuposPorDia[diaSemana] || 0;

                if (limite === 0) {
                    fechaCursor = sumarDias(fechaCursor, 1);
                    intentos++;
                    continue;
                }

                const [[oficiales], [temporales]] = await Promise.all([
                    db.query('SELECT COUNT(*) as total FROM registrar_solicitud_pacientes WHERE fecha_cita = ?', [fechaStr]),
                    db.query('SELECT COUNT(*) as total FROM pacientes_cita_temporal WHERE fecha_cita_asignada = ? AND estatus = "en_espera"', [fechaStr])
                ]);

                const enMemoria = pacientesParaInsertar.filter(p => p.fecha_cita_asignada === fechaStr).length;
                const totalOcupado = (oficiales?.total || 0) + (temporales?.total || 0) + enMemoria;

                if (totalOcupado < limite) {
                    // Verificamos si la cédula existe en la fila procesada
                    if (filaLimpia['CEDULA']) {
                        pacientesParaInsertar.push({
                            cedula: filaLimpia['CEDULA'],
                            p_nombre: filaLimpia['PRIMER NOMBRE'],
                            s_nombre: filaLimpia['SEGUNDO NOMBRE'] || null,
                            p_apellido: filaLimpia['PRIMER APELLIDO'],
                            s_apellido: filaLimpia['SEGUNDO APELLIDO'] || null,
                            telefono: filaLimpia['TELEFONO'],
                            correo: filaLimpia['CORREO ELECTRONICO'],
                            fecha_cita_asignada: fechaStr
                        });
                        asignado = true;
                    } else {
                        // Si no hay cédula, saltamos esta fila para evitar basura
                        asignado = true;
                    }
                } else {
                    fechaCursor = sumarDias(fechaCursor, 1);
                }
                intentos++;
            }
        }

        if (pacientesParaInsertar.length > 0) {
            const values = pacientesParaInsertar.map(p => [
                p.cedula, p.p_nombre, p.s_nombre, p.p_apellido, p.s_apellido, p.telefono, p.correo, p.fecha_cita_asignada
            ]);

            await db.query(
                `INSERT INTO pacientes_cita_temporal 
                (cedula, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, telefono, correo, fecha_cita_asignada) 
                VALUES ?`,
                [values]
            );
        }

        res.json({
            msg: 'Proceso terminado',
            cantidad: pacientesParaInsertar.length,
            data: pacientesParaInsertar
        });

    } catch (error) {
        console.error("❌ ERROR CRÍTICO:", error);
        res.status(500).json({ msg: 'Error interno', error: error.message });
    }
};


const obtenerPacientesTemporales = async (req, res) => {
    try {
        // Consultamos solo los que están pendientes de procesar
        const [rows] = await db.query(
            'SELECT * FROM pacientes_cita_temporal WHERE estatus = "en_espera" ORDER BY fecha_cita_asignada ASC'
        );

        res.json({
            status: rows.length > 0, // true si hay data, false si está vacío
            msg: 'Lista de pacientes temporales obtenida',
            data: rows
        });
    } catch (error) {
        console.error("Error al obtener temporales:", error);
        res.status(500).json({
            status: false,
            msg: 'Error al obtener los datos de la tabla temporal'
        });
    }
};



module.exports = { subirExcelTemporal, obtenerPacientesTemporales };