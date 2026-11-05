const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { expectError } = require('../helpers/fixtures.cjs');

module.exports = getContext => describe('QA membresías y reportes (RF5/RF6/RF8)', () => {
  let ctx;
  let categorias;
  const datos = (overrides = {}) => ({ nombre: 'Netflix', costo: 199,
    frecuencia: 'mensual', fecha_cobro: '2026-10-20', ...overrides });
  const get = async (route, user = ctx.a) => (await ctx.api.get(route)
    .auth(user.token, { type: 'bearer' }).expect(200)).body;
  const crear = async (body = datos(), user = ctx.a) => (await ctx.api.post('/membresias')
    .auth(user.token, { type: 'bearer' }).send(body).expect(201)).body.membresia;
  const resumen = (user = ctx.a, mes = '2026-10') => get(`/reportes/resumen?mes=${mes}`, user);
  const porCategoria = (user = ctx.a, mes = '2026-10') => get(`/reportes/por-categoria?mes=${mes}`, user);
  async function cargarGastos(user = ctx.a) {
    for (const [nombre, monto, fecha] of [
      ['Comida', 350, '2026-10-01'], ['Comida', 250, '2026-10-31'],
      ['Transporte', 300, '2026-10-15'], ['Entretenimiento', 100, '2026-10-20'],
      ['Comida', 777, '2026-09-30'], ['Comida', 888, '2026-11-01'],
    ]) await ctx.crearGasto(user, { monto, fecha, categoria_id: categorias[nombre] });
  }
  // Oráculo manual: 600 + 300 + 100 = 1000; 200 + 1200/12 = 300; total 1300.
  async function conciliar(user, variable, fijo, total) {
    const r = await resumen(user);
    const c = await porCategoria(user);
    const m = await get('/membresias', user);
    assert.deepEqual(r, { mes: '2026-10', gasto_variable: variable, gasto_fijo: fijo, total });
    assert.equal(Math.round(c.reduce((s, x) => s + x.total, 0) * 100), variable * 100);
    // Sumar antes de redondear: dos anuales de 100 aportan 16.67, no 16.66.
    assert.equal(Math.round(m.reduce((s, x) => s + (x.frecuencia === 'anual' ? x.costo / 12 : x.costo), 0) * 100), Math.round(fijo * 100));
    assert.equal(Math.round((r.gasto_variable + r.gasto_fijo) * 100), Math.round(total * 100));
    return { r, c, m };
  }
  beforeEach(async () => {
    ctx = getContext();
    await ctx.reset();
    categorias = Object.fromEntries((await get('/categorias')).map(c => [c.nombre, c.id]));
    for (const nombre of ['Comida', 'Transporte', 'Entretenimiento']) assert.ok(categorias[nombre]);
  });

  it('CP-RF5-01: crea y lista nombre, costo, frecuencia y fecha', async () => {
    const m = await crear();
    assert.deepEqual(m, { id: m.id, servicio_id: null, ...datos() });
    const lista = await get('/membresias');
    assert.equal(lista.length, 1);
    assert.deepEqual(lista[0], { ...m, dias_para_cobro: lista[0].dias_para_cobro });
    assert.equal(Number.isInteger(lista[0].dias_para_cobro), true);
  });
  it('CP-RF5-02: edita a 219, elimina y recalcula el resumen', async () => {
    const m = await crear();
    const editada = await ctx.api.put(`/membresias/${m.id}`).auth(ctx.a.token, { type: 'bearer' })
      .send(datos({ costo: 219 })).expect(200);
    assert.equal(editada.body.membresia.costo, 219);
    assert.equal((await get('/membresias'))[0].costo, 219);
    await conciliar(ctx.a, 0, 219, 219);
    const eliminada = await ctx.api.delete(`/membresias/${m.id}`).auth(ctx.a.token, { type: 'bearer' }).expect(200);
    assert.deepEqual(eliminada.body, { eliminado: true });
    assert.deepEqual(await get('/membresias'), []);
    await conciliar(ctx.a, 0, 0, 0);
  });
  for (const [id, patch, code] of [
    ['CP-RF5-03', { nombre: '' }, 'NOMBRE_INVALIDO'],
    ['CP-RF5-04', { costo: 'abc' }, 'COSTO_INVALIDO'],
    ['RF5-COSTO-CERO', { costo: 0 }, 'COSTO_INVALIDO'],
    ['RF5-FRECUENCIA', { frecuencia: 'semanal' }, 'FRECUENCIA_INVALIDA'],
    ['RF5-FECHA', { fecha_cobro: '2026-02-30' }, 'FECHA_INVALIDA'],
    ['RF5-SERVICIO', { servicio_id: 2147483647 }, 'SERVICIO_INEXISTENTE'],
  ]) it(`${id}: rechaza datos inválidos sin persistir`, async () => {
    expectError(await ctx.api.post('/membresias').auth(ctx.a.token, { type: 'bearer' }).send(datos(patch)), 400, code);
    assert.deepEqual(await get('/membresias'), []);
    await conciliar(ctx.a, 0, 0, 0);
  });
  it('RF5-CATALOGO: hereda nombre y costo; permite costo personalizado sin cambiar catálogo', async () => {
    const catalogo = await get('/catalogo');
    const netflix = catalogo.find(s => s.nombre === 'Netflix');
    assert.equal(netflix.costo_sugerido, 199);
    const base = { servicio_id: netflix.id, frecuencia: 'mensual', fecha_cobro: '2026-10-20' };
    const m = await crear(base);
    assert.deepEqual(m, { id: m.id, ...datos(), servicio_id: netflix.id });
    await conciliar(ctx.a, 0, 199, 199);
    await ctx.api.put(`/membresias/${m.id}`).auth(ctx.a.token, { type: 'bearer' })
      .send({ ...base, costo: 219 }).expect(200);
    await conciliar(ctx.a, 0, 219, 219);
    assert.deepEqual(await get('/catalogo'), catalogo);
  });
  it('CP-RF6-01: variable 500 + fijo 300 = total 800', async () => {
    await ctx.crearGasto(ctx.a, { monto: 350 });
    await ctx.crearGasto(ctx.a, { monto: 150 });
    await crear(datos({ costo: 300 }));
    await conciliar(ctx.a, 500, 300, 800);
  });
  it('CP-RF6-02 / CP-RF8-02: sin datos devuelve ceros y arreglos vacíos', async () => {
    const { c, m } = await conciliar(ctx.a, 0, 0, 0);
    assert.deepEqual(c, []);
    assert.deepEqual(m, []);
  });
  it('CP-RF8-01: categorías 600/300/100 con proporciones 60/30/10', async () => {
    await cargarGastos();
    const { c } = await conciliar(ctx.a, 1000, 0, 1000);
    assert.deepEqual(c, [
      { categoria_id: categorias.Comida, categoria: 'Comida', total: 600, porcentaje: 60 },
      { categoria_id: categorias.Transporte, categoria: 'Transporte', total: 300, porcentaje: 30 },
      { categoria_id: categorias.Entretenimiento, categoria: 'Entretenimiento', total: 100, porcentaje: 10 },
    ]);
  });
  it('CONSISTENCIA-ANUAL: tres endpoints concilian 1000 + (200 + 1200/12) = 1300', async () => {
    await cargarGastos();
    await crear(datos({ nombre: 'Gimnasio', costo: 200 }));
    await crear(datos({ nombre: 'Anual', costo: 1200, frecuencia: 'anual', fecha_cobro: '2027-01-01' }));
    const { c, m } = await conciliar(ctx.a, 1000, 300, 1300);
    assert.equal(m.length, 2);
    assert.equal(c.reduce((s, x) => s + x.porcentaje, 0), 100);
    assert.equal((await resumen(ctx.a, '2026-09')).gasto_variable, 777);
    assert.equal((await resumen(ctx.a, '2026-11')).gasto_variable, 888);
  });
  it('CONSISTENCIA-DECIMALES: 0.10 + 0.20 y dos anuales de 100 redondeados al final', async () => {
    await ctx.crearGasto(ctx.a, { monto: 0.1 });
    await ctx.crearGasto(ctx.a, { monto: 0.2, categoria_id: ctx.otraCategoria });
    await crear(datos({ costo: 100, frecuencia: 'anual' }));
    await crear(datos({ costo: 100, frecuencia: 'anual' }));
    await conciliar(ctx.a, 0.3, 16.67, 16.97);
  });
  it('RF8-REDONDEO: tres categorías iguales suman 100 % con orden estable', async () => {
    const ids = Object.values(categorias).slice(0, 3).sort((a, b) => a - b);
    for (const categoria_id of ids) await ctx.crearGasto(ctx.a, { monto: 1, categoria_id });
    const c = await porCategoria();
    assert.deepEqual(c.map(x => x.categoria_id), ids);
    assert.deepEqual(c.map(x => x.porcentaje), [34, 33, 33]);
    await conciliar(ctx.a, 3, 0, 3);
  });
  it('CONSISTENCIA-CAMBIOS: editar y borrar gastos/membresías actualiza ambos reportes', async () => {
    const g = await ctx.crearGasto(ctx.a, { monto: 100 });
    const m = await crear(datos({ costo: 1200, frecuencia: 'anual' }));
    await conciliar(ctx.a, 100, 100, 200);
    await ctx.api.put(`/gastos/${g.id}`).auth(ctx.a.token, { type: 'bearer' })
      .send(ctx.gasto({ monto: 250, categoria_id: ctx.otraCategoria })).expect(200);
    await ctx.api.put(`/membresias/${m.id}`).auth(ctx.a.token, { type: 'bearer' })
      .send(datos({ costo: 2400, frecuencia: 'anual' })).expect(200);
    await conciliar(ctx.a, 250, 200, 450);
    await ctx.api.delete(`/gastos/${g.id}`).auth(ctx.a.token, { type: 'bearer' }).expect(200);
    await ctx.api.delete(`/membresias/${m.id}`).auth(ctx.a.token, { type: 'bearer' }).expect(200);
    await conciliar(ctx.a, 0, 0, 0);
  });
  it('AISLAMIENTO-AB: listas y reportes propios; catálogo compartido sin datos personales', async () => {
    await cargarGastos();
    await crear(datos({ costo: 1200, frecuencia: 'anual' }));
    await ctx.crearGasto(ctx.b, { monto: 999 });
    await crear(datos({ nombre: 'Privada B', costo: 750 }), ctx.b);
    const a = await conciliar(ctx.a, 1000, 100, 1100);
    const b = await conciliar(ctx.b, 999, 750, 1749);
    assert.equal(a.m.length, 1);
    assert.equal(b.m.length, 1);
    assert.notEqual(a.m[0].id, b.m[0].id);
    for (const [route, expected] of [
      ['/membresias', a.m], ['/reportes/resumen?mes=2026-10', a.r],
      ['/reportes/por-categoria?mes=2026-10', a.c],
    ]) assert.deepEqual(await get(`${route}${route.includes('?') ? '&' : '?'}usuario_id=${ctx.b.usuario.id}`), expected);
    assert.deepEqual(await get('/catalogo', ctx.a), await get('/catalogo', ctx.b));
    assert.equal((await get('/catalogo')).some(s => s.nombre === 'Privada B'), false);
  });
  for (const method of ['put', 'delete']) it(`AISLAMIENTO-${method.toUpperCase()}: no modifica membresía ajena ni totales`, async () => {
    const m = await crear(datos({ costo: 1200, frecuencia: 'anual' }));
    const request = ctx.api[method](`/membresias/${m.id}`).auth(ctx.b.token, { type: 'bearer' });
    if (method === 'put') request.send(datos({ costo: 1 }));
    expectError(await request, 404, 'MEMBRESIA_NO_ENCONTRADA');
    assert.equal((await get('/membresias'))[0].costo, 1200);
    await conciliar(ctx.a, 0, 100, 100);
    await conciliar(ctx.b, 0, 0, 0);
  });
  for (const [method, route, body] of [
    ['get', '/catalogo'], ['get', '/membresias'], ['post', '/membresias', datos()],
    ['put', '/membresias/1', datos()], ['delete', '/membresias/1'],
    ['get', '/reportes/resumen?mes=2026-10'], ['get', '/reportes/por-categoria?mes=2026-10'],
  ]) for (const token of [null, 'token-invalido']) it(`AUTH-${method.toUpperCase()} ${route}: ${token ? 'token inválido' : 'sin token'}`, async () => {
    const m = await crear();
    const request = ctx.api[method](route);
    if (token) request.auth(token, { type: 'bearer' });
    if (body) request.send(body);
    expectError(await request, 401, 'NO_AUTORIZADO');
    const lista = await get('/membresias');
    assert.equal(lista.length, 1);
    assert.deepEqual(lista[0], { ...m, dias_para_cobro: lista[0].dias_para_cobro });
    await conciliar(ctx.a, 0, 199, 199);
  });
  for (const route of ['/reportes/resumen', '/reportes/por-categoria']) {
    for (const mes of [null, '', '2026-13', '2026-1', '2026-10-01']) it(`MES-INVALIDO ${route}: ${JSON.stringify(mes)}`, async () => {
      expectError(await ctx.api.get(route).query(mes === null ? {} : { mes })
        .auth(ctx.a.token, { type: 'bearer' }), 400, 'MES_INVALIDO');
    });
  }
});
