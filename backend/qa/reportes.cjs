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
const admin = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.QA_ADMIN_DATABASE || 'postgres',
  connectionTimeoutMillis: 10000,
});
const results = [];

async function main() {
  let created = false;
  let server;
  let pool;
  try {
    await admin.connect();
    assert.match(database, /^billo_qa_\d+_[a-f0-9]{12}$/);
    const template = process.env.QA_TEMPLATE_DATABASE || 'template0';
    await admin.query(`CREATE DATABASE "${database}" TEMPLATE ${template}`);
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
      const response = await fetch(base + route, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: await response.json() };
    }

    async function check(name, action) {
      try {
        await action();
        results.push({ name, passed: true });
      } catch (error) {
        results.push({ name, passed: false, detail: error.message });
      }
    }

    // 1. Registro de usuarios A y B
    const tokens = [];
    for (const user of ['a', 'b']) {
      const response = await request('POST', '/auth/register', null, {
        nombre: `QA ${user.toUpperCase()}`,
        email: `qa-${user}@example.com`,
        password: 'QaPassword123!',
      });
      assert.equal(response.status, 201, 'Preparación de usuario');
      assert.ok(response.body.token, 'Token de registro');
      tokens.push(response.body.token);
    }
    const [tokenA, tokenB] = tokens;

    // Obtener una categoría para gastos
    const catResult = await pool.query('SELECT id FROM categorias ORDER BY id LIMIT 1');
    const categoriaId = catResult.rows[0].id;

    // CP-RF6-02: Usuario nuevo sin gastos ni membresías
    await check('CP-RF6-02: Usuario nuevo sin gastos ni membresías devuelve ceros', async () => {
      const response = await request('GET', '/reportes/resumen?mes=2026-10', tokenA);
      assert.equal(response.status, 200);
      assert.deepEqual(response.body, {
        mes: '2026-10',
        gasto_variable: 0,
        gasto_fijo: 0,
        total: 0,
      });
    });

    // CP-RF6-01: Con gastos por 500 y membresías por 300 al mes devuelve 500, 300 y 800
    await check('CP-RF6-01: Gastos por 500 y membresías por 300 al mes', async () => {
      // Registrar gastos de A en 2026-10 sumando 500
      const g1 = await request('POST', '/gastos', tokenA, {
        monto: 300,
        categoria_id: categoriaId,
        fecha: '2026-10-10',
        metodo_pago: 'efectivo',
        nota: 'Compra de despensa',
      });
      assert.equal(g1.status, 201);

      const g2 = await request('POST', '/gastos', tokenA, {
        monto: 200,
        categoria_id: categoriaId,
        fecha: '2026-10-15',
        metodo_pago: 'tarjeta',
        nota: 'Gasolina',
      });
      assert.equal(g2.status, 201);

      // Registrar membresía mensual por 300
      const m1 = await request('POST', '/membresias', tokenA, {
        nombre: 'Gimnasio',
        costo: 300,
        frecuencia: 'mensual',
        fecha_cobro: '2026-10-01',
      });
      assert.equal(m1.status, 201);

      const response = await request('GET', '/reportes/resumen?mes=2026-10', tokenA);
      assert.equal(response.status, 200);
      assert.equal(response.body.gasto_variable, 500);
      assert.equal(response.body.gasto_fijo, 300);
      assert.equal(response.body.total, 800);
    });

    // Criterio de aceptación: Membresía anual de 1,200 aporta 100 al gasto fijo
    await check('Criterio: Membresía anual de 1,200 aporta 100 al gasto fijo', async () => {
      const m2 = await request('POST', '/membresias', tokenA, {
        nombre: 'Servicio Anual',
        costo: 1200,
        frecuencia: 'anual',
        fecha_cobro: '2027-01-01',
      });
      assert.equal(m2.status, 201);

      const response = await request('GET', '/reportes/resumen?mes=2026-10', tokenA);
      assert.equal(response.status, 200);
      // Gasto fijo previo (300) + anual 1200 / 12 (100) = 400
      assert.equal(response.body.gasto_fijo, 400);
      assert.equal(response.body.gasto_variable, 500);
      assert.equal(response.body.total, 900);
    });

    // Criterio QA: Los totales coinciden con la suma manual de los datos de prueba
    await check('Criterio QA: Totales coinciden con la suma manual de los datos', async () => {
      // Agregamos un gasto con decimales y otra membresía anual con decimales
      const gExtra = await request('POST', '/gastos', tokenA, {
        monto: 45.75,
        categoria_id: categoriaId,
        fecha: '2026-10-20',
        metodo_pago: 'efectivo',
      });
      assert.equal(gExtra.status, 201);

      const mExtra = await request('POST', '/membresias', tokenA, {
        nombre: 'Hosting Anual',
        costo: 100,
        frecuencia: 'anual',
        fecha_cobro: '2026-12-15',
      });
      assert.equal(mExtra.status, 201);

      // Suma manual esperada:
      // Gastos en 2026-10: 300 + 200 + 45.75 = 545.75
      // Membresías fijas mensuales: 300 + (1200 / 12 = 100) + (100 / 12 = 8.3333...) = 408.33
      // Total: 545.75 + 408.33 = 954.08
      const response = await request('GET', '/reportes/resumen?mes=2026-10', tokenA);
      assert.equal(response.status, 200);
      assert.equal(response.body.gasto_variable, 545.75);
      assert.equal(response.body.gasto_fijo, 408.33);
      assert.equal(response.body.total, 954.08);
    });

    // Criterio QA: Aislamiento (El usuario A no suma datos del usuario B)
    await check('Criterio QA: El usuario A no suma datos del usuario B', async () => {
      // Cargar datos para Usuario B
      const gB = await request('POST', '/gastos', tokenB, {
        monto: 1500,
        categoria_id: categoriaId,
        fecha: '2026-10-10',
        metodo_pago: 'transferencia',
      });
      assert.equal(gB.status, 201);

      const mB = await request('POST', '/membresias', tokenB, {
        nombre: 'Suscripción B',
        costo: 750,
        frecuencia: 'mensual',
        fecha_cobro: '2026-10-01',
      });
      assert.equal(mB.status, 201);

      // Consultar resumen de B
      const responseB = await request('GET', '/reportes/resumen?mes=2026-10', tokenB);
      assert.equal(responseB.status, 200);
      assert.equal(responseB.body.gasto_variable, 1500);
      assert.equal(responseB.body.gasto_fijo, 750);
      assert.equal(responseB.body.total, 2250);

      // Consultar resumen de A nuevamente para verificar que no cambió por los datos de B
      const responseA = await request('GET', '/reportes/resumen?mes=2026-10', tokenA);
      assert.equal(responseA.status, 200);
      assert.equal(responseA.body.gasto_variable, 545.75);
      assert.equal(responseA.body.gasto_fijo, 408.33);
      assert.equal(responseA.body.total, 954.08);
    });

    // Validaciones de parámetro mes
    await check('Validación: mes obligatorio responde 400 MES_INVALIDO', async () => {
      const response = await request('GET', '/reportes/resumen', tokenA);
      assert.equal(response.status, 400);
      assert.equal(response.body.error.code, 'MES_INVALIDO');
    });

    for (const badMes of ['', '2026', '2026-1', '2026-13', '2026/10', 'texto']) {
      await check(`Validación: mes inválido (${badMes}) responde 400 MES_INVALIDO`, async () => {
        const response = await request('GET', `/reportes/resumen?mes=${encodeURIComponent(badMes)}`, tokenA);
        assert.equal(response.status, 400);
        assert.equal(response.body.error.code, 'MES_INVALIDO');
      });
    }

    // Autenticación requerida
    await check('Seguridad: sin token responde 401 NO_AUTORIZADO', async () => {
      const response = await request('GET', '/reportes/resumen?mes=2026-10', null);
      assert.equal(response.status, 401);
      assert.equal(response.body.error.code, 'NO_AUTORIZADO');
    });

  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (pool) await pool.end();
    try {
      if (created) await admin.query(`DROP DATABASE "${database}"`);
    } finally {
      await admin.end();
    }
  }

  const outputDir = path.join(backend, '../docs/qa');
  fs.mkdirSync(outputDir, { recursive: true });
  const evidence = {
    date: '2026-11-03',
    story: 'RF6 - Reporte resumen mensual',
    databaseDropped: true,
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    results,
  };
  fs.writeFileSync(
    path.join(outputDir, 'reporte-resumen-resultados.json'),
    JSON.stringify(evidence, null, 2) + '\n'
  );
  console.log(JSON.stringify(evidence, null, 2));
  process.exitCode = evidence.failed ? 1 : 0;
}

main().catch((error) => {
  console.error(`QA no completado: ${error.code || error.name}: ${error.message}`);
  process.exitCode = 2;
});
