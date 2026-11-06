const { Pool } = require('pg');
const config = require('../config/env');

const pool = new Pool(config.db);

// Un cliente inactivo del pool puede perder su conexión (reinicio de PostgreSQL, corte de red o
// una base eliminada). Sin este manejador, pg emite 'error' sin escucha y Node termina el proceso.
// El pool descarta ese cliente y abre otro en la siguiente consulta.
pool.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('⚠️  Conexión inactiva de PostgreSQL perdida:', err.message);
  }
});

// Función para testear la conexión al iniciar
const testConnection = async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Conexión exitosa a PostgreSQL:', res.rows[0].now);
  } catch (err) {
    console.error('❌ Error al conectar a PostgreSQL:', err.message);
  }
};

module.exports = { pool, testConnection };