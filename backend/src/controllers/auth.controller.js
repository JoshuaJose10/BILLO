const bcrypt = require('bcryptjs');
const { pool } = require('../db/index');

const register = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    // 1. Validaciones básicas
    if (!nombre || nombre.trim() === '') {
      return res.status(400).json({
        error: { code: 'NOMBRE_REQUERIDO', message: 'El nombre es obligatorio' }
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: { code: 'EMAIL_INVALIDO', message: 'El formato del correo no es válido' }
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        error: { code: 'PASSWORD_MUY_CORTA', message: 'La contraseña debe tener al menos 8 caracteres' }
      });
    }

    // 2. Verificar si el correo ya existe
    const userExist = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (userExist.rows.length > 0) {
      return res.status(409).json({
        error: { code: 'EMAIL_DUPLICADO', message: 'El correo ya está registrado' }
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
    const result = await pool.query(insertQuery, [nombre, email, hash]);

    // 5. Responder con los datos del usuario creado (sin contraseña)
    const newUser = result.rows[0];
    res.status(201).json(newUser);

  } catch (error) {
    console.error('Error en el registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { register };