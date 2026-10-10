const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. LOGIN
const login = async (req, res) => {
    const { usuario, password } = req.body;
    try {
        // Hacemos un LEFT JOIN para traer roles_medico y los nuevos campos booleanos si existen
        const [rows] = await db.query(
            `SELECT u.*, r.rol, mrm.roles_medico, mrm.marcapaso, mrm.hemodinamia 
             FROM users u 
             JOIN roles r ON u.rol_id = r.id 
             LEFT JOIN multi_roles_medicos mrm ON u.id = mrm.usuario_id 
             WHERE u.usuario = ?`,
            [usuario]
        );

        if (rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) return res.status(401).json({ message: 'Contraseña incorrecta' });

        // --- LÓGICA PACIENTE ---
        const [pacienteRows] = await db.query('SELECT id FROM pacientes WHERE paciente_id = ? LIMIT 1', [user.id]);
        const idPaciente = pacienteRows.length > 0 ? pacienteRows[0].id : null;

        // Validamos y parseamos los roles del médico (por si la BD lo devuelve como texto)
        let multiRolesArray = [];
        if (user.rol_id === 4 && user.roles_medico) {
            multiRolesArray = typeof user.roles_medico === 'string' ? JSON.parse(user.roles_medico) : user.roles_medico;
        }

        // --- GESTIÓN DE CENTROS DE SALUD MÚLTIPLES ---
        let centrosSaludIds = [];
        if (user.centro_salud_id) {
            if (typeof user.centro_salud_id === 'string') {
                try {
                    const parsed = JSON.parse(user.centro_salud_id);
                    centrosSaludIds = Array.isArray(parsed) ? parsed : [parsed];
                } catch (e) {
                    centrosSaludIds = [user.centro_salud_id];
                }
            } else if (Array.isArray(user.centro_salud_id)) {
                centrosSaludIds = user.centro_salud_id;
            } else {
                centrosSaludIds = [user.centro_salud_id];
            }
        }

        centrosSaludIds = centrosSaludIds.map(id => Number(id)).filter(id => !isNaN(id) && id > 0);

        let centrosSaludDetalle = [];
        if (centrosSaludIds.length > 0) {
            const [centrosRows] = await db.query(
                `SELECT id, descripcion FROM lista_centro_salud WHERE id IN (?) AND estatus = 1`,
                [centrosSaludIds]
            );
            centrosSaludDetalle = centrosRows;
        }

        // Determinar centro activo:
        // Si tiene solo 1 hospital, se selecciona automáticamente ese ID.
        // Si tiene 2 o más y es médico (rol 4), centroActivo se deja null para requerir selección
        let centroActivo = null;
        if (centrosSaludIds.length === 1) {
            centroActivo = centrosSaludIds[0];
        } else if (centrosSaludIds.length > 1 && user.rol_id !== 4) {
            centroActivo = centrosSaludIds[0];
        }

        // Generar Token
        const token = jwt.sign(
            {
                id: user.id,
                rol: user.rol,
                rol_id: user.rol_id,
                idPaciente: idPaciente,
                centro_salud_id: centroActivo,
                centros_salud: centrosSaludDetalle,
                multi_roles: multiRolesArray,
                marcapaso: Boolean(user.marcapaso),
                hemodinamia: Boolean(user.hemodinamia)
            },
            process.env.JWT_SECRET || 'secret_key_123',
            { expiresIn: '8h' }
        );

        // Enviamos la respuesta al frontend
        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                usuario: user.usuario,
                nombres: user.nombres,
                rol: user.rol,
                rol_id: user.rol_id,
                idPaciente: idPaciente,
                centro_salud_id: centroActivo,
                centros_salud: centrosSaludDetalle,
                multi_roles: multiRolesArray,
                marcapaso: Boolean(user.marcapaso),
                hemodinamia: Boolean(user.hemodinamia)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Helper para normalizar centro_salud_id a JSON String
const normalizarCentroSalud = (centro_salud_id) => {
    if (!centro_salud_id) return null;
    let ids = [];
    if (Array.isArray(centro_salud_id)) {
        ids = centro_salud_id.map(c => (typeof c === 'object' && c !== null ? (c.value || c.id) : c));
    } else if (typeof centro_salud_id === 'object' && centro_salud_id !== null) {
        const single = centro_salud_id.value || centro_salud_id.id;
        if (single) ids = [single];
    } else if (typeof centro_salud_id === 'string' && centro_salud_id.startsWith('[')) {
        return centro_salud_id;
    } else {
        ids = [centro_salud_id];
    }
    const cleanIds = ids.map(Number).filter(id => !isNaN(id) && id > 0);
    return cleanIds.length > 0 ? JSON.stringify(cleanIds) : null;
};

// 2. CRUD: Crear Usuario
const createUser = async (req, res) => {
    const { usuario, password, nombres, rol_id, centro_salud_id } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const centrosJSON = normalizarCentroSalud(centro_salud_id);

        const [result] = await db.query(
            'INSERT INTO users (usuario, password, nombres, rol_id, centro_salud_id) VALUES (?, ?, ?, ?, ?)',
            [usuario, hashedPassword, nombres, rol_id, centrosJSON]
        );

        res.status(201).json({ message: 'Usuario creado', id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Obtener Usuarios
const getUsers = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                u.id, 
                u.usuario, 
                u.nombres, 
                u.rol_id, 
                u.centro_salud_id, 
                r.rol, 
                u.estatus as estatus_usuario,
                mrm.roles_medico,
                mrm.marcapaso,    
                mrm.hemodinamia   
            FROM users u 
            LEFT JOIN roles r ON u.rol_id = r.id
            LEFT JOIN multi_roles_medicos mrm ON u.id = mrm.usuario_id
        `);

        const [centros] = await db.query('SELECT id, descripcion FROM lista_centro_salud');
        const centrosMap = new Map(centros.map(c => [c.id, c.descripcion]));

        // Mapeamos los resultados para asegurar formatos correctos
        const formatRows = rows.map(user => {
            let parsedCentros = [];
            if (user.centro_salud_id) {
                if (typeof user.centro_salud_id === 'string') {
                    try {
                        const parsed = JSON.parse(user.centro_salud_id);
                        parsedCentros = Array.isArray(parsed) ? parsed : [parsed];
                    } catch (e) {
                        parsedCentros = [user.centro_salud_id];
                    }
                } else if (Array.isArray(user.centro_salud_id)) {
                    parsedCentros = user.centro_salud_id;
                } else {
                    parsedCentros = [user.centro_salud_id];
                }
            }
            parsedCentros = parsedCentros.map(Number).filter(id => !isNaN(id) && id > 0);

            const centroNombres = parsedCentros.map(id => centrosMap.get(id)).filter(Boolean);

            return {
                ...user,
                centros_salud_ids: parsedCentros,
                centro_salud_nombre: centroNombres.join(', ') || null,
                roles_medico: user.roles_medico
                    ? (typeof user.roles_medico === 'string' ? JSON.parse(user.roles_medico) : user.roles_medico)
                    : [],
                marcapaso: Boolean(user.marcapaso),
                hemodinamia: Boolean(user.hemodinamia)
            };
        });

        res.json(formatRows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. Actualizar Información (Nombre y Rol)
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { nombres, rol_id, centro_salud_id, usuario } = req.body;
    try {
        const centrosJSON = normalizarCentroSalud(centro_salud_id);
        await db.query(
            'UPDATE users SET nombres = ?, rol_id = ?, centro_salud_id = ?, usuario = ? WHERE id = ?',
            [nombres, rol_id, centrosJSON, usuario, id]
        );
        res.json({ message: 'Usuario actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. Actualizar solo Contraseña
const updatePassword = async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
        res.json({ message: 'Contraseña actualizada con éxito' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 6. Desactivar Usuario (Borrado Lógico)
const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE users SET estatus = 0 WHERE id = ?', [id]);
        res.json({ message: 'Usuario desactivado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 7. Ver Roles
const getRoles = async (req, res) => {
    const [rows] = await db.query('SELECT * FROM roles WHERE estatus = 1');
    res.json(rows);
};

// 8. Multi-roles
const agregarMultiRol = async (req, res) => {
    // 1. Extraemos los nuevos campos del body
    const { usuario_id, roles_medico, marcapaso, hemodinamia } = req.body;

    if (!usuario_id || !roles_medico) {
        return res.status(400).json({ message: "Faltan datos requeridos" });
    }

    try {
        // 2. Actualizamos la consulta para incluir las nuevas columnas
        const query = `
            INSERT INTO multi_roles_medicos (usuario_id, roles_medico, marcapaso, hemodinamia) 
            VALUES (?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
                roles_medico = VALUES(roles_medico),
                marcapaso = VALUES(marcapaso),
                hemodinamia = VALUES(hemodinamia)
        `;

        // 3. Pasamos los valores. Si vienen como undefined, se insertarán como NULL
        const [result] = await db.execute(query, [
            usuario_id,
            JSON.stringify(roles_medico),
            marcapaso !== undefined ? marcapaso : null,
            hemodinamia !== undefined ? hemodinamia : null
        ]);

        res.status(201).json({
            message: "Roles y especialidades actualizados correctamente",
            id: result.insertId || "updated"
        });
    } catch (error) {
        console.error("Error en agregarMultiRol:", error);
        res.status(500).json({ message: "Error al guardar los datos" });
    }
};

module.exports = { login, createUser, getUsers, updateUser, updatePassword, deleteUser, getRoles, agregarMultiRol };