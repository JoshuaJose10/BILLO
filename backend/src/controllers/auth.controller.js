const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/index');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const {
  DURACION_TOKEN_MS,
  generarTokenRecuperacion,
  hashearTokenRecuperacion,
  registrarSolicitudRecuperacion,
  enviarCorreoRecuperacion,
} = require('../services/recuperacion.service');

// REGISTRO DE USUARIOS EN EL SISTEMA
const register = async (req, res) => {
  try {
    const { nombre, email, password } =
      req.body && typeof req.body === 'object' ? req.body : {};

    // 1. Validaciones básicas
    if (typeof nombre !== 'string' || nombre.trim() === '') {
      return res.status(400).json({
        error: {
          code: 'NOMBRE_REQUERIDO',
          message: 'El nombre es obligatorio',
        },
      });
    }

    const emailNormalizado =
      typeof email === 'string' ? email.trim().toLowerCase() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNormalizado)) {
      return res.status(400).json({
        error: {
          code: 'EMAIL_INVALIDO',
          message: 'El formato del correo no es válido',
        },
      });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        error: {
          code: 'PASSWORD_MUY_CORTA',
          message: 'La contraseña debe tener al menos 8 caracteres',
        },
      });
    }

    // 2. Verificar si el correo ya existe
    const userExist = await pool.query(
      'SELECT id FROM usuarios WHERE LOWER(email) = $1',
      [emailNormalizado]
    );
    if (userExist.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'EMAIL_DUPLICADO',
          message: 'El correo ya está registrado',
        },
      });
    }

    // 3. Cifrar la contraseña
    const hash = await bcrypt.hash(password, 10);

    // 4. Insertar en la base de datos de forma segura (parametrizada)
    const insertQuery = `
      INSERT INTO usuarios (nombre, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, nombre, email, rol
    `;
    const result = await pool.query(insertQuery, [
      nombre,
      emailNormalizado,
      hash,
    ]);

    // 5. Generar el JWT firmado y responder con { usuario, token }
    const newUser = result.rows[0];
    const token = jwt.sign(
      { id: newUser.id, rol: newUser.rol },
      jwtSecret,
      {
        expiresIn: jwtExpiresIn,
      }
    );

    return res.status(201).json({
      usuario: {
        id: newUser.id,
        nombre: newUser.nombre,
        email: newUser.email,
      },
      token,
    });
  } catch (error) {
    console.error('Error en el registro:', error);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'Error interno del servidor',
      },
    });
  }
};

// INICIO DE SESION DE USUARIOS EN EL SISTEMA
const login = async (req, res) => {
  try {
    const { email, password } =
      req.body && typeof req.body === 'object' ? req.body : {};

    // Validación básica de entrada
    if (
      typeof email !== 'string' ||
      email.trim() === '' ||
      typeof password !== 'string' ||
      password === ''
    ) {
      return res.status(400).json({
        error: {
          code: 'CAMPOS_REQUERIDOS',
          message: 'El correo y la contraseña son obligatorios',
        },
      });
    }

    // 1. Buscar al usuario por correo
    const query =
      'SELECT id, nombre, email, password_hash, rol FROM usuarios WHERE LOWER(email) = $1';
    const result = await pool.query(query, [email.trim().toLowerCase()]);

    const user = result.rows[0];

    // 2. Si el usuario no existe, retornar 401 genérico
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'CREDENCIALES_INVALIDAS',
          message: 'Correo o contraseña incorrectos',
        },
      });
    }

    // 3. Comparar la contraseña con el hash
    const isMatch = await bcrypt.compare(password, user.password_hash);

    // Si la contraseña no coincide, retornar exactamente el mismo 401
    if (!isMatch) {
      return res.status(401).json({
        error: {
          code: 'CREDENCIALES_INVALIDAS',
          message: 'Correo o contraseña incorrectos',
        },
      });
    }

    // 4. Generar el JWT firmado
    const token = jwt.sign({ id: user.id, rol: user.rol }, jwtSecret, {
      expiresIn: jwtExpiresIn,
    });

    // 5. Responder 200 con el token y datos públicos del usuario
    return res.status(200).json({
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
      token,
    });
  } catch (error) {
    console.error('Error en el login:', error);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'Ocurrió un error inesperado en el servidor',
      },
    });
  }
};

