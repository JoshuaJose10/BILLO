const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { listarCatalogo } = require('../controllers/catalogo.controller');

const router = Router();

router.get('/', authMiddleware, listarCatalogo);

module.exports = router;
