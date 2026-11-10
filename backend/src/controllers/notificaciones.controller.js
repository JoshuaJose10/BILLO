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

// Token del body ya recortado, o null si no es un token de Expo válido.
const leerTokenPush = (body) => {
  const { expo_push_token } = body && typeof body === 'object' ? body : {};
  const token =
    typeof expo_push_token === 'string' ? expo_push_token.trim() : '';
  return esTokenPushValido(token) ? token : null;
};

const responderTokenInvalido = (res) =>
  res.status(400).json({
    error: {
      code: 'TOKEN_PUSH_INVALIDO',
      message: 'El token de notificaciones push no es válido',
    },
  });

// POST /notificaciones/token
// Un token identifica un teléfono, así que pertenece a una sola cuenta: si otra cuenta lo tenía
// (cambio de usuario en el mismo teléfono), se le quita en la misma transacción (migración 013).
const registrarTokenPush = async (req, res) => {
  const tokenNormalizado = leerTokenPush(req.body);
  if (!tokenNormalizado) return responderTokenInvalido(res);

  const usuarioId = req.usuario.id;
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    // Serializa los registros del mismo token: sin esto, dos cuentas que lo registran a la vez
    // chocarían con el índice único en lugar de quedar la última como dueña.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      tokenNormalizado,
    ]);
    await client.query(
      'UPDATE usuarios SET expo_push_token = NULL WHERE expo_push_token = $1 AND id <> $2',
      [tokenNormalizado, usuarioId]
    );
    const { rows } = await client.query(
      'UPDATE usuarios SET expo_push_token = $1 WHERE id = $2 RETURNING id',
      [tokenNormalizado, usuarioId]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: {
          code: 'USUARIO_NO_ENCONTRADO',
          message: 'El usuario no existe',
        },
      });
    }

    await client.query('COMMIT');
    return res.status(200).json({ registrado: true });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Error al registrar token push:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo registrar el token de notificaciones',
      },
    });
  } finally {
    if (client) client.release();
  }
};

// DELETE /notificaciones/token
// Al cerrar sesión la app desvincula su token. Solo se borra si es el que tiene el usuario
// autenticado: si ya lo tomó otra cuenta o ya se había borrado, responde igual sin cambios.
const eliminarTokenPush = async (req, res) => {
  const tokenNormalizado = leerTokenPush(req.body);
  if (!tokenNormalizado) return responderTokenInvalido(res);

  try {
    await pool.query(
      'UPDATE usuarios SET expo_push_token = NULL WHERE id = $1 AND expo_push_token = $2',
      [req.usuario.id, tokenNormalizado]
    );
    return res.status(200).json({ eliminado: true });
  } catch (error) {
    console.error('Error al eliminar token push:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo eliminar el token de notificaciones',
      },
    });
  }
};

module.exports = {
  registrarTokenPush,
  eliminarTokenPush,
  esTokenPushValido,
};
