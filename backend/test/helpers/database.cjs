const path = require('node:path');
const { randomBytes } = require('node:crypto');
const assert = require('node:assert/strict');
const { Client } = require('pg');

// Nunca se migra, trunca ni elimina DB_NAME del entorno de desarrollo.
async function createDatabase() {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
  const database = `billo_test_${Date.now()}_${randomBytes(6).toString('hex')}`;
  assert.match(database, /^billo_test_\d+_[a-f0-9]{12}$/);
  const admin = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.TEST_ADMIN_DATABASE || 'postgres',
    connectionTimeoutMillis: 5000,
  });
  let created = false;
  let pool;
  async function close() {
    try {
      if (pool) await pool.end();
    } finally {
      try {
        if (created) await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
      } finally {
        await admin.end();
      }
    }
  }

  try {
    await admin.connect();
    const templateDb = process.env.TEST_TEMPLATE_DATABASE || 'template0';
    await admin.query(`CREATE DATABASE "${database}" TEMPLATE ${templateDb}`);
    created = true;
    process.env.DB_NAME = database;
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    process.env.JWT_EXPIRES_IN = '1h';
    // Configurar el destino antes de importar cualquier módulo de la app.
    ({ pool } = require('../../src/db'));
    pool.options.connectionTimeoutMillis = 5000;
    const initial = await pool.query(
      "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'"
    );
    assert.equal(initial.rows[0].count, 0, 'La base debe comenzar vacía');
    await require('../../src/db/migrate').migrate({ closePool: false });
    return { pool, close, app: require('../../src/app') };
  } catch (error) {
    await close();
    throw error;
  }
}

module.exports = { createDatabase };
