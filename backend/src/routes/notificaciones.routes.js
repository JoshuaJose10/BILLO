const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const {
  registrarTokenPush,
} = require('../controllers/notificaciones.controller');

const router = Router();

router.use(authMiddleware);

router.post('/token', registrarTokenPush);

module.exports = router;
