// Publica resultados de Newman sin solicitudes, cabeceras ni variables de sesión.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key, /token|password|secret|authorization/i.test(key) ? '[OMITIDO]' : sanitize(entry),
    ]));
  }
  if (typeof value === 'string') {
    return value.replace(/[A-Z0-9._%+-]+@example\.test/gi, '[CORREO_QA]')
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT_OMITIDO]');
  }
  return value;
}

function summarize(executions) {
  const assertions = executions.flatMap(entry => entry.assertions);
  const passed = executions.filter(entry => entry.passed).length;
  const assertionsPassed = assertions.filter(entry => entry.passed).length;
  return {
    cases: executions.length, passed, failed: executions.length - passed,
    casePassRate: executions.length ? 100 * passed / executions.length : 0,
    assertions: assertions.length, assertionsPassed,
    assertionsFailed: assertions.length - assertionsPassed,
    assertionPassRate: assertions.length ? 100 * assertionsPassed / assertions.length : 0,
  };
}

function buildEvidence(report, metadata = {}) {
  // La API de Newman entrega una Collection SDK; el reporte JSON ya es plano.
  const collection = report.collection.toJSON ? report.collection.toJSON() : report.collection;
  const folderById = new Map();
  for (const folder of collection.item) {
    for (const item of folder.item) folderById.set(item.id, folder.name);
  }
  const seen = new Set();
  const mainExecutions = report.run.executions.filter(entry => {
    const key = `${entry.cursor.iteration}:${entry.item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const executions = mainExecutions.map(entry => {
    const assertions = (entry.assertions || []).map(assertion => ({
      name: assertion.assertion, passed: !assertion.error && !assertion.skipped,
      ...(assertion.error ? { error: sanitize(assertion.error.message) } : {}),
      ...(assertion.skipped ? { skipped: true } : {}),
    }));
    let response;
    if (entry.response?.stream) {
      const raw = Buffer.from(entry.response.stream.data || entry.response.stream).toString('utf8');
      try { response = sanitize(JSON.parse(raw)); } catch { response = sanitize(raw); }
    }
    return {
      iteration: entry.cursor.iteration + 1, folder: folderById.get(entry.item.id),
      name: entry.item.name, method: entry.request.method,
      path: entry.request.url.path.join('/'), status: entry.response?.code,
      passed: !entry.requestError && assertions.length > 0 && assertions.every(a => a.passed),
      assertions, response,
      ...(entry.requestError ? { transportError: sanitize(entry.requestError.message) } : {}),
    };
  });
  const summary = summarize(executions);
  if (executions.length !== report.run.stats.items.total) throw new Error('El total de casos no coincide con Newman');
  if (summary.assertions !== report.run.stats.assertions.total ||
      summary.assertionsFailed !== report.run.stats.assertions.failed) {
    throw new Error('Las aserciones no coinciden con Newman (incluidas las auxiliares)');
  }
  const expected = collection.item.reduce((count, folder) => count + folder.item.length, 0)
    * report.run.stats.iterations.total;
  if (expected !== executions.length) throw new Error('La colección no se ejecutó completa');
  const executionErrors = (report.run.failures || [])
    .filter(failure => !String(failure.at).startsWith('assertion:'))
    .map(failure => ({ name: failure.error?.name, message: sanitize(failure.error?.message) }));
  const groups = Object.fromEntries([...new Set(executions.map(entry => entry.folder))]
    .map(folder => [folder, summarize(executions.filter(entry => entry.folder === folder))]));
  return {
    task: 'Sprint 2 · línea base', contract: 'v1.1',
    executedAt: new Date(report.run.timings.started).toISOString(), timezone: 'America/Mexico_City',
    backendCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    backendTree: execFileSync('git', ['rev-parse', 'HEAD:backend'], { cwd: root, encoding: 'utf8' }).trim(),
    collectionSha256: createHash('sha256')
      .update(fs.readFileSync(path.join(root, 'docs/postman/billo-api.postman_collection.json'))).digest('hex'),
    node: process.version, newman: '6.2.3', iterations: report.run.stats.iterations.total,
    ...metadata, groups, summary,
    acceptance: {
      minimumPercent: 95, cases: summary.casePassRate >= 95,
      assertions: summary.assertionPassRate >= 95,
      passed: summary.casePassRate >= 95 && summary.assertionPassRate >= 95 && executionErrors.length === 0,
    },
    stats: report.run.stats,
    auxiliaryRequests: report.run.stats.requests.total - mainExecutions.length,
    executionErrors, executions,
  };
}

if (require.main === module) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error('Uso: node resumir-ejecucion.cjs <newman-privado.json> <evidencia.json>');
  const evidence = buildEvidence(JSON.parse(fs.readFileSync(input, 'utf8')));
  fs.writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify({ summary: evidence.summary, acceptance: evidence.acceptance }, null, 2));
}

module.exports = { buildEvidence, summarize };
