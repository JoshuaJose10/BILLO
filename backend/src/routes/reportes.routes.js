const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const {
  obtenerGastosPorCategoria,
} = require('../controllers/reportes.controller');

const router = Router();

router.use(authMiddleware);

router.get('/por-categoria', obtenerGastosPorCategoria);

module.exports = router;

