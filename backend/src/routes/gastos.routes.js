const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const {
  crearGasto,
  listarGastos,
  actualizarGasto,
  eliminarGasto,
} = require('../controllers/gastos.controller');

const router = Router();

router.use(authMiddleware);

router.post('/', crearGasto);
router.get('/', listarGastos);
router.put('/:id', actualizarGasto);
router.delete('/:id', eliminarGasto);

module.exports = router;