// DEVOLVER USUARIO POR MEDIO DE TOKEN
const profile = async (req, res) => {
  try {
    const { id } = req.usuario;

    // Buscar los datos públicos del usuario
    const query = 'SELECT id, nombre, email FROM usuarios WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'USUARIO_NO_ENCONTRADO',
          message: 'El usuario no existe',
        },
      });
    }

    // Responder 200 con { id, nombre, email }
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener el perfil:', error);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'Ocurrió un error inesperado en el servidor',
      },
    });
  }
};

// SOLICITAR RECUPERACIÓN DE CONTRASEÑA (POST /auth/olvide-contrasena)
const olvideContrasena = async (req, res) => {
  try {
    const { email } =
      req.body && typeof req.body === 'object' ? req.body : {};

    const emailNormalizado =
      typeof email === 'string' ? email.trim().toLowerCase() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNormalizado)) {
      return res.status(400).json({
        error: {
          code: 'EMAIL_INVALIDO',
          message: 'El formato del correo no es válido',
        },
      });
    }

    // Límite de solicitudes por correo (se evalúa igual exista o no la cuenta)
    if (!registrarSolicitudRecuperacion(emailNormalizado)) {
      return res.status(429).json({
        error: {
          code: 'DEMASIADAS_SOLICITUDES',
          message:
            'Has superado el límite de solicitudes para este correo. Intenta más tarde.',
        },
      });
    }

    const respuestaGenerica = {
      enviado: true,
      message:
        'Si el correo está registrado, recibirás un código para restablecer tu contraseña',
    };

    const userRes = await pool.query(
      'SELECT id, nombre, email FROM usuarios WHERE LOWER(email) = $1',
      [emailNormalizado]
    );

    if (userRes.rows.length === 0) {
      return res.status(200).json(respuestaGenerica);
    }

    const user = userRes.rows[0];
    let token = generarTokenRecuperacion();
    let tokenHash = hashearTokenRecuperacion(token);

    // Garantizar que ningún otro usuario tenga activo el mismo hash
    for (let intento = 0; intento < 5; intento++) {
      const colision = await pool.query(
        'SELECT 1 FROM usuarios WHERE reset_token_hash = $1 AND id <> $2',
        [tokenHash, user.id]
      );
      if (colision.rows.length === 0) break;
      token = generarTokenRecuperacion();
      tokenHash = hashearTokenRecuperacion(token);
    }

    const expiraEn = new Date(Date.now() + DURACION_TOKEN_MS);

    await pool.query(
      `UPDATE usuarios
       SET reset_token_hash = $1,
           reset_token_expira = $2
       WHERE id = $3`,
      [tokenHash, expiraEn, user.id]
    );

    await enviarCorreoRecuperacion({
      email: user.email,
      nombre: user.nombre,
      token,
    });

    return res.status(200).json(respuestaGenerica);
  } catch (error) {
    console.error('Error en olvideContrasena:', error);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'Ocurrió un error inesperado en el servidor',
      },
    });
  }
};

