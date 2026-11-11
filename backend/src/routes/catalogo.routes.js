const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');
const {
  listarCatalogo,
  crearServicio,
  actualizarServicio,
  eliminarServicio,
} = require('../controllers/catalogo.controller');

const router = Router();

router.get('/', authMiddleware, listarCatalogo);
router.post('/', authMiddleware, adminMiddleware, crearServicio);
router.put('/:id', authMiddleware, adminMiddleware, actualizarServicio);
router.delete('/:id', authMiddleware, adminMiddleware, eliminarServicio);

module.exports = router;
