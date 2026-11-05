// Ejecuta Node Test Runner y Newman contra la API y PostgreSQL reales.
// Cada ejecución crea su propia BD; nunca migra ni borra DB_NAME de desarrollo.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { once } = require('node:events');
const { run } = require('node:test');
const newman = require('newman');
const { createDatabase } = require('../test/helpers/database.cjs');
const { buildEvidence } = require('../../docs/postman/resumir-ejecucion.cjs');
const root = path.resolve(__dirname, '../..');
const output = path.resolve(process.env.QA_OUTPUT_DIR || path.join(root, 'docs'));
const collectionPath = 'docs/postman/presupuestos.postman_collection.json';

async function integration() {
  const executions = [];
  const executionErrors = [];
  // El runner usa un proceso hijo, con la misma suite incluida en npm test.
  for await (const event of run({ files: [path.join(root, 'backend/test/presupuestos.test.cjs')], concurrency: 1 })) {
    if (event.type !== 'test:pass' && event.type !== 'test:fail') continue;
    const data = event.data;
    if (data.details.type === 'suite') {
      if (event.type === 'test:fail' && data.details.error?.failureType !== 'subtestsFailed') {
        executionErrors.push({ name: data.name, message: data.details.error?.message });
      }
      continue;
    }
    executions.push({
      name: data.name, passed: event.type === 'test:pass' && !data.skip && !data.todo,
      ...(data.skip ? { skipped: true } : {}),
      ...(data.todo ? { todo: true } : {}),
      ...(data.details.error ? { error: data.details.error.message } : {}),
    });
  }
  assert.ok(executions.length > 0, 'La suite de integración no ejecutó casos');
  const passed = executions.filter(e => e.passed).length;
  return { summary: { cases: executions.length, passed, failed: executions.length - passed }, executionErrors, executions };
}

async function postman() {
  let database;
  let server;
  let evidence;
  try {
    // Mantiene los mismos permisos CREATEDB y limpieza que npm test.
    if (process.env.QA_ADMIN_DATABASE) process.env.TEST_ADMIN_DATABASE = process.env.QA_ADMIN_DATABASE;
    database = await createDatabase();
    const initial = await database.pool.query('SELECT current_database() AS name, version() AS version');
    const migrations = (await database.pool.query('SELECT name FROM schema_migrations ORDER BY name')).rows.map(r => r.name);
    server = database.app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const collection = JSON.parse(fs.readFileSync(path.join(root, collectionPath), 'utf8'));
    collection.variable.find(v => v.key === 'baseUrl').value = `http://127.0.0.1:${server.address().port}`;
    const report = await new Promise((resolve, reject) => newman.run({
      collection, iterationCount: 2, reporters: [],
      timeoutRequest: 10000, timeoutScript: 10000, timeout: 180000,
    }, (error, summary) => error ? reject(error) : resolve(summary)));
    const remaining = (await database.pool.query(`SELECT
      (SELECT count(*)::int FROM gastos) AS gastos,
      (SELECT count(*)::int FROM presupuestos) AS presupuestos`)).rows[0];
    evidence = buildEvidence(report, {
      task: 'QA presupuestos · HU-24 / HU-29 · RF3 / RF4',
      collectionSha256: hash(collectionPath),
      branch: git('branch', '--show-current'),
      applicationSource: 'develop local; backend/src y backend/migrations sin modificaciones',
      postgres: initial.rows[0].version,
      database: { name: initial.rows[0].name, fresh: true, initialPublicTables: 0, migrations, remaining, dropped: false },
      scope: 'API Express real y PostgreSQL temporal. No ejecuta UI ni representa confirmación de Joshua.',
    });
    evidence.acceptance = {
      minimumPercent: 100,
      passed: evidence.summary.failed === 0 && evidence.executionErrors.length === 0 && remaining.gastos === 0 && remaining.presupuestos === 0,
    };
  } finally {
    try {
      if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    } finally {
      if (database) {
        await database.close();
        if (evidence) evidence.database.dropped = true;
      }
    }
  }
  return evidence;
}
function hash(file) {
  return createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
}
function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}
async function main() {
  const automated = await integration();
  const postmanEvidence = await postman();
  const files = [
    'backend/package.json', 'backend/package-lock.json',
    'backend/qa/presupuestos.cjs', 'backend/qa/coleccion-presupuestos.cjs',
    'backend/test/integration.test.cjs', 'backend/test/presupuestos.test.cjs',
    'backend/test/suites/presupuestos.cjs', 'backend/test/helpers/database.cjs',
    'backend/test/helpers/fixtures.cjs', 'docs/postman/resumir-ejecucion.cjs', collectionPath,
    ...git('ls-files', 'backend/src', 'backend/migrations').split(/\r?\n/),
  ];
  const accepted = automated.summary.failed === 0 && automated.executionErrors.length === 0 && postmanEvidence.acceptance.passed;
  const result = {
    title: 'QA presupuestos', executedAt: postmanEvidence.executedAt,
    timezone: 'America/Mexico_City', branch: git('branch', '--show-current'),
    baseCommit: git('rev-parse', 'HEAD'), workingTree: 'Cambios locales; ver hashes de los archivos ejecutados.',
    node: process.version, newman: require('newman/package.json').version,
    platform: process.platform, fileSha256: Object.fromEntries(files.map(f => [f, hash(f)])),
    automated, postman: { summary: postmanEvidence.summary, iterations: postmanEvidence.iterations, acceptance: postmanEvidence.acceptance, database: postmanEvidence.database },
    verdict: { 'HU-24': accepted ? 'APROBADO (alcance API)' : 'NO APROBADO', 'HU-29': accepted ? 'APROBADO (alcance API)' : 'NO APROBADO' },
    joshuaReview: 'PENDIENTE: requiere ejecución propia y comparación de los números.',
    postmanEvidence: 'postman/ejecucion-presupuestos.json',
  };
  fs.mkdirSync(path.join(output, 'postman'), { recursive: true });
  fs.mkdirSync(path.join(output, 'qa'), { recursive: true });
  fs.writeFileSync(path.join(output, 'postman/ejecucion-presupuestos.json'), JSON.stringify(postmanEvidence, null, 2) + '\n');
  fs.writeFileSync(path.join(output, 'qa/presupuestos-resultados.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ automated: automated.summary, postman: postmanEvidence.summary, verdict: result.verdict, joshuaReview: result.joshuaReview }, null, 2));
  process.exitCode = accepted ? 0 : 1;
}
main().catch(error => {
  console.error(`QA presupuestos no completado: ${error.code || error.name}: ${error.message}`);
  process.exitCode = 2;
});
