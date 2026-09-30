// src/db/index.js
const { Pool } = require('pg');
const config = require('../config/env');

const pool = new Pool(config.db);

// Función para testear la conexión al iniciar
const testConnection = async () => {
  try {
    // Realizamos una consulta liviana que retorna la hora actual de la BD
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Conexión exitosa a PostgreSQL:', res.rows[0].now);
  } catch (err) {
    console.error('❌ Error al conectar a PostgreSQL:', err.message);
  }
};

module.exports = { pool, testConnection };