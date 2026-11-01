const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const {
  crearPresupuesto,
  listarPresupuestos,
  actualizarPresupuesto,
  eliminarPresupuesto,
} = require('../controllers/presupuestos.controller');

const router = Router();

router.use(authMiddleware);

router.post('/', crearPresupuesto);
router.get('/', listarPresupuestos);
router.put('/:id', actualizarPresupuesto);
router.delete('/:id', eliminarPresupuesto);

module.exports = router;

