const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// REGISTRO
router.post('/register', authController.register);
// INICIO DE SESION
router.post('/login', authController.login);
// RECUPERACION DE CONTRASENA (rutas oficiales y alias cortos)
router.post('/olvide-contrasena', authController.olvideContrasena);
router.post('/olvide', authController.olvideContrasena);
router.post('/restablecer-contrasena', authController.restablecerContrasena);
router.post('/restablecer', authController.restablecerContrasena);
// PERFIL (ruta oficial /perfil y alias temporal /profile)
router.get('/perfil', authMiddleware, authController.profile);
router.get('/profile', authMiddleware, authController.profile);
// ELIMINAR CUENTA (HU-68)
router.delete('/cuenta', authMiddleware, authController.eliminarCuenta);

module.exports = router;
