// HU-91: peticiones reales; solo crea/modifica sus propias cuentas QA.
// Ejecutar desde la raíz: node backend/qa/categorias-hu91.cjs
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, createHash } = require('node:crypto');
const assert = require('node:assert/strict');

const baseUrl = process.env.QA_API_URL || 'https://billo-api-v30t.onrender.com';
const output = path.resolve(
  __dirname,
  '../../docs/qa/hu91-evidencias/api-ampliada.json'
);
const sanitize = (value) => {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        /token|password|secret|email/i.test(key) ? '[OMITIDO]' : sanitize(item),
      ])
    );
  return value;
};

async function main() {
  const executions = [];
  const accounts = [];
  async function request(
    name,
    method,
    route,
    account,
    body,
    status,
    check = () => {}
  ) {
    const entry = {
      name,
      at: new Date().toISOString(),
      method,
      route,
      request: sanitize(body),
    };
    executions.push(entry);
    try {
      const response = await fetch(baseUrl + route, {
        method,
        signal: AbortSignal.timeout(60000),
        headers: {
          'Content-Type': 'application/json',
          ...(account ? { Authorization: `Bearer ${account.token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await response.json();
      entry.status = response.status;
      entry.response = sanitize(data);
      assert.equal(response.status, status);
      check(data);
      entry.passed = true;
      console.log(`PASA ${name} HTTP ${response.status}`);
      return data;
    } catch (error) {
      entry.passed = false;
      entry.error = error.message;
      throw error;
    }
  }
  let error;
  try {
    for (const label of ['A', 'B']) {
      const credentials = {
        nombre: `QA HU91 API ${label}`,
        email: `qa.hu91.${randomBytes(8).toString('hex')}@example.test`,
        password: `Hu91Qa${randomBytes(12).toString('hex')}`,
      };
      const data = await request(
        `Registro ${label}: requiere onboarding`,
        'POST',
        '/auth/register',
        null,
        credentials,
        201,
        (d) => assert.equal(d.usuario.categorias_configuradas, false)
      );
      accounts.push({ ...credentials, token: data.token });
    }
    const [a, b] = accounts;
    const catalog = await request(
      'Catálogo predefinido',
      'GET',
      '/categorias/predefinidas',
      a,
      null,
      200
    );
    const ids = catalog.categorias
      .filter((c) => c.tipo === 'gasto')
      .slice(0, 3)
      .map((c) => c.id);
    assert.equal(ids.length, 3);
    await request(
      'Seleccionar exactamente tres',
      'PUT',
      '/categorias/seleccion',
      a,
      { categoria_ids: ids },
      200,
      (d) => assert.equal(d.categorias_configuradas, true)
    );
    await request(
      'Nuevo gasto recibe solo tres',
      'GET',
      '/categorias?tipo=gasto',
      a,
      null,
      200,
      (d) => assert.deepEqual(d.map((c) => c.id).sort(), [...ids].sort())
    );
    await request(
      'Cero predefinidas rechazado',
      'PUT',
      '/categorias/seleccion',
      a,
      { categoria_ids: [] },
      400,
      (d) => assert.equal(d.error.code, 'SELECCION_VACIA')
    );
    const own = (
      await request(
        'Crear propia y asignar color',
        'POST',
        '/categorias',
        a,
        { nombre: 'HU91 propia con gasto' },
        201,
        (d) => assert.match(d.categoria.color, /^#[A-F0-9]{6}$/i)
      )
    ).categoria;
    const spare = (
      await request(
        'Crear propia sin uso',
        'POST',
        '/categorias',
        a,
        { nombre: 'HU91 temporal' },
        201
      )
    ).categoria;
    await request(
      'Renombrar propia',
      'PUT',
      `/categorias/${spare.id}`,
      a,
      { nombre: 'HU91 renombrada' },
      200,
      (d) => assert.equal(d.categoria.nombre, 'HU91 renombrada')
    );
    await request(
      'B no ve propia de A',
      'GET',
      '/categorias',
      b,
      null,
      200,
      (d) => assert.ok(!d.some((c) => c.id === own.id))
    );
    await request(
      'B no puede renombrar propia ajena',
      'PUT',
      `/categorias/${own.id}`,
      b,
      { nombre: 'Cambio ajeno' },
      404
    );
    await request(
      'B no puede borrar propia ajena',
      'DELETE',
      `/categorias/${own.id}`,
      b,
      null,
      404
    );
    await request(
      'B no puede gastar con propia ajena',
      'POST',
      '/gastos',
      b,
      {
        categoria_id: own.id,
        monto: 1,
        fecha: '2026-11-19',
        metodo_pago: 'efectivo',
      },
      400
    );
    await request(
      'Borrar propia sin uso',
      'DELETE',
      `/categorias/${spare.id}`,
      a,
      null,
      200,
      (d) => assert.equal(d.eliminado, true)
    );
    const expense = (categoria_id, monto) => ({
      categoria_id,
      monto,
      fecha: '2026-11-19',
      metodo_pago: 'efectivo',
      nota: 'QA HU91 categoría por usuario',
    });
    await request(
      'Gasto con predefinida antes de ocultar',
      'POST',
      '/gastos',
      a,
      expense(ids[0], 100),
      201
    );
    await request(
      'Gasto con propia',
      'POST',
      '/gastos',
      a,
      expense(own.id, 50),
      201
    );
    await request(
      'Presupuesto antes de ocultar',
      'POST',
      '/presupuestos',
      a,
      { categoria_id: ids[0], mes: '2026-11', monto_limite: 500 },
      201
    );
    await request(
      'Borrar propia usada por gasto',
      'DELETE',
      `/categorias/${own.id}`,
      a,
      null,
      409,
      (d) => assert.equal(d.error.code, 'CATEGORIA_EN_USO')
    );
    const budgetOwn = (
      await request(
        'Crear propia para presupuesto',
        'POST',
        '/categorias',
        a,
        { nombre: 'HU91 propia con presupuesto' },
        201
      )
    ).categoria;
    await request(
      'Presupuesto con propia',
      'POST',
      '/presupuestos',
      a,
      { categoria_id: budgetOwn.id, mes: '2026-11', monto_limite: 300 },
      201
    );
    await request(
      'Borrar propia usada solo por presupuesto',
      'DELETE',
      `/categorias/${budgetOwn.id}`,
      a,
      null,
      409,
      (d) => assert.equal(d.error.code, 'CATEGORIA_EN_USO')
    );
    await request(
      'Ocultar predefinida con historial',
      'PUT',
      '/categorias/seleccion',
      a,
      { categoria_ids: ids.slice(1) },
      200
    );
    await request(
      'Disponibles excluye oculta y conserva propias',
      'GET',
      '/categorias?tipo=gasto',
      a,
      null,
      200,
      (d) => {
        assert.ok(!d.some((c) => c.id === ids[0]));
        assert.ok(d.some((c) => c.id === own.id));
      }
    );
    await request(
      'Nuevo gasto rechaza oculta',
      'POST',
      '/gastos',
      a,
      expense(ids[0], 10),
      400,
      (d) => assert.equal(d.error.code, 'CATEGORIA_INEXISTENTE')
    );
    await request(
      'Nuevo presupuesto rechaza oculta',
      'POST',
      '/presupuestos',
      a,
      { categoria_id: ids[0], mes: '2026-12', monto_limite: 500 },
      400,
      (d) => assert.equal(d.error.code, 'CATEGORIA_INEXISTENTE')
    );
    await request(
      'Movimientos conserva gasto oculto',
      'GET',
      '/gastos?mes=2026-11',
      a,
      null,
      200,
      (d) =>
        assert.ok(
          d.some((g) => g.categoria_id === ids[0] && Number(g.monto) === 100)
        )
    );
    await request(
      'Presupuesto oculto sigue visible',
      'GET',
      '/presupuestos?mes=2026-11',
      a,
      null,
      200,
      (d) => assert.ok(d.some((p) => p.categoria_id === ids[0]))
    );
    await request(
      'Resumen conserva 150',
      'GET',
      '/reportes/resumen?mes=2026-11',
      a,
      null,
      200,
      (d) => {
        assert.equal(Number(d.gasto_variable), 150);
        assert.equal(Number(d.total), 150);
      }
    );
    await request(
      'Reporte conserva propia y oculta',
      'GET',
      '/reportes/por-categoria?mes=2026-11',
      a,
      null,
      200,
      (d) => {
        assert.equal(
          Number(d.find((c) => c.categoria_id === ids[0]).total),
          100
        );
        assert.equal(
          Number(d.find((c) => c.categoria_id === own.id).total),
          50
        );
      }
    );
    await request(
      'Login configurado conserva bandera',
      'POST',
      '/auth/login',
      null,
      { email: a.email, password: a.password },
      200,
      (d) => assert.equal(d.usuario.categorias_configuradas, true)
    );
  } catch (caught) {
    error = caught.message;
  } finally {
    for (const account of accounts) {
      try {
        await request(
          'Limpieza: eliminar exclusivamente cuenta QA de esta corrida',
          'DELETE',
          '/auth/cuenta',
          account,
          { password: account.password },
          200
        );
      } catch (caught) {
        error ||= caught.message;
      }
    }
    const report = {
      task: 'HU-91: API ampliada',
      baseUrl,
      timezone: 'America/Mexico_City',
      backendCommit: 'Render no expone el commit en /health',
      runnerSha256: createHash('sha256')
        .update(fs.readFileSync(__filename))
        .digest('hex'),
      summary: {
        requests: executions.length,
        passed: executions.filter((e) => e.passed).length,
        failed: executions.filter((e) => !e.passed).length,
        completed: !error,
      },
      ...(error ? { error } : {}),
      executions,
    };
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report.summary));
    process.exitCode = error ? 1 : 0;
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
