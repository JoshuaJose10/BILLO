const { Router } = require('express');
const { obtenerTipoCambio } = require('../controllers/tipoCambio.controller');

// EXPERIMENTAL (HU-23): sin authMiddleware para poder probarlo con curl durante el spike.
const router = Router();

router.get('/', obtenerTipoCambio);

module.exports = router;
