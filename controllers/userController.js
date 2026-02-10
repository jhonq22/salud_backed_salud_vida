const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. LOGIN
const login = async (req, res) => {
    const { usuario, password } = req.body;
    try {
        // 1. Incluimos u.rol_id en el SELECT
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

        // Generar Token (Incluimos rol_id en el payload por si lo necesitas en el middleware de auth)
        const token = jwt.sign(
            { id: user.id, rol: user.rol, rol_id: user.rol_id, idPaciente: idPaciente },
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
                rol_id: user.rol_id, // <--- CAMBIO CLAVE: Ahora el frontend sabe que es 2, 3 o 4
                idPaciente: idPaciente
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. CRUD: Crear Usuario (con Hash de password)
const createUser = async (req, res) => {
    const { usuario, password, nombres, rol_id } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO users (usuario, password, nombres, rol_id) VALUES (?, ?, ?, ?)',
            [usuario, hashedPassword, nombres, rol_id]
        );
        res.status(201).json({ message: 'Usuario creado', id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Obtener Usuarios
const getUsers = async (req, res) => {
    const [rows] = await db.query('SELECT u.id, u.usuario, u.nombres, r.rol FROM users u LEFT JOIN roles r ON u.rol_id = r.id');
    res.json(rows);
};

// 4. Ver Roles (Solo lectura para consumir la lista)
const getRoles = async (req, res) => {
    const [rows] = await db.query('SELECT * FROM roles WHERE estatus = 1');
    res.json(rows);
};

module.exports = { login, createUser, getUsers, getRoles };