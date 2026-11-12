const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const {
  crearIngreso,
  listarIngresos,
  actualizarIngreso,
  eliminarIngreso,
} = require('../controllers/ingresos.controller');

const router = Router();

router.use(authMiddleware);

router.post('/', crearIngreso);
router.get('/', listarIngresos);
router.put('/:id', actualizarIngreso);
router.delete('/:id', eliminarIngreso);

module.exports = router;
