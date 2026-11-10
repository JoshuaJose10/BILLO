const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const {
  registrarTokenPush,
  eliminarTokenPush,
} = require('../controllers/notificaciones.controller');

const router = Router();

router.use(authMiddleware);

router.post('/token', registrarTokenPush);
router.delete('/token', eliminarTokenPush);

module.exports = router;
