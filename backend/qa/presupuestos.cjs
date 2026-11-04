// Evidencia reproducible: integración + Newman + adaptador móvil. Nunca toca DB_NAME de desarrollo.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const newman = require('newman');
const { createDatabase } = require('../test/helpers/database.cjs');
const { buildEvidence } = require('../../docs/postman/resumir-ejecucion.cjs');
const backend = path.resolve(__dirname, '..');
const root = path.resolve(backend, '..');
const output = path.resolve(process.env.QA_OUTPUT_DIR || path.join(root, 'docs/qa'));
const collectionPath = 'docs/postman/presupuestos.postman_collection.json';
const sha = file => createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const automated = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'test/presupuestos.test.cjs'], {
    cwd: backend, encoding: 'utf8', timeout: 65000, maxBuffer: 5 * 1024 * 1024,
  });
  if (automated.error || ![0, 1].includes(automated.status)) throw new Error('La suite automatizada no pudo completarse');
  const tap = automated.stdout;
  const count = key => {
    const match = tap.match(new RegExp(`^# ${key} (\\d+)$`, 'm'));
    if (!match) throw new Error(`TAP incompleto: ${key}`);
    return Number(match[1]);
  };
  const integration = { cases: count('tests'), passed: count('pass'), failed: count('fail'),
    skipped: count('skipped'), cancelled: count('cancelled'), exitCode: automated.status };
  fs.writeFileSync(path.join(output, 'presupuestos-automatizadas.tap'), tap);
  const mobileRun = spawnSync(process.execPath, ['--experimental-vm-modules', 'qa/verificar-alertas-mobile.cjs'], {
    cwd: backend, encoding: 'utf8', timeout: 15000,
  });
  if (mobileRun.error || ![0, 1].includes(mobileRun.status)) throw new Error('La comprobación móvil no pudo completarse');
  const mobile = JSON.parse(mobileRun.stdout);
  let database;
  let server;
  let evidence;
  try {
    database = await createDatabase();
    const postgres = (await database.pool.query('SELECT version()')).rows[0].version;
    const migrations = (await database.pool.query('SELECT name FROM schema_migrations ORDER BY name')).rows.map(r => r.name);
    server = database.app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const collection = JSON.parse(fs.readFileSync(path.join(root, collectionPath), 'utf8'));
    collection.variable.find(v => v.key === 'baseUrl').value = baseUrl;
    const report = await new Promise((resolve, reject) => newman.run({ collection, iterationCount: 2,
      timeoutRequest: 10000, timeoutScript: 15000, timeout: 180000, reporters: [],
    }, (error, summary) => error ? reject(error) : resolve(summary)));
    const remaining = (await database.pool.query(`SELECT
      (SELECT COUNT(*)::int FROM gastos) AS gastos,
      (SELECT COUNT(*)::int FROM presupuestos) AS presupuestos`)).rows[0];
    const files = [...new Set([
      collectionPath, 'backend/qa/presupuestos.cjs', 'backend/qa/generar-presupuestos.cjs',
      'backend/qa/verificar-alertas-mobile.cjs', 'backend/test/suites/presupuestos.cjs',
      'backend/test/presupuestos.test.cjs', 'backend/test/helpers/database.cjs',
      'backend/test/helpers/fixtures.cjs', 'backend/test/integration.test.cjs',
      'backend/package.json', 'backend/package-lock.json', 'docs/postman/resumir-ejecucion.cjs',
      'mobile/src/services/gastos.js', 'mobile/src/screens/NuevoGastoScreen.js',
      'mobile/src/utils/presupuestos.js', 'mobile/src/utils/presupuestos.test.mjs',
      ...execFileSync('git', ['ls-files', 'backend/src', 'backend/migrations'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/),
    ])];
    evidence = buildEvidence(report, {
      task: 'QA presupuestos', branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(),
      applicationSource: 'develop; backend/src, backend/migrations y lógica móvil sin cambios',
      collectionSha256: sha(collectionPath), fileSha256: Object.fromEntries(files.map(file => [file, sha(file)])),
      postgres, integration, mobile,
      database: { fresh: true, initialPublicTables: 0, migrations, remaining, dropped: false },
      scope: 'API Express y PostgreSQL reales; servicio móvil aislado; sin ejecución visual Android',
    });
    if (remaining.gastos || remaining.presupuestos) evidence.executionErrors.push({ name: 'CleanupError', message: 'Quedaron datos tras la limpieza por API' });
    // Cero fallos para aceptar esta QA, aunque la línea base histórica use 95 %.
    evidence.acceptance = { minimumPercent: 100,
      apiPassed: evidence.summary.failed === 0 && evidence.summary.assertionsFailed === 0 && evidence.executionErrors.length === 0,
      integrationPassed: integration.failed === 0 && integration.cancelled === 0 && integration.skipped === 0 && integration.cases > 0 && integration.exitCode === 0,
      mobilePassed: mobile.failed === 0, joshuaConfirmed: false,
      visualVerification: 'Pendiente en dispositivo o emulador', passed: false };
    evidence.acceptance.passed = evidence.acceptance.apiPassed && evidence.acceptance.integrationPassed && evidence.acceptance.mobilePassed;
  } finally {
    try {
      if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    } finally {
      if (database) { await database.close(); if (evidence) evidence.database.dropped = true; }
    }
  }
  fs.writeFileSync(path.join(output, 'presupuestos-resultados.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ summary: evidence.summary, integration, mobile: { cases: mobile.cases, passed: mobile.passed, failed: mobile.failed }, acceptance: evidence.acceptance }, null, 2));
  process.exitCode = evidence.acceptance.apiPassed && evidence.acceptance.integrationPassed && evidence.acceptance.mobilePassed ? 0 : 1;
}
main().catch(error => { console.error(`QA no completado: ${error.code || error.name}: ${error.message}`); process.exitCode = 2; });
