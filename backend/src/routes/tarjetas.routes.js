const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const {
  crearTarjeta,
  listarTarjetas,
  actualizarTarjeta,
  eliminarTarjeta,
  obtenerResumenTarjeta,
} = require('../controllers/tarjetas.controller');

const router = Router();

router.use(authMiddleware);

router.post('/', crearTarjeta);
router.get('/', listarTarjetas);
router.get('/:id/resumen', obtenerResumenTarjeta);
router.put('/:id', actualizarTarjeta);
router.delete('/:id', eliminarTarjeta);

module.exports = router;
