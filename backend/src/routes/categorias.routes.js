const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const {
  listarCategorias,
  listarCategoriasPredefinidas,
  actualizarSeleccionCategorias,
  crearCategoriaPropia,
  actualizarCategoriaPropia,
  eliminarCategoriaPropia,
} = require('../controllers/categorias.controller');

const router = Router();

router.get('/', authMiddleware, listarCategorias);
router.get('/predefinidas', authMiddleware, listarCategoriasPredefinidas);
router.put('/seleccion', authMiddleware, actualizarSeleccionCategorias);
router.post('/', authMiddleware, crearCategoriaPropia);
router.put('/:id', authMiddleware, actualizarCategoriaPropia);
router.delete('/:id', authMiddleware, eliminarCategoriaPropia);

module.exports = router;
