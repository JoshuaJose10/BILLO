const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/index');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

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
      RETURNING id, nombre, email
    `;
    const result = await pool.query(insertQuery, [
      nombre,
      emailNormalizado,
      hash,
    ]);

    // 5. Generar el JWT firmado y responder con { usuario, token }
    const newUser = result.rows[0];
    const token = jwt.sign({ id: newUser.id }, jwtSecret, {
      expiresIn: jwtExpiresIn,
    });

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
      'SELECT id, nombre, email, password_hash FROM usuarios WHERE LOWER(email) = $1';
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
    const token = jwt.sign({ id: user.id }, jwtSecret, {
      expiresIn: jwtExpiresIn,
    });

    // 5. Responder 200 con el token y datos públicos del usuario
    return res.status(200).json({
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
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

module.exports = { register, login, profile };
