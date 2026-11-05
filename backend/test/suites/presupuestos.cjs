const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { expectError } = require('../helpers/fixtures.cjs');

module.exports = getContext => describe('Presupuestos y alertas (RF3/RF4)', () => {
  let ctx;
  beforeEach(async () => { ctx = getContext(); await ctx.reset(); });

  const call = (method, route, body, user = ctx.a) =>
    ctx.api[method](route).auth(user.token, { type: 'bearer' }).send(body);
  async function crear(overrides = {}, user = ctx.a) {
    const response = await call('post', '/presupuestos', {
      categoria_id: ctx.categoria, mes: '2026-10', monto_limite: 1000, ...overrides,
    }, user).expect(201);
    return response.body.presupuesto;
  }
  async function listar(mes = '2026-10', user = ctx.a) {
    return (await call('get', `/presupuestos?mes=${mes}`, undefined, user).expect(200)).body;
  }
  function estado(presupuesto, gastado, porcentaje, esperado) {
    assert.equal(presupuesto.gastado, gastado);
    assert.equal(presupuesto.porcentaje, porcentaje);
    assert.equal(presupuesto.estado, esperado);
  }
  function aviso(response, porcentaje, esperado, categoria = ctx.categoria) {
    if (esperado === 'ok') assert.equal(Object.hasOwn(response.body, 'alerta'), false);
    else assert.deepEqual(response.body.alerta, {
      categoria_id: categoria, porcentaje, estado: esperado,
    });
  }

  it('CP-RF3-01: crea y consulta presupuesto de 2000 sin gastos', async () => {
    const p = await crear({ monto_limite: 2000 });
    assert.deepEqual(p, { id: p.id, categoria_id: ctx.categoria, mes: '2026-10', monto_limite: 2000 });
    assert.equal(typeof p.id, 'number');
    const [actual] = await listar();
    assert.deepEqual(actual, { ...p, categoria: actual.categoria, gastado: 0, porcentaje: 0, estado: 'ok' });
    assert.equal(typeof actual.categoria, 'string');
  });

  const invalidos = [
    ['CP-RF3-02', { monto_limite: -500 }, 'MONTO_INVALIDO'],
    ['RF3-CERO', { monto_limite: 0 }, 'MONTO_INVALIDO'],
    ['RF3-TEXTO', { monto_limite: '1000' }, 'MONTO_INVALIDO'],
    ['RF3-DECIMALES', { monto_limite: 0.001 }, 'MONTO_INVALIDO'],
    ['RF3-PRECISION', { monto_limite: 1000.001 }, 'MONTO_INVALIDO'],
    ['RF3-MAXIMO', { monto_limite: 10000000000 }, 'MONTO_INVALIDO'],
    ['RF3-MES', { mes: '2026-13' }, 'MES_INVALIDO'],
    ['RF3-CATEGORIA', { categoria_id: 2147483647 }, 'CATEGORIA_INEXISTENTE'],
  ];
  for (const [id, patch, code] of invalidos) {
    it(`${id}: creación inválida no persiste datos`, async () => {
      const response = await call('post', '/presupuestos', {
        categoria_id: ctx.categoria, mes: '2026-10', monto_limite: 1000, ...patch,
      });
      expectError(response, 400, code);
      assert.deepEqual(await listar(), []);
    });
  }

  it('RF3-DUPLICADO: 409 sin modificar el presupuesto original', async () => {
    const p = await crear();
    expectError(await call('post', '/presupuestos', { ...p, monto_limite: 2000 }), 409, 'PRESUPUESTO_DUPLICADO');
    assert.equal((await listar()).length, 1);
    assert.equal((await listar())[0].monto_limite, 1000);
  });

  it('RF3-CRUD: modifica límite, recalcula estado y elimina sin borrar gastos', async () => {
    const p = await crear();
    await ctx.crearGasto(ctx.a, { monto: 800 });
    const updated = await call('put', `/presupuestos/${p.id}`, { monto_limite: 2000 }).expect(200);
    assert.equal(updated.body.presupuesto.monto_limite, 2000);
    estado((await listar())[0], 800, 40, 'ok');
    await call('put', `/presupuestos/${p.id}`, { monto_limite: 500 }).expect(200);
    estado((await listar())[0], 800, 160, 'excedido');
    const deleted = await call('delete', `/presupuestos/${p.id}`).expect(200);
    assert.deepEqual(deleted.body, { eliminado: true });
    assert.deepEqual(await listar(), []);
    assert.equal((await ctx.listar()).length, 1);
  });

  it('RF3-PUT-INVALIDO: rechaza -500 sin alterar límite ni estado', async () => {
    const p = await crear();
    expectError(await call('put', `/presupuestos/${p.id}`, { monto_limite: -500 }), 400, 'MONTO_INVALIDO');
    assert.equal((await listar())[0].monto_limite, 1000);
    estado((await listar())[0], 0, 0, 'ok');
  });

  for (const mes of [undefined, '', '2026-1', '2026-00', '2026-13', '2026-10-01']) {
    it(`RF3-GET-MES: rechaza mes ${JSON.stringify(mes)}`, async () => {
      expectError(await call('get', mes === undefined ? '/presupuestos' : `/presupuestos?mes=${mes}`), 400, 'MES_INVALIDO');
    });
  }

  // Porcentajes de respuesta enteros según la presentación actual. El estado
  // se comprueba con montos exactos, nunca usando el porcentaje redondeado.
  for (const [id, previo, monto, gastado, porcentaje, esperado] of [
    ['CP-RF4-01', 700, 100, 800, 80, 'alerta'],
    ['CP-RF4-02', 950, 100, 1050, 105, 'excedido'],
    ['CP-RF4-03', 100, 50, 150, 15, 'ok'],
    ['CP-RF4-04-L7999', 700, 99.9, 799.9, 80, 'ok'],
    ['CP-RF4-05-L8000', 700, 100, 800, 80, 'alerta'],
    ['CP-RF4-06-L10000', 950, 50, 1000, 100, 'alerta'],
    ['CP-RF4-07-L10001', 950, 50.1, 1000.1, 100, 'excedido'],
  ]) {
    for (const method of ['post', 'put']) {
      it(`${id}-${method.toUpperCase()}: total ${gastado}, ${esperado}, porcentaje ${porcentaje}`, async () => {
        await crear();
        await ctx.crearGasto(ctx.a, { monto: previo });
        let response;
        if (method === 'post') response = await call('post', '/gastos', ctx.gasto({ monto })).expect(201);
        else {
          const g = await ctx.crearGasto(ctx.a, { monto: 0.01 });
          response = await call('put', `/gastos/${g.id}`, ctx.gasto({ monto })).expect(200);
        }
        assert.equal(response.body.gasto.monto, monto);
        aviso(response, porcentaje, esperado);
        estado((await listar())[0], gastado, porcentaje, esperado);
      });
    }
  }

  it('RF4-CENTAVO: límite 100 y gasto 100.01 ya es excedido', async () => {
    await crear({ monto_limite: 100 });
    const response = await call('post', '/gastos', ctx.gasto({ monto: 100.01 })).expect(201);
    aviso(response, 100, 'excedido');
    estado((await listar())[0], 100.01, 100, 'excedido');
  });

  it('RF4-SIN-PRESUPUESTO: crear y editar gasto no incluyen alerta', async () => {
    const response = await call('post', '/gastos', ctx.gasto({ monto: 9999 })).expect(201);
    aviso(response, 0, 'ok');
    aviso(await call('put', `/gastos/${response.body.gasto.id}`, ctx.gasto({ monto: 9998 })).expect(200), 0, 'ok');
  });

  it('RF4-RECALCULO: editar y borrar gastos retira alertas y recalcula el total', async () => {
    await crear();
    const g = await ctx.crearGasto(ctx.a, { monto: 1000.1 });
    const edited = await call('put', `/gastos/${g.id}`, ctx.gasto({ monto: 799.9 })).expect(200);
    aviso(edited, 80, 'ok');
    estado((await listar())[0], 799.9, 80, 'ok');
    await call('delete', `/gastos/${g.id}`).expect(200);
    estado((await listar())[0], 0, 0, 'ok');
  });

  it('RF3/RF4-USUARIOS: misma categoría y mes con límites, gastos y alertas propios', async () => {
    const a = await crear();
    const b = await crear({ monto_limite: 2000 }, ctx.b);
    const ra = await call('post', '/gastos', ctx.gasto({ monto: 150 })).expect(201);
    const rb = await call('post', '/gastos', ctx.gasto({ monto: 2100 }), ctx.b).expect(201);
    aviso(ra, 15, 'ok'); aviso(rb, 105, 'excedido');
    const listaA = await listar(); const listaB = await listar('2026-10', ctx.b);
    assert.deepEqual(listaA.map(p => p.id), [a.id]);
    assert.deepEqual(listaB.map(p => p.id), [b.id]);
    estado(listaA[0], 150, 15, 'ok'); estado(listaB[0], 2100, 105, 'excedido');
  });

  for (const method of ['put', 'delete']) {
    it(`RF3-PRIVACIDAD-${method.toUpperCase()}: B no modifica ni elimina presupuesto A`, async () => {
      const p = await crear();
      expectError(await call(method, `/presupuestos/${p.id}`, method === 'put' ? { monto_limite: 1 } : undefined, ctx.b), 404, 'PRESUPUESTO_NO_ENCONTRADO');
      assert.equal((await listar())[0].monto_limite, 1000);
      assert.deepEqual(await listar('2026-10', ctx.b), []);
    });
  }

  it('RF3/RF4-MESES: septiembre/octubre/noviembre y cambio de año quedan aislados', async () => {
    for (const mes of ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01']) await crear({ mes });
    await ctx.crearGasto(ctx.a, { monto: 2000, fecha: '2026-09-30' });
    aviso(await call('post', '/gastos', ctx.gasto({ monto: 100, fecha: '2026-10-01' })).expect(201), 10, 'ok');
    await ctx.crearGasto(ctx.a, { monto: 700, fecha: '2026-10-31' });
    await ctx.crearGasto(ctx.a, { monto: 3000, fecha: '2026-11-01' });
    await ctx.crearGasto(ctx.a, { monto: 4000, fecha: '2026-12-31' });
    aviso(await call('post', '/gastos', ctx.gasto({ monto: 150, fecha: '2027-01-01' })).expect(201), 15, 'ok');
    for (const [mes, total, porcentaje, esperado] of [
      ['2026-09', 2000, 200, 'excedido'], ['2026-10', 800, 80, 'alerta'],
      ['2026-11', 3000, 300, 'excedido'], ['2026-12', 4000, 400, 'excedido'],
      ['2027-01', 150, 15, 'ok'],
    ]) {
      const lista = await listar(mes);
      assert.equal(lista.length, 1); assert.equal(lista[0].mes, mes);
      estado(lista[0], total, porcentaje, esperado);
    }
    assert.deepEqual(await listar('2027-02'), []);
  });

  it('RF3/RF4-CATEGORIAS: otra categoría no contamina total ni alerta', async () => {
    await crear(); await crear({ categoria_id: ctx.otraCategoria });
    await ctx.crearGasto(ctx.a, { monto: 1100, categoria_id: ctx.otraCategoria });
    aviso(await call('post', '/gastos', ctx.gasto({ monto: 150 })).expect(201), 15, 'ok');
    const lista = await listar();
    estado(lista.find(p => p.categoria_id === ctx.categoria), 150, 15, 'ok');
    estado(lista.find(p => p.categoria_id === ctx.otraCategoria), 1100, 110, 'excedido');
  });

  it('RF4-TRASLADO: cambiar categoría y mes recalcula origen y destino', async () => {
    await crear(); await crear({ categoria_id: ctx.otraCategoria, mes: '2026-11' });
    const g = await ctx.crearGasto(ctx.a, { monto: 1000.1 });
    const response = await call('put', `/gastos/${g.id}`, ctx.gasto({
      monto: 1000.1, categoria_id: ctx.otraCategoria, fecha: '2026-11-01',
    })).expect(200);
    aviso(response, 100, 'excedido', ctx.otraCategoria);
    estado((await listar())[0], 0, 0, 'ok');
    estado((await listar('2026-11'))[0], 1000.1, 100, 'excedido');
  });

  for (const [method, route, body] of [
    ['get', '/presupuestos?mes=2026-10'],
    ['post', '/presupuestos', { categoria_id: 1, mes: '2026-10', monto_limite: 1000 }],
    ['put', '/presupuestos/1', { monto_limite: 1000 }],
    ['delete', '/presupuestos/1'],
  ]) {
    for (const token of [undefined, 'invalido']) {
      it(`RF3-AUTH-${method.toUpperCase()}: ${token ? 'token inválido' : 'sin token'}`, async () => {
        let req = ctx.api[method](route);
        if (token) req = req.auth(token, { type: 'bearer' });
        expectError(await req.send(body), 401, 'NO_AUTORIZADO');
        assert.deepEqual(await listar(), []);
      });
    }
  }
});
