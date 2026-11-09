const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { obtenerTipoCambio } = require('../controllers/tipoCambio.controller');

const router = Router();

router.use(authMiddleware);

router.get('/tipo-cambio', obtenerTipoCambio);

module.exports = router;
