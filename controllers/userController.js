const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. LOGIN
const login = async (req, res) => {
    const { usuario, password } = req.body;
    try {
        // Incluimos u.centro_salud_id en el SELECT
        const [rows] = await db.query(
            'SELECT u.*, r.rol FROM users u JOIN roles r ON u.rol_id = r.id WHERE u.usuario = ?',
            [usuario]
        );

        if (rows.length === 0) return res.status(404).json({ message: 'Usuario no encontrado' });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) return res.status(401).json({ message: 'Contraseña incorrecta' });

        // --- LÓGICA PACIENTE ---
        const [pacienteRows] = await db.query('SELECT id FROM pacientes WHERE paciente_id = ? LIMIT 1', [user.id]);
        const idPaciente = pacienteRows.length > 0 ? pacienteRows[0].id : null;

        // Generar Token
        // Agregamos centro_salud_id al payload para que el middleware pueda usarlo si es necesario
        const token = jwt.sign(
            {
                id: user.id,
                rol: user.rol,
                rol_id: user.rol_id,
                idPaciente: idPaciente,
                centro_salud_id: user.centro_salud_id // <--- NUEVO
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
                centro_salud_id: user.centro_salud_id // <--- NUEVO
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. CRUD: Crear Usuario
const createUser = async (req, res) => {
    // Agregamos centro_salud_id que viene del body
    const { usuario, password, nombres, rol_id, centro_salud_id } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertamos el nuevo campo (puede ser null si el rol no lo requiere)
        const [result] = await db.query(
            'INSERT INTO users (usuario, password, nombres, rol_id, centro_salud_id) VALUES (?, ?, ?, ?, ?)',
            [usuario, hashedPassword, nombres, rol_id, centro_salud_id || null]
        );

        res.status(201).json({ message: 'Usuario creado', id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Obtener Usuarios
const getUsers = async (req, res) => {
    // Incluimos centro_salud_id en la lista para poder verlo en la tabla del admin
    const [rows] = await db.query(`
        SELECT u.id, u.usuario, u.nombres, u.centro_salud_id, r.rol, lcs.descripcion as centro_salud_nombre, u.estatus as estatus_usuario 
        FROM users u 
        LEFT JOIN roles r ON u.rol_id = r.id
        LEFT JOIN lista_centro_salud lcs ON u.centro_salud_id = lcs.id
    `);
    res.json(rows);
};

// 4. Actualizar Información (Nombre y Rol)
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { nombres, rol_id, centro_salud_id, usuario } = req.body;
    try {
        await db.query(
            'UPDATE users SET nombres = ?, rol_id = ?, centro_salud_id = ?, usuario = ? WHERE id = ?',
            [nombres, rol_id, centro_salud_id || null, usuario, id]
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

module.exports = { login, createUser, getUsers, updateUser, updatePassword, deleteUser, getRoles };