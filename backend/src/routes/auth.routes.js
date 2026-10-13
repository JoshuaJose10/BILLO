const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// REGISTRO
router.post('/register', authController.register);
// INICIO DE SESION
router.post('/login', authController.login);

module.exports = router;