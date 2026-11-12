const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const {
  crearMembresia,
  listarMembresias,
  actualizarMembresia,
  eliminarMembresia,
  pausarMembresia,
  reactivarMembresia,
  marcarMembresiaPagada,
} = require('../controllers/membresias.controller');

const router = Router();

router.use(authMiddleware);

router.post('/', crearMembresia);
router.get('/', listarMembresias);
router.put('/:id', actualizarMembresia);
router.delete('/:id', eliminarMembresia);
router.post('/:id/pausar', pausarMembresia);
router.post('/:id/reactivar', reactivarMembresia);
router.post('/:id/pagada', marcarMembresiaPagada);

module.exports = router;

