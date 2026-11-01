const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const {
  crearMembresia,
  listarMembresias,
  actualizarMembresia,
  eliminarMembresia,
} = require('../controllers/membresias.controller');

const router = Router();

router.use(authMiddleware);

router.post('/', crearMembresia);
router.get('/', listarMembresias);
router.put('/:id', actualizarMembresia);
router.delete('/:id', eliminarMembresia);

module.exports = router;