// RESTABLECER CONTRASEÑA CON TOKEN DE UN SOLO USO (POST /auth/restablecer-contrasena)
const restablecerContrasena = async (req, res) => {
  try {
    const { token, codigo, password, nueva_password, email } =
      req.body && typeof req.body === 'object' ? req.body : {};

    const tokenRecibido =
      typeof token === 'string'
        ? token.trim()
        : typeof codigo === 'string'
          ? codigo.trim()
          : '';
    const nuevaPassword =
      typeof password === 'string' ? password : nueva_password;

    if (tokenRecibido === '') {
      return res.status(400).json({
        error: {
          code: 'TOKEN_INVALIDO',
          message: 'El código o token de recuperación es inválido o ha expirado',
        },
      });
    }

    if (typeof nuevaPassword !== 'string' || nuevaPassword.length < 8) {
      return res.status(400).json({
        error: {
          code: 'PASSWORD_MUY_CORTA',
          message: 'La contraseña debe tener al menos 8 caracteres',
        },
      });
    }

    const emailFiltro =
      typeof email === 'string' && email.trim() !== ''
        ? email.trim().toLowerCase()
        : null;
    const tokenHash = hashearTokenRecuperacion(tokenRecibido);

    const userRes = await pool.query(
      `SELECT id, reset_token_expira
       FROM usuarios
       WHERE reset_token_hash = $1
         AND ($2::text IS NULL OR LOWER(email) = $2)`,
      [tokenHash, emailFiltro]
    );

    const user = userRes.rows[0];
    const ahoraMs = Date.now();
    const expiraMs = user?.reset_token_expira
      ? new Date(user.reset_token_expira).getTime()
      : 0;

    if (!user || !Number.isFinite(expiraMs) || expiraMs <= ahoraMs) {
      return res.status(400).json({
        error: {
          code: 'TOKEN_INVALIDO',
          message: 'El código o token de recuperación es inválido o ha expirado',
        },
      });
    }

    const nuevoHash = await bcrypt.hash(nuevaPassword, 10);

    const updateRes = await pool.query(
      `UPDATE usuarios
       SET password_hash = $1,
           reset_token_hash = NULL,
           reset_token_expira = NULL
       WHERE id = $2
         AND reset_token_hash = $3
       RETURNING id`,
      [nuevoHash, user.id, tokenHash]
    );

    if (updateRes.rowCount === 0) {
      return res.status(400).json({
        error: {
          code: 'TOKEN_INVALIDO',
          message: 'El código o token de recuperación es inválido o ha expirado',
        },
      });
    }

    return res.status(200).json({
      restablecida: true,
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error) {
    console.error('Error en restablecerContrasena:', error);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'Ocurrió un error inesperado en el servidor',
      },
    });
  }
};

// ELIMINAR CUENTA Y TODOS LOS DATOS (DELETE /auth/cuenta) — HU-68
const eliminarCuenta = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { password } =
      req.body && typeof req.body === 'object' ? req.body : {};

    if (typeof password !== 'string' || password === '') {
      return res.status(401).json({
        error: {
          code: 'PASSWORD_INCORRECTA',
          message: 'Contraseña incorrecta',
        },
      });
    }

    const userRes = await pool.query(
      'SELECT id, password_hash FROM usuarios WHERE id = $1',
      [usuarioId]
    );

    const user = userRes.rows[0];
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USUARIO_NO_ENCONTRADO',
          message: 'Usuario no encontrado',
        },
      });
    }

    const coincide = await bcrypt.compare(password, user.password_hash);
    if (!coincide) {
      return res.status(401).json({
        error: {
          code: 'PASSWORD_INCORRECTA',
          message: 'Contraseña incorrecta',
        },
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM gastos WHERE usuario_id = $1', [usuarioId]);
      await client.query('DELETE FROM presupuestos WHERE usuario_id = $1', [
        usuarioId,
      ]);
      await client.query('DELETE FROM membresias WHERE usuario_id = $1', [
        usuarioId,
      ]);
      await client.query('DELETE FROM usuarios WHERE id = $1', [usuarioId]);
      await client.query('COMMIT');
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }

    return res.status(200).json({ eliminado: true });
  } catch (error) {
    console.error('Error al eliminar cuenta:', error);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo eliminar la cuenta',
      },
    });
  }
};

module.exports = {
  register,
  login,
  profile,
  olvideContrasena,
  restablecerContrasena,
  eliminarCuenta,
};
