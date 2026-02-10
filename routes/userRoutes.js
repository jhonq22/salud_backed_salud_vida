const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Rutas públicas
router.post('/login', userController.login);

// Rutas CRUD
router.get('/', userController.getUsers);
router.post('/register', userController.createUser);

// Ruta para obtener roles (lista)
router.get('/roles', userController.getRoles);

module.exports = router;