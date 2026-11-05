// API y PostgreSQL reales, bases temporales y evidencia sin sesiones de Newman.
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
const collectionPath = 'docs/postman/membresias-reportes.postman_collection.json';
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const hash = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

async function integration() {
  const executions = [];
  const executionErrors = [];
  for await (const event of run({ files: [path.join(root, 'backend/test/membresias-reportes.test.cjs')], concurrency: 1 })) {
    if (event.type !== 'test:pass' && event.type !== 'test:fail') continue;
    const data = event.data;
    if (data.details.type === 'suite') {
      if (event.type === 'test:fail' && data.details.error?.failureType !== 'subtestsFailed') {
        executionErrors.push({ name: data.name, message: data.details.error?.message });
      }
      continue;
    }
    executions.push({ name: data.name,
      passed: event.type === 'test:pass' && !data.skip && !data.todo,
      ...(data.skip ? { skipped: true } : {}), ...(data.todo ? { todo: true } : {}),
      ...(data.details.error ? { error: data.details.error.message } : {}),
    });
  }
  assert.ok(executions.length > 0, 'La suite no ejecutó casos');
  const passed = executions.filter(e => e.passed).length;
  return { summary: { cases: executions.length, passed, failed: executions.length - passed }, executionErrors, executions };
}

async function postman() {
  let database;
  let server;
  let evidence;
  try {
    database = await createDatabase();
    const initial = (await database.pool.query('SELECT current_database() AS name, version() AS version')).rows[0];
    const migrations = (await database.pool.query('SELECT name FROM schema_migrations ORDER BY name')).rows.map(r => r.name);
    server = database.app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const collection = JSON.parse(fs.readFileSync(path.join(root, collectionPath), 'utf8'));
    collection.variable.find(v => v.key === 'baseUrl').value = `http://127.0.0.1:${server.address().port}`;
    const report = await new Promise((resolve, reject) => newman.run({
      collection, iterationCount: 2, reporters: [], timeoutRequest: 10000,
      timeoutScript: 10000, timeout: 180000,
    }, (error, summary) => error ? reject(error) : resolve(summary)));
    const remaining = (await database.pool.query(`SELECT
      (SELECT count(*)::int FROM gastos) AS gastos,
      (SELECT count(*)::int FROM membresias) AS membresias`)).rows[0];
    evidence = buildEvidence(report, {
      task: 'QA membresías y reportes · HU-26 / HU-31 / HU-32 · RF5 / RF6 / RF8',
      collectionSha256: hash(collectionPath), branch: git('branch', '--show-current'),
      applicationSource: 'Código local identificado por SHA-256 en membresias-reportes-resultados.json',
      postgres: initial.version,
      database: { name: initial.name, fresh: true, initialPublicTables: 0, migrations, remaining, dropped: false },
      scope: 'API Express real y PostgreSQL temporal. UI y repetición independiente de Joshua pendientes.',
    });
    evidence.acceptance = { minimumPercent: 100,
      passed: evidence.summary.failed === 0 && evidence.summary.assertionsFailed === 0 &&
        evidence.executionErrors.length === 0 && remaining.gastos === 0 && remaining.membresias === 0 };
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

async function main() {
  require('dotenv').config({ path: path.join(root, 'backend/.env'), quiet: true });
  if (process.env.QA_ADMIN_DATABASE) process.env.TEST_ADMIN_DATABASE = process.env.QA_ADMIN_DATABASE;
  const automated = await integration();
  const postmanEvidence = await postman();
  const files = [
    'backend/package.json', 'backend/package-lock.json',
    'backend/qa/membresias-reportes.cjs', 'backend/qa/coleccion-membresias-reportes.cjs',
    'backend/test/integration.test.cjs', 'backend/test/membresias-reportes.test.cjs',
    'backend/test/suites/membresias-reportes.cjs', 'backend/test/helpers/database.cjs',
    'backend/test/helpers/fixtures.cjs', 'docs/postman/resumir-ejecucion.cjs', collectionPath,
    ...git('ls-files', 'backend/src', 'backend/migrations').split(/\r?\n/),
  ];
  const accepted = automated.summary.failed === 0 && automated.executionErrors.length === 0 && postmanEvidence.acceptance.passed;
  const result = {
    title: 'QA membresías y reportes', executedAt: postmanEvidence.executedAt,
    timezone: 'America/Mexico_City', branch: git('branch', '--show-current'),
    baseCommit: git('rev-parse', 'HEAD'), workingTree: 'Cambios locales; ver hashes de los archivos ejecutados.',
    node: process.version, newman: require('newman/package.json').version, platform: process.platform,
    fileSha256: Object.fromEntries(files.map(f => [f, hash(f)])),
    automated,
    postman: { summary: postmanEvidence.summary, iterations: postmanEvidence.iterations,
      acceptance: postmanEvidence.acceptance, database: postmanEvidence.database },
    reconciliation: {
      month: '2026-10', variable: 1000, fixed: 300, total: 1300,
      rule: 'suma(categorías)=gasto_variable; suma(membresías mensualizadas)=gasto_fijo; variable+fijo=total',
      evidenceCases: ['CONSISTENCIA-ANUAL-FIJO', 'CONSISTENCIA-ANUAL-RESUMEN', 'CP-RF8-01 / CONSISTENCIA-ANUAL-CATEGORIAS'],
    },
    verdict: accepted ? 'APROBADO (alcance API)' : 'NO APROBADO',
    joshuaReview: 'PENDIENTE: Joshua debe repetir dos casos al azar y registrar sus resultados.',
    postmanEvidence: 'postman/ejecucion-membresias-reportes.json',
  };
  fs.mkdirSync(path.join(output, 'postman'), { recursive: true });
  fs.mkdirSync(path.join(output, 'qa'), { recursive: true });
  fs.writeFileSync(path.join(output, 'postman/ejecucion-membresias-reportes.json'), JSON.stringify(postmanEvidence, null, 2) + '\n');
  fs.writeFileSync(path.join(output, 'qa/membresias-reportes-resultados.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ automated: automated.summary, postman: postmanEvidence.summary,
    verdict: result.verdict, joshuaReview: result.joshuaReview,
    failures: postmanEvidence.executions.filter(e => !e.passed).map(e => ({ name: e.name, assertions: e.assertions.filter(a => !a.passed) })),
  }, null, 2));
  process.exitCode = accepted ? 0 : 1;
}
main().catch(error => {
  console.error(`QA no completado: ${error.code || error.name}: ${error.message}`);
  process.exitCode = 2;
});
