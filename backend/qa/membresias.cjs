// QA contra Express y PostgreSQL reales; usa y elimina una BD temporal aislada.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const { Client } = require('pg');
const backend = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(backend, '.env'), quiet: true });
const database = `billo_qa_${Date.now()}_${randomBytes(6).toString('hex')}`;
const admin = new Client({ host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.QA_ADMIN_DATABASE || 'postgres', connectionTimeoutMillis: 10000 });
const results = [];
async function main() {
  let created = false;
  let server;
  let pool;
  try {
    await admin.connect();
    assert.match(database, /^billo_qa_\d+_[a-f0-9]{12}$/);
    await admin.query(`CREATE DATABASE "${database}" TEMPLATE template0`);
    created = true;
    process.env.DB_NAME = database;
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    process.chdir(backend);
    ({ pool } = require('../src/db'));
    await require('../src/db/migrate').migrate({ closePool: false });
    server = require('../src/app').listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}`;
    async function request(method, route, token, body) {
      const response = await fetch(base + route, { method, headers: {
        'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, body: await response.json() };
    }
    async function check(name, action) {
      try { await action(); results.push({ name, passed: true }); }
      catch (error) { results.push({ name, passed: false, detail: error.message }); }
    }
    const tokens = [];
    for (const user of ['a', 'b']) {
      const response = await request('POST', '/auth/register', null, {
        nombre: `QA ${user}`, email: `qa-${user}@example.com`, password: 'QaMembresias123!',
      });
      assert.equal(response.status, 201, 'Preparación de usuarios');
      assert.ok(response.body.token, 'Token de registro');
      tokens.push(response.body.token);
    }
    const [a, b] = tokens;
    const today = (await pool.query("SELECT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS fecha")).rows[0].fecha;
    const data = { nombre: 'Netflix', costo: 199, frecuencia: 'mensual', fecha_cobro: today };
    let id;
    await check('CP-RF5-01: alta personalizada y consulta', async () => {
      const response = await request('POST', '/membresias', a, data);
      assert.equal(response.status, 201);
      id = response.body.membresia.id;
      assert.deepEqual(response.body.membresia, { id, servicio_id: null, ...data });
      const list = await request('GET', '/membresias', a);
      assert.equal(list.status, 200);
      assert.deepEqual(list.body, [{ id, servicio_id: null, ...data, dias_para_cobro: 0 }]);
    });
    assert.ok(id, 'Alta requerida para continuar');
    await check('CP-RF5-02: actualización del costo', async () => {
      const response = await request('PUT', `/membresias/${id}`, a, { ...data, costo: 219 });
      assert.equal(response.status, 200);
      assert.equal(response.body.membresia.costo, 219);
      const list = await request('GET', '/membresias', a);
      assert.equal(list.body.find(row => row.id === id).costo, 219);
    });
    for (const [name, change, code] of [
      ['CP-RF5-03: nombre vacío', { nombre: '' }, 'NOMBRE_INVALIDO'],
      ['nombre con espacios', { nombre: '   ' }, 'NOMBRE_INVALIDO'],
      ['CP-RF5-04: costo abc', { costo: 'abc' }, 'COSTO_INVALIDO'],
      ['costo cero', { costo: 0 }, 'COSTO_INVALIDO'],
      ['costo negativo', { costo: -1 }, 'COSTO_INVALIDO'],
      ['costo con tres decimales', { costo: 1.234 }, 'COSTO_INVALIDO'],
      ['frecuencia semanal', { frecuencia: 'semanal' }, 'FRECUENCIA_INVALIDA'],
      ['fecha imposible', { fecha_cobro: '2026-02-30' }, 'FECHA_INVALIDA'],
      ['fecha con formato inválido', { fecha_cobro: '01/11/2026' }, 'FECHA_INVALIDA'],
      ['servicio inexistente', { servicio_id: 2147483647 }, 'SERVICIO_INEXISTENTE'],
      ['nombre obligatorio sin servicio', { nombre: undefined }, 'NOMBRE_INVALIDO'],
      ['costo obligatorio sin servicio', { costo: undefined }, 'COSTO_INVALIDO'],
    ]) {
      for (const method of ['POST', 'PUT']) {
        await check(`${method}: ${name}`, async () => {
          const response = await request(method, method === 'POST' ? '/membresias' : `/membresias/${id}`, a, { ...data, ...change });
          assert.equal(response.status, 400);
          assert.equal(response.body.error.code, code);
        });
      }
    }
    await check('Validaciones inválidas no crean ni modifican membresías', async () => {
      const list = await request('GET', '/membresias', a);
      assert.equal(list.body.length, 1);
      assert.equal(list.body[0].costo, 219);
    });
    const service = (await pool.query('SELECT id, nombre, costo_sugerido FROM catalogo_servicios ORDER BY id LIMIT 1')).rows[0];
    assert.ok(service, 'Catálogo precargado por migraciones');
    await check('POST: nombre y costo heredados del catálogo; frecuencia anual', async () => {
      const response = await request('POST', '/membresias', a, { servicio_id: service.id, frecuencia: 'anual', fecha_cobro: '2027-02-01' });
      assert.equal(response.status, 201);
      assert.equal(response.body.membresia.nombre, service.nombre);
      assert.equal(response.body.membresia.costo, Number(service.costo_sugerido));
      assert.equal(response.body.membresia.frecuencia, 'anual');
    });
    await check('PUT: valores heredados del catálogo', async () => {
      const response = await request('PUT', `/membresias/${id}`, a, { servicio_id: service.id, frecuencia: 'mensual', fecha_cobro: today });
      assert.equal(response.status, 200);
      assert.equal(response.body.membresia.nombre, service.nombre);
      assert.equal(response.body.membresia.costo, Number(service.costo_sugerido));
    });
    await check('Catálogo permite nombre y costo personalizados', async () => {
      const response = await request('POST', '/membresias', a, { ...data, nombre: 'Personalizado', costo: 0.01, servicio_id: service.id, fecha_cobro: '2027-01-01' });
      assert.equal(response.status, 201);
      assert.equal(response.body.membresia.nombre, 'Personalizado');
      assert.equal(response.body.membresia.costo, 0.01);
    });
    await check('GET: orden ascendente y dias_para_cobro calculados', async () => {
      const response = await request('GET', '/membresias', a);
      assert.equal(response.status, 200);
      assert.equal(response.body.length, 3);
      const expected = (await pool.query("SELECT id, (fecha_cobro - CURRENT_DATE)::int AS dias FROM membresias ORDER BY fecha_cobro ASC, id ASC")).rows;
      assert.deepEqual(response.body.map(row => [row.id, row.dias_para_cobro]), expected.map(row => [row.id, row.dias]));
    });
    await check('Aislamiento: B no lista las membresías de A', async () => {
      const response = await request('GET', '/membresias', b);
      assert.equal(response.status, 200);
      assert.deepEqual(response.body, []);
    });
    for (const method of ['PUT', 'DELETE']) {
      await check(`Aislamiento: ${method} ajeno devuelve 404`, async () => {
        const response = await request(method, `/membresias/${id}`, b, method === 'PUT' ? data : undefined);
        assert.equal(response.status, 404);
        assert.equal(response.body.error.code, 'MEMBRESIA_NO_ENCONTRADA');
      });
      await check(`${method}: ID inexistente devuelve 404`, async () => {
        const response = await request(method, '/membresias/2147483647', a, method === 'PUT' ? data : undefined);
        assert.equal(response.status, 404);
        assert.equal(response.body.error.code, 'MEMBRESIA_NO_ENCONTRADA');
      });
    }
    await check('Aislamiento: PUT ajeno con cuerpo inválido devuelve 404', async () => {
      const response = await request('PUT', `/membresias/${id}`, b, { ...data, nombre: '' });
      assert.equal(response.status, 404, `Respuesta real: ${JSON.stringify(response)}`);
      assert.equal(response.body.error.code, 'MEMBRESIA_NO_ENCONTRADA');
    });
    await check('Aislamiento: intentos de B no alteran el registro de A', async () => {
      const response = await request('GET', '/membresias', a);
      const row = response.body.find(row => row.id === id);
      assert.equal(row.nombre, service.nombre);
      assert.equal(row.costo, Number(service.costo_sugerido));
    });
    for (const method of ['POST', 'GET', 'PUT', 'DELETE']) {
      await check(`${method}: requiere autenticación`, async () => {
        const response = await request(method, ['PUT', 'DELETE'].includes(method) ? `/membresias/${id}` : '/membresias', null, ['POST', 'PUT'].includes(method) ? data : undefined);
        assert.equal(response.status, 401);
        assert.equal(response.body.error.code, 'NO_AUTORIZADO');
      });
    }
    await check('CP-RF5-02: eliminación y ausencia en listado', async () => {
      const response = await request('DELETE', `/membresias/${id}`, a);
      assert.equal(response.status, 200);
      assert.deepEqual(response.body, { eliminado: true });
      const list = await request('GET', '/membresias', a);
      assert.equal(list.body.some(row => row.id === id), false);
      const retry = await request('DELETE', `/membresias/${id}`, a);
      assert.equal(retry.status, 404);
      assert.equal(retry.body.error.code, 'MEMBRESIA_NO_ENCONTRADA');
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (pool) await pool.end();
    try { if (created) await admin.query(`DROP DATABASE "${database}"`); }
    finally { await admin.end(); }
  }
  const evidence = { date: '2026-11-01', scope: 'API real + PostgreSQL temporal; no verifica UI móvil ni PR remoto',
    databaseDropped: true, total: results.length, passed: results.filter(row => row.passed).length,
    failed: results.filter(row => !row.passed).length, results };
  fs.writeFileSync(path.join(backend, '../docs/qa/membresias-resultados.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
  process.exitCode = evidence.failed ? 1 : 0;
}
main().catch(error => { console.error(`QA no completado: ${error.code || error.name}: ${error.message}`); process.exitCode = 2; });
