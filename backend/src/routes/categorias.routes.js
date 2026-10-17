const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { listarCategorias } = require('../controllers/categorias.controller');

const router = Router();

router.get('/', authMiddleware, listarCategorias);

module.exports = router;