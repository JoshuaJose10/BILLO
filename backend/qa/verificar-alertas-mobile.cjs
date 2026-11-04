// Prueba el adaptador móvil real aislando React, autenticación y transporte.
// No ejecuta JSX ni simula haber probado la pantalla en Android.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

async function inspect() {
  let response;
  let received;
  const module = new vm.SourceTextModule(fs.readFileSync(path.resolve(__dirname, '../../mobile/src/services/gastos.js'), 'utf8'));
  await module.link(specifier => {
    const exports = specifier === 'react'
      ? { useMemo: factory => factory() }
      : specifier.endsWith('AuthContext')
        ? { useApi: () => async (route, options) => { received = { route, method: options.method }; return response; } }
        : specifier.endsWith('formato') ? { aNumero: Number } : null;
    if (!exports) throw new Error(`Dependencia no contemplada: ${specifier}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    });
  });
  await module.evaluate();
  const service = module.namespace.useGastosService();
  const results = [];
  for (const method of ['POST', 'PUT']) {
    for (const [estado, monto, porcentaje] of [['ok', 799.99, 80], ['alerta', 800, 80], ['excedido', 1000.01, 100]]) {
      const gasto = { id: 1, monto, categoria_id: 1, fecha: '2026-11-03', metodo_pago: 'efectivo', nota: null };
      const alerta = estado === 'ok' ? undefined : { categoria_id: 1, porcentaje, estado };
      response = { gasto, ...(alerta ? { alerta } : {}) };
      const result = method === 'POST' ? await service.crearGasto(gasto) : await service.actualizarGasto(1, gasto);
      let error;
      try {
        assert.equal(received.method, method);
        assert.equal(received.route, method === 'POST' ? '/gastos' : '/gastos/1');
        // El consumidor debe poder conocer el aviso para presentarlo tras guardar.
        assert.deepEqual(result.alerta, alerta, 'El adaptador debe conservar el aviso de presupuesto recibido de la API');
      } catch (failure) { error = failure.message; }
      results.push({ name: `RF4-MOBILE-${method}-${estado}`, passed: !error,
        apiResponse: response, serviceResult: result, ...(error ? { error } : {}) });
    }
  }
  return { scope: 'Servicio móvil real en VM; React y transporte aislados; sin prueba visual de pantalla',
    cases: results.length, passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length, results };
}

if (require.main === module) {
  inspect().then(evidence => {
    console.log(JSON.stringify(evidence, null, 2));
    process.exitCode = evidence.failed ? 1 : 0;
  }).catch(error => { console.error(error.message); process.exitCode = 2; });
}
module.exports = { inspect };
