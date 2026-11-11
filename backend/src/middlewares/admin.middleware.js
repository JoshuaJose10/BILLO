const adminMiddleware = (req, res, next) => {
  if (!req.usuario || req.usuario.rol !== 'admin') {
    return res.status(403).json({
      error: {
        code: 'PROHIBIDO',
        message: 'Acceso exclusivo para administradores',
      },
    });
  }
  return next();
};

module.exports = adminMiddleware;
