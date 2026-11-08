const { pool } = require('../db');

const EXPO_PUSH_TOKEN_REGEX =
  /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

const esTokenPushValido = (token) => {
  return (
    typeof token === 'string' &&
    token.length <= 255 &&
    EXPO_PUSH_TOKEN_REGEX.test(token)
  );
};

// POST /notificaciones/token
const registrarTokenPush = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { expo_push_token } =
      req.body && typeof req.body === 'object' ? req.body : {};

    const tokenNormalizado =
      typeof expo_push_token === 'string' ? expo_push_token.trim() : '';

    if (!esTokenPushValido(tokenNormalizado)) {
      return res.status(400).json({
        error: {
          code: 'TOKEN_PUSH_INVALIDO',
          message: 'El token de notificaciones push no es válido',
        },
      });
    }

    const updateQuery = `
      UPDATE usuarios
      SET expo_push_token = $1
      WHERE id = $2
      RETURNING id
    `;

    const { rows } = await pool.query(updateQuery, [
      tokenNormalizado,
      usuarioId,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'USUARIO_NO_ENCONTRADO',
          message: 'El usuario no existe',
        },
      });
    }

    return res.status(200).json({ registrado: true });
  } catch (error) {
    console.error('Error al registrar token push:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo registrar el token de notificaciones',
      },
    });
  }
};

module.exports = {
  registrarTokenPush,
  esTokenPushValido,
};
