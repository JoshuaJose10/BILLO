const bcrypt = require('bcryptjs');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarCredencialesAdmin({ email, password, nombre }) {
  const emailLimpio = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const passwordLimpia = typeof password === 'string' ? password : '';
  const nombreLimpio =
    typeof nombre === 'string' && nombre.trim() !== ''
      ? nombre.trim()
      : 'Administrador';

  if (!emailLimpio || !passwordLimpia) {
    throw new Error(
      'Faltan variables de entorno requeridas: debes definir ADMIN_EMAIL y ADMIN_PASSWORD.'
    );
  }

  if (!EMAIL_REGEX.test(emailLimpio)) {
    throw new Error('ADMIN_EMAIL no tiene un formato de correo válido.');
  }

  if (passwordLimpia.length < 8) {
    throw new Error('ADMIN_PASSWORD debe tener al menos 8 caracteres.');
  }

  return {
    email: emailLimpio,
    password: passwordLimpia,
    nombre: nombreLimpio,
  };
}

async function seedAdmin({
  email = process.env.ADMIN_EMAIL,
  password = process.env.ADMIN_PASSWORD,
  nombre = process.env.ADMIN_NOMBRE,
  closePool = true,
} = {}) {
  const datos = validarCredencialesAdmin({ email, password, nombre });
  const hash = await bcrypt.hash(datos.password, 10);

  const { pool } = require('./index');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existente = await client.query(
      'SELECT id FROM usuarios WHERE LOWER(email) = $1 FOR UPDATE',
      [datos.email]
    );

    let resultado;
    let creado = false;

    if (existente.rows.length > 0) {
      resultado = await client.query(
        `UPDATE usuarios
         SET nombre = $2,
             email = $3,
             password_hash = $4,
             rol = 'admin'
         WHERE id = $1
         RETURNING id, nombre, email, rol`,
        [existente.rows[0].id, datos.nombre, datos.email, hash]
      );
    } else {
      creado = true;
      resultado = await client.query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol)
         VALUES ($1, $2, $3, 'admin')
         RETURNING id, nombre, email, rol`,
        [datos.nombre, datos.email, hash]
      );
    }

    await client.query('COMMIT');
    return { usuario: resultado.rows[0], creado };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    if (closePool) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  require('dotenv').config({ quiet: true });
  seedAdmin()
    .then(({ usuario, creado }) => {
      const accion = creado ? 'creado' : 'actualizado/promovido';
      console.log(
        `OK Administrador ${accion}: ${usuario.email} (id=${usuario.id}, rol=${usuario.rol})`
      );
    })
    .catch((err) => {
      console.error(`Error al configurar administrador: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { seedAdmin, validarCredencialesAdmin };
