const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// REGISTRO
router.post('/register', authController.register);
// INICIO DE SESION
router.post('/login', authController.login);
// PERFIL (ruta oficial /perfil y alias temporal /profile)
router.get('/perfil', authMiddleware, authController.profile);
router.get('/profile', authMiddleware, authController.profile);

module.exports = router;
