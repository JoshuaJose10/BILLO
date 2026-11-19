// Desde la raiz: node backend/qa/categorias-postman-hu91.cjs
// Usa el JSON existente; no guarda reportes crudos ni sesiones.
const fs = require('fs');
const newman = require('newman');
const { buildEvidence } = require('../../docs/postman/resumir-ejecucion.cjs');
const collection = JSON.parse(
  fs.readFileSync('docs/postman/billo-api.postman_collection.json', 'utf8')
);
collection.variable.find((x) => x.key === 'baseUrl').value =
  'https://billo-api-v30t.onrender.com';
collection.item = collection.item.slice(0, 2);
collection.item[0].item = collection.item[0].item.filter((x, i) =>
  [0, 5, 11, 12].includes(i)
);
newman.run(
  {
    collection,
    iterationCount: 1,
    timeoutRequest: 60000,
    timeoutScript: 10000,
    timeout: 240000,
    reporters: [],
  },
  (err, summary) => {
    if (err) {
      console.log(err.message);
      process.exitCode = 1;
      return;
    }
    const report = buildEvidence(summary, {
      task: 'HU-91 API: seleccion de Autenticacion y Categorias',
      contract: 'v1.5',
      backendCommit: 'Despliegue Render: commit no expuesto por /health',
      checkoutCommit: require('child_process')
        .execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' })
        .trim(),
      baseUrl: 'https://billo-api-v30t.onrender.com',
      selection:
        'Registro A, login A, registro B, login B; carpeta 02 completa; una iteracion',
      acceptancePolicy: '100% de casos y aserciones',
    });
    report.acceptance = {
      passed:
        report.summary.failed === 0 && report.executionErrors.length === 0,
    };
    process.exitCode = report.acceptance.passed ? 0 : 1;
    fs.writeFileSync(
      'docs/qa/hu91-evidencias/api-postman.json',
      JSON.stringify(report, null, 2) + '\n'
    );
    console.log(
      JSON.stringify(
        {
          summary: report.summary,
          errors: report.executionErrors,
          failures: report.executions
            .filter((x) => !x.passed)
            .map((x) => ({
              name: x.name,
              status: x.status,
              assertions: x.assertions.filter((a) => !a.passed),
            })),
        },
        null,
        2
      )
    );
  }
);
