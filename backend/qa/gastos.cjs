// Ejecuta la colección completa contra la app real y una BD PostgreSQL nueva.
// No escribe reportes crudos de Newman: contienen tokens y contraseñas de QA.
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { once } = require('node:events');
const { Client } = require('pg');
const newman = require('newman');
const { buildEvidence, summarize } = require('../../docs/postman/resumir-ejecucion.cjs');

const backend = path.resolve(__dirname, '..');
const root = path.resolve(backend, '..');
require('dotenv').config({ path: path.join(backend, '.env'), quiet: true });
// DB_NAME del .env jamás se usa como destino de las pruebas.
const database = `billo_qa_${Date.now()}_${randomBytes(6).toString('hex')}`;
const outputDir = path.resolve(process.env.QA_OUTPUT_DIR || path.join(root, 'docs'));
const admin = new Client({
  host: process.env.DB_HOST, port: process.env.DB_PORT,
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  database: process.env.QA_ADMIN_DATABASE || 'postgres', connectionTimeoutMillis: 10000,
});

async function main() {
  let created = false;
  let server;
  let pool;
  let evidence;
  try {
    await admin.connect();
    if (!/^billo_qa_\d+_[a-f0-9]{12}$/.test(database)) throw new Error('Nombre de BD QA inseguro');
    const postgres = (await admin.query('SELECT version()')).rows[0].version;
    await admin.query(`CREATE DATABASE "${database}" TEMPLATE template0`);
    created = true;
    process.env.DB_NAME = database;
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.NODE_ENV = 'test';
    // Importar después de configurar la BD aislada; usa controladores y pool reales.
    process.chdir(backend);
    ({ pool } = require('../src/db'));
    const { migrate } = require('../src/db/migrate');
    const fresh = await pool.query("SELECT count(*)::int AS tables FROM information_schema.tables WHERE table_schema='public'");
    if (fresh.rows[0].tables !== 0) throw new Error('La base QA no está vacía');
    await migrate({ closePool: false });
    const migrations = (await pool.query('SELECT name FROM schema_migrations ORDER BY name')).rows.map(row => row.name);
    const app = require('../src/app');
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(`${baseUrl}/health`);
    if (health.status !== 200) throw new Error('Healthcheck fallido');
    const collectionFile = path.join(root, 'docs/postman/billo-api.postman_collection.json');
    const collection = JSON.parse(fs.readFileSync(collectionFile, 'utf8'));
    collection.variable.find(variable => variable.key === 'baseUrl').value = baseUrl;
    const report = await new Promise((resolve, reject) => {
      newman.run({
        collection, iterationCount: 2,
        timeoutRequest: 10000, timeoutScript: 10000, timeout: 180000,
        reporters: [],
      }, (error, summary) => error ? reject(error) : resolve(summary));
    });
    const files = [
      'backend/package-lock.json', 'backend/qa/gastos.cjs',
      'docs/postman/resumir-ejecucion.cjs', 'docs/postman/billo-api.postman_collection.json',
      ...execFileSync('git', ['ls-files', 'backend/src', 'backend/migrations'], { cwd: root, encoding: 'utf8' })
        .trim().split(/\r?\n/),
    ];
    const fileSha256 = Object.fromEntries(files.map(file => [file, createHash('sha256')
      .update(fs.readFileSync(path.join(root, file))).digest('hex')]));
    const remaining = (await pool.query('SELECT count(*)::int AS count FROM gastos')).rows[0].count;
    evidence = buildEvidence(report, {
      branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(),
      applicationSource: 'develop; backend/src y backend/migrations sin cambios',
      fileSha256, postgres,
      database: { name: database, fresh: true, initialPublicTables: 0, migrations, remainingGastos: remaining, dropped: false },
      scope: 'App Express real (src/app.js), PostgreSQL real, colección completa; no verifica arranque de src/index.js ni UI móvil.',
    });
    if (remaining !== 0) {
      evidence.executionErrors.push({ name: 'CleanupError', message: 'Quedaron gastos tras la limpieza de la colección' });
      evidence.acceptance.passed = false;
    }
  } finally {
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (pool) await pool.end();
    try {
      if (created) {
        // Solo puede borrar el nombre aleatorio creado por esta misma ejecución.
        await admin.query(`DROP DATABASE "${database}"`);
        if (evidence) evidence.database.dropped = true;
      }
    } finally {
      await admin.end();
    }
  }
  fs.mkdirSync(path.join(outputDir, 'postman'), { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'qa'), { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'postman/ejecucion-sprint2.json'), JSON.stringify(evidence, null, 2) + '\n');
  const executions = evidence.executions.filter(entry => entry.folder.startsWith('03 '));
  const gastos = {
    ...evidence, task: 'HU-12 · regresión de gastos',
    source: 'postman/ejecucion-sprint2.json (misma ejecución; no sumar a sus totales)',
    groups: undefined, stats: undefined, auxiliaryRequests: undefined,
    summary: summarize(executions), executions,
  };
  gastos.acceptance = {
    minimumPercent: 95, cases: gastos.summary.casePassRate >= 95,
    assertions: gastos.summary.assertionPassRate >= 95,
    passed: gastos.summary.casePassRate >= 95 && gastos.summary.assertionPassRate >= 95 && evidence.executionErrors.length === 0,
  };
  fs.writeFileSync(path.join(outputDir, 'qa/gastos-resultados.json'), JSON.stringify(gastos, null, 2) + '\n');
  console.log(JSON.stringify({ summary: evidence.summary, acceptance: evidence.acceptance, groups: evidence.groups }, null, 2));
  process.exitCode = evidence.summary.failed || evidence.executionErrors.length ? 1 : 0;
}

main().catch(error => {
  // No imprimir configuración de conexión ni el resumen crudo de Newman.
  console.error(`QA no completado: ${error.code || error.name}: ${error.message}`);
  process.exitCode = 2;
});
