const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { expectError } = require('../helpers/fixtures.cjs');

const MIGRACION_020 = fs.readFileSync(
  path.resolve(__dirname, '../../migrations/020_categorias_usuario.sql'),
  'utf8'
);

module.exports = (getContext) =>
  describe('Categorías por usuario (feature/categorias-usuario)', () => {
    let ctx;
    let PALETA_COLORES_CATEGORIAS;
    let MAX_CATEGORIAS_PROPIAS;
    beforeEach(async () => {
      ctx = getContext();
      ({
        PALETA_COLORES_CATEGORIAS,
        MAX_CATEGORIAS_PROPIAS,
      } = require('../../src/controllers/categorias.controller'));
      await ctx.reset();
    });

    it('migración 020 es idempotente y asigna predefinidas a usuarios existentes sin tocar los recién registrados', async () => {
      // Simular un usuario previo a la migración (categorias_configuradas = TRUE y 0 filas en usuario_categorias)
      await ctx.pool.query('DELETE FROM usuario_categorias WHERE usuario_id = $1', [
        ctx.a.usuario.id,
      ]);

      // Registrar usuario nuevo (categorias_configuradas = FALSE)
      const { body: regBody } = await ctx.api
        .post('/auth/register')
        .send({
          nombre: 'Nuevo',
          email: 'nuevo.mig@example.com',
          password: ctx.password,
        })
        .expect(201);
      assert.equal(regBody.usuario.categorias_configuradas, false);

      // El registro ya le asignó las predefinidas de gasto: la migración no debe cambiar eso
      const { rows: antesNuevo } = await ctx.pool.query(
        'SELECT categoria_id FROM usuario_categorias WHERE usuario_id = $1 ORDER BY categoria_id',
        [regBody.usuario.id]
      );

      // Re-ejecutar migración 020 dos veces
      await ctx.pool.query(MIGRACION_020);
      await ctx.pool.query(MIGRACION_020);

      const { rows: predefinidas } = await ctx.pool.query(
        "SELECT id FROM categorias WHERE es_predefinida = TRUE AND usuario_id IS NULL AND tipo = 'gasto' ORDER BY id"
      );

      // Usuario existente A recupera todas las predefinidas de gasto
      const { rows: ucA } = await ctx.pool.query(
        'SELECT categoria_id FROM usuario_categorias WHERE usuario_id = $1 ORDER BY categoria_id',
        [ctx.a.usuario.id]
      );
      assert.deepEqual(
        ucA.map((r) => r.categoria_id),
        predefinidas.map((r) => r.id)
      );

      // Usuario nuevo conserva categorias_configuradas = FALSE y su selección queda igual
      const { rows: ucNuevo } = await ctx.pool.query(
        'SELECT categoria_id FROM usuario_categorias WHERE usuario_id = $1 ORDER BY categoria_id',
        [regBody.usuario.id]
      );
      assert.deepEqual(ucNuevo, antesNuevo);
      const { rows: cfg } = await ctx.pool.query(
        'SELECT categorias_configuradas FROM usuarios WHERE id = $1',
        [regBody.usuario.id]
      );
      assert.equal(cfg[0].categorias_configuradas, false);
    });

    it('usuario existente conserva predefinidas disponibles y recibe error 401 sin token', async () => {
      expectError(await ctx.api.get('/categorias'), 401, 'NO_AUTORIZADO');
      expectError(
        await ctx.api.get('/categorias/predefinidas'),
        401,
        'NO_AUTORIZADO'
      );

      const { body } = await ctx.api
        .get('/categorias')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);

      assert.ok(Array.isArray(body));
      assert.ok(body.length >= 6);
      for (const cat of body) {
        assert.equal(cat.es_predefinida, true);
        assert.equal(cat.propia, false);
        assert.equal(cat.color, null);
      }

      expectError(
        await ctx.api
          .get('/categorias?tipo=invalido')
          .auth(ctx.a.token, { type: 'bearer' }),
        400,
        'TIPO_INVALIDO'
      );
    });

    it('usuario nuevo registra categorias_configuradas=false, consulta catálogo y configura su selección', async () => {
      const { body: regBody } = await ctx.api
        .post('/auth/register')
        .send({
          nombre: 'Clara',
          email: 'clara@example.com',
          password: ctx.password,
        })
        .expect(201);
      assert.equal(regBody.usuario.categorias_configuradas, false);
      const token = regBody.token;

      // Al registrarse ya tiene las predefinidas de gasto seleccionadas (nunca queda sin categorías)
      const { body: catInicial } = await ctx.api
        .get('/categorias')
        .auth(token, { type: 'bearer' })
        .expect(200);
      assert.ok(catInicial.length >= 6);
      assert.ok(catInicial.every((c) => c.es_predefinida === true));

      // Catálogo completo de predefinidas con seleccionada: false
      const { body: predAntes } = await ctx.api
        .get('/categorias/predefinidas')
        .auth(token, { type: 'bearer' })
        .expect(200);
      assert.ok(predAntes.categorias.length >= 6);
      assert.ok(
        predAntes.categorias.filter((c) => c.tipo === 'gasto').every((c) => c.seleccionada === true)
      );

      // Seleccionar 2 predefinidas
      const elegidas = [
        predAntes.categorias[0].id,
        predAntes.categorias[2].id,
      ];
      const { body: selBody } = await ctx.api
        .put('/categorias/seleccion')
        .auth(token, { type: 'bearer' })
        .send({ categoria_ids: elegidas })
        .expect(200);
      assert.equal(selBody.categorias_configuradas, true);
      assert.deepEqual(selBody.categoria_ids, elegidas);
      assert.deepEqual(
        selBody.categorias.map((c) => c.id),
        elegidas
      );

      // GET /categorias solo devuelve las elegidas
      const { body: catDespues } = await ctx.api
        .get('/categorias')
        .auth(token, { type: 'bearer' })
        .expect(200);
      assert.deepEqual(
        catDespues.map((c) => c.id),
        elegidas
      );

      // GET /categorias/predefinidas refleja seleccionada: true solo en las elegidas
      const { body: predDespues } = await ctx.api
        .get('/categorias/predefinidas')
        .auth(token, { type: 'bearer' })
        .expect(200);
      for (const c of predDespues.categorias) {
        assert.equal(c.seleccionada, elegidas.includes(c.id));
      }

      // Login ahora reporta categorias_configuradas: true
      const { body: loginBody } = await ctx.api
        .post('/auth/login')
        .send({ email: 'clara@example.com', password: ctx.password })
        .expect(200);
      assert.equal(loginBody.usuario.categorias_configuradas, true);
    });

    it('PUT /categorias/seleccion valida selección vacía, ids inválidos y no acepta categorías propias', async () => {
      expectError(
        await ctx.api
          .put('/categorias/seleccion')
          .auth(ctx.a.token, { type: 'bearer' })
          .send({ categoria_ids: [] }),
        400,
        'SELECCION_VACIA'
      );

      expectError(
        await ctx.api
          .put('/categorias/seleccion')
          .auth(ctx.a.token, { type: 'bearer' })
          .send({}),
        400,
        'SELECCION_VACIA'
      );

      expectError(
        await ctx.api
          .put('/categorias/seleccion')
          .auth(ctx.a.token, { type: 'bearer' })
          .send({ categoria_ids: [999999] }),
        400,
        'CATEGORIA_INEXISTENTE'
      );

      // Crear una categoría propia e intentar incluirla en /seleccion
      const { body: propia } = await ctx.api
        .post('/categorias')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ nombre: 'Mascotas' })
        .expect(201);

      expectError(
        await ctx.api
          .put('/categorias/seleccion')
          .auth(ctx.a.token, { type: 'bearer' })
          .send({ categoria_ids: [propia.categoria.id] }),
        400,
        'CATEGORIA_INEXISTENTE'
      );
    });

    it('CRUD de categorías propias: color rotativo, validaciones, unicidad por usuario y aislamiento', async () => {
      // Validaciones de nombre
      for (const nombreInvalido of ['', '   ', null, 123, 'a'.repeat(41)]) {
        expectError(
          await ctx.api
            .post('/categorias')
            .auth(ctx.a.token, { type: 'bearer' })
            .send({ nombre: nombreInvalido }),
          400,
          'NOMBRE_INVALIDO'
        );
      }

      // Crear 13 categorías para verificar que la paleta de 12 colores rota
      const creadas = [];
      for (let i = 0; i < 13; i += 1) {
        const { body } = await ctx.api
          .post('/categorias')
          .auth(ctx.a.token, { type: 'bearer' })
          .send({ nombre: `  Propia ${i + 1}  ` })
          .expect(201);
        assert.equal(body.categoria.nombre, `Propia ${i + 1}`);
        assert.equal(body.categoria.tipo, 'gasto');
        assert.equal(body.categoria.es_predefinida, false);
        assert.equal(body.categoria.propia, true);
        assert.equal(
          body.categoria.color,
          PALETA_COLORES_CATEGORIAS[i % PALETA_COLORES_CATEGORIAS.length]
        );
        creadas.push(body.categoria);
      }

      // Duplicada sin importar mayúsculas/espacios -> 409 CATEGORIA_DUPLICADA
      expectError(
        await ctx.api
          .post('/categorias')
          .auth(ctx.a.token, { type: 'bearer' })
          .send({ nombre: '  pRoPiA 1 ' }),
        409,
        'CATEGORIA_DUPLICADA'
      );

      // Usuario B NO ve las propias de A, NO puede editarlas ni borrarlas, pero SÍ puede crear el mismo nombre
      const { body: listB } = await ctx.api
        .get('/categorias')
        .auth(ctx.b.token, { type: 'bearer' })
        .expect(200);
      assert.ok(!listB.some((c) => c.id === creadas[0].id));

      expectError(
        await ctx.api
          .put(`/categorias/${creadas[0].id}`)
          .auth(ctx.b.token, { type: 'bearer' })
          .send({ nombre: 'Hack' }),
        404,
        'CATEGORIA_NO_ENCONTRADA'
      );

      expectError(
        await ctx.api
          .delete(`/categorias/${creadas[0].id}`)
          .auth(ctx.b.token, { type: 'bearer' }),
        404,
        'CATEGORIA_NO_ENCONTRADA'
      );

      const { body: propiaB } = await ctx.api
        .post('/categorias')
        .auth(ctx.b.token, { type: 'bearer' })
        .send({ nombre: 'Propia 1' })
        .expect(201);
      assert.equal(propiaB.categoria.nombre, 'Propia 1');

      // No se puede renombrar ni eliminar una predefinida
      expectError(
        await ctx.api
          .put(`/categorias/${ctx.categoria}`)
          .auth(ctx.a.token, { type: 'bearer' })
          .send({ nombre: 'Renombrada' }),
        404,
        'CATEGORIA_NO_ENCONTRADA'
      );
      expectError(
        await ctx.api
          .delete(`/categorias/${ctx.categoria}`)
          .auth(ctx.a.token, { type: 'bearer' }),
        404,
        'CATEGORIA_NO_ENCONTRADA'
      );

      // Renombrar propia con validaciones
      expectError(
        await ctx.api
          .put(`/categorias/${creadas[0].id}`)
          .auth(ctx.a.token, { type: 'bearer' })
          .send({ nombre: 'PROPIA 2' }),
        409,
        'CATEGORIA_DUPLICADA'
      );

      const { body: editada } = await ctx.api
        .put(`/categorias/${creadas[0].id}`)
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ nombre: 'Mascotas' })
        .expect(200);
      assert.equal(editada.categoria.nombre, 'Mascotas');

      // Eliminar propia sin uso
      const { body: delBody } = await ctx.api
        .delete(`/categorias/${creadas[12].id}`)
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.deepEqual(delBody, { eliminado: true });
    });

    it('respeta el límite máximo de 30 categorías propias por usuario', async () => {
      for (let i = 0; i < MAX_CATEGORIAS_PROPIAS; i += 1) {
        await ctx.api
          .post('/categorias')
          .auth(ctx.a.token, { type: 'bearer' })
          .send({ nombre: `Extra ${i + 1}` })
          .expect(201);
      }

      expectError(
        await ctx.api
          .post('/categorias')
          .auth(ctx.a.token, { type: 'bearer' })
          .send({ nombre: 'Extra 31' }),
        400,
        'LIMITE_CATEGORIAS_ALCANZADO'
      );

      // Usuario B aún puede crear sus propias categorías
      await ctx.api
        .post('/categorias')
        .auth(ctx.b.token, { type: 'bearer' })
        .send({ nombre: 'Propia B' })
        .expect(201);
    });

    it('bloquea borrar categoría propia en uso por gastos o presupuestos (409 CATEGORIA_EN_USO)', async () => {
      const { body: c1 } = await ctx.api
        .post('/categorias')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ nombre: 'Con gasto' })
        .expect(201);

      const { body: c2 } = await ctx.api
        .post('/categorias')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ nombre: 'Con presupuesto' })
        .expect(201);

      await ctx.crearGasto(ctx.a, { categoria_id: c1.categoria.id, monto: 120 });

      await ctx.api
        .post('/presupuestos')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({
          categoria_id: c2.categoria.id,
          mes: '2026-10',
          monto_limite: 500,
        })
        .expect(201);

      expectError(
        await ctx.api
          .delete(`/categorias/${c1.categoria.id}`)
          .auth(ctx.a.token, { type: 'bearer' }),
        409,
        'CATEGORIA_EN_USO'
      );

      expectError(
        await ctx.api
          .delete(`/categorias/${c2.categoria.id}`)
          .auth(ctx.a.token, { type: 'bearer' }),
        409,
        'CATEGORIA_EN_USO'
      );
    });

    it('ocultar una predefinida conserva sus gastos en listados/reportes pero impide usarla en nuevos gastos/presupuestos', async () => {
      // Crear gasto y presupuesto con ctx.categoria antes de ocultarla
      const gastoViejo = await ctx.crearGasto(ctx.a, {
        categoria_id: ctx.categoria,
        monto: 250,
        fecha: '2026-10-10',
      });

      // Ocultar ctx.categoria dejando solo ctx.otraCategoria
      await ctx.api
        .put('/categorias/seleccion')
        .auth(ctx.a.token, { type: 'bearer' })
        .send({ categoria_ids: [ctx.otraCategoria] })
        .expect(200);

      // No aparece en GET /categorias
      const { body: cats } = await ctx.api
        .get('/categorias')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.ok(!cats.some((c) => c.id === ctx.categoria));

      // No se puede crear gasto nuevo ni presupuesto nuevo con la categoría oculta
      expectError(
        await ctx.api
          .post('/gastos')
          .auth(ctx.a.token, { type: 'bearer' })
          .send(ctx.gasto({ categoria_id: ctx.categoria })),
        400,
        'CATEGORIA_INEXISTENTE'
      );

      expectError(
        await ctx.api
          .post('/presupuestos')
          .auth(ctx.a.token, { type: 'bearer' })
          .send({
            categoria_id: ctx.categoria,
            mes: '2026-11',
            monto_limite: 300,
          }),
        400,
        'CATEGORIA_INEXISTENTE'
      );

      // Editar gasto viejo manteniendo su categoría oculta sí está permitido
      const { body: editBody } = await ctx.api
        .put(`/gastos/${gastoViejo.id}`)
        .auth(ctx.a.token, { type: 'bearer' })
        .send(
          ctx.gasto({
            categoria_id: ctx.categoria,
            monto: 300,
            fecha: '2026-10-10',
            nota: 'Editado con categoría oculta',
          })
        )
        .expect(200);
      assert.equal(editBody.gasto.categoria_id, ctx.categoria);
      assert.equal(editBody.gasto.monto, 300);

      // Reportes siguen contando el gasto viejo de la categoría oculta
      const { body: resumen } = await ctx.api
        .get('/reportes/resumen?mes=2026-10')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.equal(resumen.gasto_variable, 300);
      assert.equal(resumen.total, 300);

      const { body: porCategoria } = await ctx.api
        .get('/reportes/por-categoria?mes=2026-10')
        .auth(ctx.a.token, { type: 'bearer' })
        .expect(200);
      assert.equal(porCategoria.length, 1);
      assert.equal(porCategoria[0].categoria_id, ctx.categoria);
      assert.equal(porCategoria[0].total, 300);
    });
  });
