const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { expectError } = require('../helpers/fixtures.cjs');

module.exports = getContext => describe('Presupuestos y alertas (CP-RF3 / CP-RF4)', () => {
  let ctx;
  beforeEach(async () => { ctx = getContext(); await ctx.reset(); });
  const mes = '2026-11';
  const datos = (patch = {}) => ({ categoria_id: ctx.categoria, mes, monto_limite: 1000, ...patch });
  const req = (method, path, user = ctx.a) => ctx.api[method](path).auth(user.token, { type: 'bearer' });
  async function crear(patch = {}, user = ctx.a) {
    return (await req('post', '/presupuestos', user).send(datos(patch)).expect(201)).body.presupuesto;
  }
  async function listar(month = mes, user = ctx.a) {
    return (await req('get', '/presupuestos', user).query({ mes: month }).expect(200)).body;
  }
  async function estado(gastado, porcentaje, status, month = mes, user = ctx.a) {
    const rows = await listar(month, user);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].gastado, gastado);
    assert.equal(rows[0].porcentaje, porcentaje);
    assert.equal(rows[0].estado, status);
    return rows[0];
  }
  function aviso(body, porcentaje, status) {
    if (status === 'ok') assert.equal(Object.hasOwn(body, 'alerta'), false);
    else assert.deepEqual(body.alerta, { categoria_id: ctx.categoria, porcentaje, estado: status });
  }
  it('CP-RF3-01: crea y consulta presupuesto de 2000 sin gastos', async () => {
    const p = await crear({ monto_limite: 2000 });
    assert.deepEqual(p, { id: p.id, categoria_id: ctx.categoria, mes, monto_limite: 2000 });
    const row = await estado(0, 0, 'ok');
    assert.equal(row.id, p.id);
    assert.equal(row.monto_limite, 2000);
    assert.equal(typeof row.categoria, 'string');
  });
  const invalidos = [
    ['CP-RF3-02', -500], ['CP-RF3-M0', 0], ['CP-RF3-MTXT', '1000'],
    ['CP-RF3-MDEC', 1.001], ['CP-RF3-MNULL', null],
  ];
  for (const [id, monto_limite] of invalidos) {
    for (const method of ['post', 'put']) {
      it(`${id}: ${method.toUpperCase()} rechaza ${JSON.stringify(monto_limite)} sin persistir`, async () => {
        const p = method === 'put' ? await crear() : null;
        const before = await listar();
        expectError(await req(method, p ? `/presupuestos/${p.id}` : '/presupuestos')
          .send(datos({ monto_limite })), 400, 'MONTO_INVALIDO');
        assert.deepEqual(await listar(), before);
      });
    }
  }
  it('CP-RF3-DUP: unicidad por usuario, categoría y mes', async () => {
    await crear();
    expectError(await req('post', '/presupuestos').send(datos()), 409, 'PRESUPUESTO_DUPLICADO');
    await crear({}, ctx.b);
    await crear({ mes: '2026-12' });
    await crear({ categoria_id: ctx.otraCategoria });
    assert.equal((await listar()).length, 2);
    assert.equal((await listar(mes, ctx.b)).length, 1);
    assert.equal((await listar('2026-12')).length, 1);
  });
  it('CP-RF3-CRUD: edita límite, recalcula y elimina sin borrar gastos', async () => {
    const p = await crear();
    await ctx.crearGasto(ctx.a, { fecha: `${mes}-15`, monto: 800 });
    const { body } = await req('put', `/presupuestos/${p.id}`).send({ monto_limite: 2000 }).expect(200);
    assert.equal(body.presupuesto.monto_limite, 2000);
    await estado(800, 40, 'ok');
    assert.deepEqual((await req('delete', `/presupuestos/${p.id}`).expect(200)).body, { eliminado: true });
    assert.deepEqual(await listar(), []);
    assert.equal((await ctx.listar()).length, 1);
    expectError(await req('delete', `/presupuestos/${p.id}`), 404, 'PRESUPUESTO_NO_ENCONTRADO');
  });
  for (const month of [undefined, '2026-13', '2026-1', '']) {
    it(`CP-RF3-MES: GET rechaza ${JSON.stringify(month)}`, async () => {
      expectError(await req('get', '/presupuestos').query(month === undefined ? {} : { mes: month }),
        400, 'MES_INVALIDO');
    });
  }
  for (const [id, patch, code] of [
    ['CP-RF3-POST-MES', { mes: '2026-13' }, 'MES_INVALIDO'],
    ['CP-RF3-CAT', { categoria_id: 2147483647 }, 'CATEGORIA_INEXISTENTE'],
  ]) {
    it(id, async () => {
      expectError(await req('post', '/presupuestos').send(datos(patch)), 400, code);
      assert.deepEqual(await listar(), []);
    });
  }
  for (const [attacker, owner] of [['a', 'b'], ['b', 'a']]) {
    for (const method of ['put', 'delete']) {
      it(`CP-RF3-USR: ${attacker} no puede ${method} presupuesto de ${owner}`, async () => {
        const p = await crear({}, ctx[owner]);
        const before = await listar(mes, ctx[owner]);
        const r = req(method, `/presupuestos/${p.id}`, ctx[attacker]);
        expectError(await (method === 'put' ? r.send({ monto_limite: 1 }) : r),
          404, 'PRESUPUESTO_NO_ENCONTRADO');
        assert.deepEqual(await listar(mes, ctx[owner]), before);
        assert.deepEqual(await listar(mes, ctx[attacker]), []);
      });
    }
  }
  for (const method of ['post', 'get', 'put', 'delete']) {
    for (const token of [null, 'invalido']) {
      it(`CP-RF3-AUTH: ${method} con token ${token === null ? 'ausente' : 'inválido'}`, async () => {
        const p = await crear();
        const before = await listar();
        const r = ctx.api[method](['put', 'delete'].includes(method) ? `/presupuestos/${p.id}` : '/presupuestos');
        if (token) r.auth(token, { type: 'bearer' });
        if (['post', 'put'].includes(method)) r.send(datos({ monto_limite: 1 }));
        expectError(await r, 401, 'NO_AUTORIZADO');
        assert.deepEqual(await listar(), before);
      });
    }
  }
  // Se usan importes exactos, no el porcentaje entero de presentación, para el oráculo del estado.
  const escenarios = [
    ['CP-RF4-01', 1000, 700, 100, 800, 80, 'alerta'],
    ['CP-RF4-02', 1000, 950, 100, 1050, 105, 'excedido'],
    ['CP-RF4-03', 1000, 100, 50, 150, 15, 'ok'],
    ['CP-RF4-L7999', 10000, 7000, 999, 7999, 80, 'ok'],
    ['CP-RF4-L80', 10000, 7000, 1000, 8000, 80, 'alerta'],
    ['CP-RF4-L100', 10000, 7000, 3000, 10000, 100, 'alerta'],
    ['CP-RF4-L10001', 10000, 7000, 3001, 10001, 100, 'excedido'],
  ];
  for (const [id, limite, previo, monto, total, porcentaje, status] of escenarios) {
    for (const method of ['post', 'put']) {
      it(`${id}: ${method.toUpperCase()} acumula ${total}/${limite}, ${status}`, async () => {
        await crear({ monto_limite: limite });
        await ctx.crearGasto(ctx.a, { fecha: `${mes}-01`, monto: previo });
        const existing = method === 'put' ? await ctx.crearGasto(ctx.a, { fecha: `${mes}-15`, monto: 1 }) : null;
        const { body } = await req(method, existing ? `/gastos/${existing.id}` : '/gastos')
          .send(ctx.gasto({ fecha: `${mes}-15`, monto })).expect(method === 'post' ? 201 : 200);
        aviso(body, porcentaje, status);
        await estado(total, porcentaje, status);
      });
    }
  }
  it('CP-RF4-AIS: aísla sumas y alertas por usuario, mes y categoría', async () => {
    await crear();
    await crear({}, ctx.b);
    await crear({ mes: '2026-12' });
    await ctx.crearGasto(ctx.b, { fecha: `${mes}-01`, monto: 1000 });
    await ctx.crearGasto(ctx.a, { fecha: '2026-12-01', monto: 1000 });
    await ctx.crearGasto(ctx.a, { fecha: `${mes}-01`, categoria_id: ctx.otraCategoria, monto: 5000 });
    const { body } = await req('post', '/gastos').send(ctx.gasto({ fecha: `${mes}-30`, monto: 799.99 })).expect(201);
    aviso(body, 80, 'ok');
    await estado(799.99, 80, 'ok');
    await estado(1000, 100, 'alerta', mes, ctx.b);
    await estado(1000, 100, 'alerta', '2026-12');
    assert.deepEqual(await listar('2027-01'), []);
  });
  it('CP-RF4-SIN: sin presupuesto no incluye alerta', async () => {
    const { body } = await req('post', '/gastos').send(ctx.gasto({ fecha: `${mes}-01`, monto: 9999 })).expect(201);
    aviso(body, 0, 'ok');
    assert.deepEqual(await listar(), []);
  });
  it('CP-RF4-REC: PUT y DELETE de gastos recalculan el total sin duplicar', async () => {
    await crear();
    const gasto = await ctx.crearGasto(ctx.a, { fecha: `${mes}-01`, monto: 1000.01 });
    await estado(1000.01, 100, 'excedido');
    const { body } = await req('put', `/gastos/${gasto.id}`).send(ctx.gasto({ fecha: `${mes}-01`, monto: 799.99 })).expect(200);
    aviso(body, 80, 'ok');
    await estado(799.99, 80, 'ok');
    await req('delete', `/gastos/${gasto.id}`).expect(200);
    await estado(0, 0, 'ok');
  });
  it('CP-RF4-MOVER: cambiar mes y categoría deja de afectar el presupuesto original', async () => {
    await crear();
    const gasto = await ctx.crearGasto(ctx.a, { fecha: `${mes}-01`, monto: 900 });
    const { body } = await req('put', `/gastos/${gasto.id}`).send(ctx.gasto({ fecha: '2026-12-01', monto: 900 })).expect(200);
    aviso(body, 0, 'ok');
    await estado(0, 0, 'ok');
    await req('put', `/gastos/${gasto.id}`).send(ctx.gasto({ fecha: `${mes}-01`, categoria_id: ctx.otraCategoria, monto: 900 })).expect(200);
    await estado(0, 0, 'ok');
  });
});
