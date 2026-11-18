const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { exportarDatos } = require('../controllers/exportar.controller');

const router = Router();

router.use(authMiddleware);

router.get('/', exportarDatos);

module.exports = router;
