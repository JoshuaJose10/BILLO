const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const {
  obtenerGastosPorCategoria,
  obtenerResumenMensual,
  obtenerReporteIngresos,
  obtenerBalanceMensual,
} = require('../controllers/reportes.controller');

const router = Router();

router.use(authMiddleware);

router.get('/resumen', obtenerResumenMensual);
router.get('/por-categoria', obtenerGastosPorCategoria);
router.get('/ingresos', obtenerReporteIngresos);
router.get('/balance', obtenerBalanceMensual);

module.exports = router;
