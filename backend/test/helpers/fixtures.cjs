const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const {
  limpiarEstadoRecuperacion,
} = require('../../src/services/recuperacion.service');

const password = 'Segura123';

async function createFixtures(database) {
  // Mismo hash bcrypt que usa producción; se calcula una sola vez por ejecución.
  const hash = await bcrypt.hash(password, 10);
  const api = request(database.app);
  const categories = await database.pool.query('SELECT id FROM categorias ORDER BY id');
  assert.ok(categories.rows.length >= 2, 'Las migraciones deben cargar categorías');
  return {
    ...database,
    api,
    password,
    categoria: categories.rows[0].id,
    otraCategoria: categories.rows[1].id,
    async reset() {
      limpiarEstadoRecuperacion();
      await database.pool.query('TRUNCATE usuarios RESTART IDENTITY CASCADE');
      const { rows } = await database.pool.query(
        `INSERT INTO usuarios (nombre, email, password_hash) VALUES
          ('Usuario A', 'a@example.com', $1), ('Usuario B', 'b@example.com', $1)
          RETURNING id, nombre, email`, [hash]
      );
      [this.a, this.b] = rows.map(usuario => ({
        usuario,
        token: jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, { expiresIn: '1h' }),
      }));
    },
    gasto(overrides = {}) {
      return { monto: 85.5, categoria_id: this.categoria, fecha: '2026-10-05',
        metodo_pago: 'efectivo', nota: 'Tacos', ...overrides };
    },
    async crearGasto(user = this.a, overrides = {}) {
      const response = await api.post('/gastos').auth(user.token, { type: 'bearer' })
        .send(this.gasto(overrides)).expect(201);
      return response.body.gasto;
    },
    async listar(user = this.a, query = {}) {
      const response = await api.get('/gastos').auth(user.token, { type: 'bearer' })
        .query(query).expect(200);
      return response.body;
    },
  };
}

function expectError(response, status, code) {
  assert.equal(response.status, status);
  assert.match(response.headers['content-type'], /application\/json/);
  assert.deepEqual(Object.keys(response.body), ['error']);
  assert.deepEqual(Object.keys(response.body.error).sort(), ['code', 'message']);
  assert.equal(response.body.error.code, code);
  assert.equal(typeof response.body.error.message, 'string');
  assert.ok(response.body.error.message.length > 0);
}

module.exports = { createFixtures, expectError };
