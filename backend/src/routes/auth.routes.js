const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// REGISTRO
router.post('/register', authController.register);
// INICIO DE SESION
router.post('/login', authController.login);
//MIDDLEWARE
router.get('/profile', authMiddleware, authController.profile);

module.exports = router;