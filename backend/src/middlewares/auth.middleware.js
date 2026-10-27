const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Verificar que exista el encabezado "Authorization: Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'NO_AUTORIZADO',
        message: 'Token no proporcionado o formato inválido',
      },
    });
  }

  // Extraer el token quitando la palabra "Bearer "
  const token = authHeader.split(' ')[1];

  try {
    // 2. Verificar que el token sea válido y no haya expirado
    const decoded = jwt.verify(token, jwtSecret);

    // 3. Guardar el id del usuario en la petición y continuar
    req.usuario = { id: decoded.id };
    return next();
  } catch {
    return res.status(401).json({
      error: {
        code: 'NO_AUTORIZADO',
        message: 'El token es inválido o ha expirado',
      },
    });
  }
};

// Se exporta directo para poder usar router.use(authMiddleware) en otras rutas
module.exports = authMiddleware;
