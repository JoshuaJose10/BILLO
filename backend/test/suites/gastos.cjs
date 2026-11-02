const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { expectError } = require('../helpers/fixtures.cjs');

module.exports = getContext => describe('Gastos (Postman 03 / RF2)', () => {
  let ctx;
  beforeEach(async () => { ctx = getContext(); await ctx.reset(); });

  it('crea un gasto con la forma y los tipos del contrato', async () => {
    const gasto = await ctx.crearGasto();
    assert.deepEqual(gasto, { id: gasto.id, ...ctx.gasto() });
    assert.equal(typeof gasto.id, 'number');
    assert.equal(typeof gasto.monto, 'number');
    assert.deepEqual(await ctx.listar(), [gasto]);
  });
  it('sin gastos devuelve un arreglo vacío', async () => {
    assert.deepEqual(await ctx.listar(), []);
  });
  it('nota omitida se persiste como null', async () => {
    const gasto = await ctx.crearGasto(ctx.a, { nota: undefined });
    assert.equal(gasto.nota, null);
    assert.deepEqual(await ctx.listar(), [gasto]);
  });
  it('acepta nota de 200 caracteres y el monto mínimo 0.01', async () => {
    const gasto = await ctx.crearGasto(ctx.a, { nota: 'a'.repeat(200), monto: 0.01 });
    assert.equal(gasto.monto, 0.01);
    assert.equal(gasto.nota.length, 200);
    assert.deepEqual(await ctx.listar(), [gasto]);
  });
  for (const metodo of ['tarjeta', 'transferencia', 'otro']) {
    it(`acepta método de pago ${metodo}`, async () => {
      assert.equal((await ctx.crearGasto(ctx.a, { metodo_pago: metodo })).metodo_pago, metodo);
    });
  }

  // Postman QA-GAS-POST/PUT-*; cada fila corre como prueba independiente.
  const invalidos = [
    ['monto de texto', { monto: 'ochenta' }, 'MONTO_INVALIDO'],
    ['monto cero', { monto: 0 }, 'MONTO_INVALIDO'],
    ['monto negativo', { monto: -1 }, 'MONTO_INVALIDO'],
    ['BUG-RF2-01: más de dos decimales', { monto: 80.555 }, 'MONTO_INVALIDO'],
    ['BUG-RF2-01: subcentavo', { monto: 0.001 }, 'MONTO_INVALIDO'],
    ['BUG-RF2-02: monto como cadena numérica', { monto: '80.50' }, 'MONTO_INVALIDO'],
    ['categoría inexistente', { categoria_id: 2147483647 }, 'CATEGORIA_INEXISTENTE'],
    ['BUG-RF2-03: categoría booleana', { categoria_id: true }, 'CATEGORIA_INEXISTENTE'],
    ['categoría vacía', { categoria_id: null }, 'CATEGORIA_INEXISTENTE'],
    ['categoría fraccionaria', { categoria_id: 1.5 }, 'CATEGORIA_INEXISTENTE'],
    ['categoría como cadena', { categoria_id: '1' }, 'CATEGORIA_INEXISTENTE'],
    ['fecha imposible', { fecha: '2026-02-30' }, 'FECHA_INVALIDA'],
    ['fecha con formato incorrecto', { fecha: '05/10/2026' }, 'FECHA_INVALIDA'],
    ['método inválido', { metodo_pago: 'bitcoin' }, 'METODO_PAGO_INVALIDO'],
    ['nota de más de 200 caracteres', { nota: 'a'.repeat(201) }, 'NOTA_INVALIDA'],
    ['nota no textual', { nota: 42 }, 'NOTA_INVALIDA'],
    ['BUG-RF2-06: sin cuerpo', undefined, 'MONTO_INVALIDO'],
  ];
  for (const method of ['post', 'put']) {
    for (const [name, patch, code] of invalidos) {
      it(`${method.toUpperCase()} rechaza ${name} (BUG-RF2-04: error estructurado)`, async () => {
        const existing = method === 'put' ? await ctx.crearGasto() : undefined;
        const before = await ctx.listar();
        const req = ctx.api[method](existing ? `/gastos/${existing.id}` : '/gastos')
          .auth(ctx.a.token, { type: 'bearer' });
        expectError(await (patch === undefined ? req : req.send(ctx.gasto(patch))), 400, code);
        assert.deepEqual(await ctx.listar(), before, 'El rechazo no debe insertar ni modificar gastos');
      });
    }
  }

  it('PUT actualiza todos los campos y persiste los cambios', async () => {
    const gasto = await ctx.crearGasto();
    const changes = ctx.gasto({ monto: 120.25, categoria_id: ctx.otraCategoria,
      fecha: '2026-11-01', metodo_pago: 'tarjeta', nota: 'Actualizado' });
    const { body } = await ctx.api.put(`/gastos/${gasto.id}`).auth(ctx.a.token, { type: 'bearer' })
      .send(changes).expect(200);
    assert.deepEqual(body.gasto, { id: gasto.id, ...changes });
    assert.deepEqual(await ctx.listar(), [body.gasto]);
  });
  it('DELETE elimina, persiste la ausencia y un segundo borrado da 404', async () => {
    const gasto = await ctx.crearGasto();
    const { body } = await ctx.api.delete(`/gastos/${gasto.id}`)
      .auth(ctx.a.token, { type: 'bearer' }).expect(200);
    assert.deepEqual(body, { eliminado: true });
    assert.deepEqual(await ctx.listar(), []);
    expectError(await ctx.api.delete(`/gastos/${gasto.id}`).auth(ctx.a.token, { type: 'bearer' }),
      404, 'GASTO_NO_ENCONTRADO');
  });
  it('listados de A y B contienen únicamente sus gastos', async () => {
    const a = await ctx.crearGasto(ctx.a);
    const b = await ctx.crearGasto(ctx.b, { nota: 'Privado B' });
    assert.deepEqual(await ctx.listar(ctx.a), [a]);
    assert.deepEqual(await ctx.listar(ctx.b), [b]);
  });
  for (const [attacker, owner] of [['a', 'b'], ['b', 'a']]) {
    for (const method of ['put', 'delete']) {
      it(`${attacker.toUpperCase()} no puede ${method.toUpperCase()} un gasto de ${owner.toUpperCase()}`, async () => {
        const gasto = await ctx.crearGasto(ctx[owner]);
        const req = ctx.api[method](`/gastos/${gasto.id}`).auth(ctx[attacker].token, { type: 'bearer' });
        expectError(await (method === 'put' ? req.send(ctx.gasto({ monto: 999 })) : req),
          404, 'GASTO_NO_ENCONTRADO');
        assert.deepEqual(await ctx.listar(ctx[owner]), [gasto], 'El gasto ajeno debe permanecer intacto');
        assert.deepEqual(await ctx.listar(ctx[attacker]), []);
      });
    }
  }

  it('filtra mes, categoría y su combinación sin filtrar datos ajenos', async () => {
    const first = await ctx.crearGasto();
    const second = await ctx.crearGasto(ctx.a, { categoria_id: ctx.otraCategoria });
    const third = await ctx.crearGasto(ctx.a, { fecha: '2026-11-01' });
    await ctx.crearGasto(ctx.b);
    assert.deepEqual(await ctx.listar(ctx.a, { mes: '2026-10' }), [second, first]);
    assert.deepEqual(await ctx.listar(ctx.a, { categoria_id: ctx.categoria }), [third, first]);
    assert.deepEqual(await ctx.listar(ctx.a, { mes: '2026-10', categoria_id: ctx.categoria }), [first]);
    assert.deepEqual(await ctx.listar(ctx.a, { mes: '2025-01' }), []);
  });
  it('ordena por fecha descendente y desempata por id descendente', async () => {
    const first = await ctx.crearGasto();
    const second = await ctx.crearGasto();
    const older = await ctx.crearGasto(ctx.a, { fecha: '2026-09-01' });
    assert.deepEqual(await ctx.listar(), [second, first, older]);
  });
  for (const mes of ['2026-13', '2026-1', 'incorrecto', '']) {
    it(`rechaza filtro de mes ${JSON.stringify(mes)}`, async () => {
      expectError(await ctx.api.get('/gastos').auth(ctx.a.token, { type: 'bearer' }).query({ mes }),
        400, 'MES_INVALIDO');
    });
  }
  for (const categoria_id of ['abc', 0, -1, 1.5]) {
    it(`rechaza filtro de categoría ${categoria_id}`, async () => {
      expectError(await ctx.api.get('/gastos').auth(ctx.a.token, { type: 'bearer' }).query({ categoria_id }),
        400, 'CATEGORIA_INEXISTENTE');
    });
  }
  for (const method of ['put', 'delete']) {
    for (const id of ['abc', '0', '-1', '1.5', '2147483647']) {
      it(`${method.toUpperCase()} de id inválido o inexistente ${id} da 404`, async () => {
        const req = ctx.api[method](`/gastos/${id}`).auth(ctx.a.token, { type: 'bearer' });
        expectError(await (method === 'put' ? req.send(ctx.gasto()) : req), 404, 'GASTO_NO_ENCONTRADO');
      });
    }
  }
  for (const method of ['get', 'post', 'put', 'delete']) {
    for (const invalid of [false, true]) {
      it(`BUG-RF2-05: ${method.toUpperCase()} con token ${invalid ? 'inválido' : 'ausente'} da NO_AUTORIZADO`, async () => {
        const gasto = await ctx.crearGasto();
        const req = ctx.api[method](['put', 'delete'].includes(method) ? `/gastos/${gasto.id}` : '/gastos');
        if (invalid) req.auth('token-invalido', { type: 'bearer' });
        if (['post', 'put'].includes(method)) req.send(ctx.gasto({ monto: 999 }));
        expectError(await req, 401, 'NO_AUTORIZADO');
        assert.deepEqual(await ctx.listar(), [gasto]);
      });
    }
  }
});
