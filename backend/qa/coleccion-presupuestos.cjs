// Fuente editable de la colección dedicada; no altera la línea base histórica.
const fs = require('node:fs');
const path = require('node:path');
const collection = {
  info: {
    _postman_id: 'ce25d3a1-83a9-4192-80b3-7c2122edbf34',
    name: 'Billo · QA presupuestos (RF3/RF4)',
    description: 'Ejecutar completa, en orden y sin ambiente. Cuentas nuevas por iteración. Umbrales exactos; porcentaje de presentación entero. Reproducción aislada: npm run qa:presupuestos. No sustituye la revisión de Joshua ni la prueba visual de la app.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [{ key: 'baseUrl', value: 'http://127.0.0.1:3000', type: 'string' }],
  item: [],
};
const folder = name => {
  const result = { name, item: [] }; collection.item.push(result); return result;
};
const script = (listen, exec) => ({ listen, script: { type: 'text/javascript', exec } });
function add(group, name, method, route, status, body, checks = [], save = [], token = 'qaTokenA') {
  const request = {
    method, url: '{{baseUrl}}' + route,
    auth: token ? { type: 'bearer', bearer: [{ key: 'token', value: `{{${token}}}`, type: 'string' }] } : { type: 'noauth' },
    header: body === undefined ? [] : [{ key: 'Content-Type', value: 'application/json' }],
  };
  if (body !== undefined) request.body = {
    mode: 'raw', raw: JSON.stringify(body, null, 2).replace(/"\{\{(categoriaId|otraCategoria)\}\}"/g, '{{$1}}'),
    options: { raw: { language: 'json' } },
  };
  const item = { name, request, event: [script('test', [
    `pm.test('HTTP ${status}', () => pm.response.to.have.status(${status}));`,
    'let body; pm.test("Respuesta JSON", () => { body = pm.response.json(); });',
    ...checks.map(([label, code]) => `pm.test(${JSON.stringify(label)}, () => { ${code} });`),
    ...save,
  ])] };
  group.item.push(item); return item;
}
const store = (key, expression) => `if (${expression} != null) pm.collectionVariables.set('${key}', ${expression});`;
const error = code => [['Error estructurado', `pm.expect(body).to.have.all.keys('error'); pm.expect(body.error).to.have.all.keys('code','message'); pm.expect(body.error.code).to.equal('${code}'); pm.expect(body.error.message).to.be.a('string').and.not.empty;`]];
const category = '{{categoriaId}}';
const budget = (mes, monto_limite = 1000, categoria_id = category) => ({ categoria_id, mes, monto_limite });
const expense = (monto, fecha, categoria_id = category) => ({ monto, fecha, categoria_id, metodo_pago: 'efectivo' });
function crear(group, name, mes, limite = 1000, token, categoria = category) {
  add(group, name, 'POST', '/presupuestos', 201, budget(mes, limite, categoria), [
    ['Presupuesto persistido', `pm.expect(body.presupuesto).to.have.all.keys('id','categoria_id','mes','monto_limite'); pm.expect(body.presupuesto.id).to.be.a('number').and.above(0); pm.expect(body.presupuesto).to.include({mes:'${mes}',monto_limite:${limite},categoria_id:Number(pm.collectionVariables.get('${categoria === category ? 'categoriaId' : 'otraCategoria'}'))});`],
  ], [store('presupuestoId', 'body?.presupuesto?.id')], token);
}
function alerta(porcentaje, estado, categoria = 'categoriaId') {
  return ['Alerta exacta', estado === 'ok'
    ? "pm.expect(body).not.to.have.property('alerta');"
    : `pm.expect(body.alerta).to.deep.equal({categoria_id:Number(pm.collectionVariables.get('${categoria}')),porcentaje:${porcentaje},estado:'${estado}'});`];
}
function consultar(group, name, mes, total, porcentaje, estado, limite = 1000, token, categoria = 'categoriaId') {
  add(group, name, 'GET', `/presupuestos?mes=${mes}`, 200, undefined, [
    ['Total, porcentaje y estado', `pm.expect(body).to.be.an('array').with.lengthOf(1); pm.expect(body[0]).to.have.all.keys('id','categoria_id','categoria','mes','monto_limite','gastado','porcentaje','estado'); pm.expect(body[0]).to.include({mes:'${mes}',categoria_id:Number(pm.collectionVariables.get('${categoria}')),monto_limite:${limite},gastado:${total},porcentaje:${porcentaje},estado:'${estado}'}); pm.expect(body[0].categoria).to.be.a('string').and.not.empty;`],
  ], [], token);
}
const prep = folder('00 Preparación · cuentas nuevas y categorías');
for (const user of ['A', 'B']) {
  const item = add(prep, `PREP-USUARIO-${user}`, 'POST', '/auth/register', 201, {
    nombre: `QA presupuestos ${user}`, email: `qa.presupuesto.${user.toLowerCase()}.{{qaRun}}@example.test`, password: '{{qaPassword}}',
  }, [['Sesión válida', "pm.expect(body.token).to.be.a('string').and.not.empty; pm.expect(body.usuario.id).to.be.a('number');"]], [store(`qaToken${user}`, 'body?.token')], null);
  if (user === 'A') item.event.unshift(script('prerequest', [
    "const run = pm.variables.replaceIn('{{$guid}}').replace(/-/g,'');",
    "pm.collectionVariables.set('qaRun',run); pm.collectionVariables.set('qaPassword','Qa!'+run);",
    "['qaTokenA','qaTokenB','categoriaId','otraCategoria','presupuestoId','gastoId','propioA','gastoPropioA'].forEach(k => pm.collectionVariables.unset(k));",
  ]));
}
add(prep, 'PREP-CATEGORIAS', 'GET', '/categorias', 200, undefined, [
  ['Dos categorías disponibles', "pm.expect(body).to.be.an('array'); pm.expect(body.length).to.be.at.least(2);"],
], ["if(Array.isArray(body)&&body.length>=2){ const c=body.find(c=>c.nombre==='Comida')||body[0]; pm.collectionVariables.set('categoriaId',c.id); pm.collectionVariables.set('otraCategoria',body.find(x=>x.id!==c.id).id); }"]);

const rf3 = folder('01 RF3 · creación, validación y CRUD');
crear(rf3, 'CP-RF3-01-CREAR', '2026-10', 2000);
consultar(rf3, 'CP-RF3-01-GET', '2026-10', 0, 0, 'ok', 2000);
add(rf3, 'CP-RF3-02', 'POST', '/presupuestos', 400, budget('2026-11', -500), error('MONTO_INVALIDO'));
add(rf3, 'CP-RF3-02-NO-PERSISTE', 'GET', '/presupuestos?mes=2026-11', 200, undefined, [['Sin presupuesto inválido', 'pm.expect(body).to.deep.equal([]);']]);
for (const [id, patch, code] of [
  ['CERO', { monto_limite: 0 }, 'MONTO_INVALIDO'],
  ['TEXTO', { monto_limite: '1000' }, 'MONTO_INVALIDO'],
  ['DECIMALES', { monto_limite: 0.001 }, 'MONTO_INVALIDO'],
  ['PRECISION', { monto_limite: 1000.001 }, 'MONTO_INVALIDO'],
  ['MAXIMO', { monto_limite: 10000000000 }, 'MONTO_INVALIDO'],
  ['MES', { mes: '2026-13' }, 'MES_INVALIDO'],
  ['CATEGORIA', { categoria_id: 2147483647 }, 'CATEGORIA_INEXISTENTE'],
]) add(rf3, `RF3-${id}`, 'POST', '/presupuestos', 400, { ...budget('2026-11'), ...patch }, error(code));
add(rf3, 'RF3-INVALIDOS-NO-PERSISTEN', 'GET', '/presupuestos?mes=2026-11', 200, undefined, [['Sin registros inválidos', 'pm.expect(body).to.deep.equal([]);']]);
add(rf3, 'RF3-DUPLICADO', 'POST', '/presupuestos', 409, budget('2026-10', 3000), error('PRESUPUESTO_DUPLICADO'));
consultar(rf3, 'RF3-DUPLICADO-NO-MODIFICA', '2026-10', 0, 0, 'ok', 2000);
add(rf3, 'RF3-PUT-INVALIDO', 'PUT', '/presupuestos/{{presupuestoId}}', 400, { monto_limite: -500 }, error('MONTO_INVALIDO'));
consultar(rf3, 'RF3-PUT-INVALIDO-NO-MODIFICA', '2026-10', 0, 0, 'ok', 2000);
add(rf3, 'RF3-CRUD-GASTO', 'POST', '/gastos', 201, expense(800, '2026-10-05'), [alerta(40, 'ok')], [store('gastoId', 'body?.gasto?.id')]);
add(rf3, 'RF3-CRUD-PUT', 'PUT', '/presupuestos/{{presupuestoId}}', 200, { monto_limite: 1000 }, [['Límite actualizado', 'pm.expect(body.presupuesto.monto_limite).to.equal(1000);']]);
consultar(rf3, 'RF3-CRUD-RECALCULA', '2026-10', 800, 80, 'alerta');
add(rf3, 'RF3-CRUD-DELETE', 'DELETE', '/presupuestos/{{presupuestoId}}', 200, undefined, [['Eliminado', 'pm.expect(body).to.deep.equal({eliminado:true});']]);
add(rf3, 'RF3-CRUD-LISTA-VACIA', 'GET', '/presupuestos?mes=2026-10', 200, undefined, [['Sin presupuesto', 'pm.expect(body).to.deep.equal([]);']]);
add(rf3, 'RF3-CRUD-CONSERVA-GASTO', 'GET', '/gastos?mes=2026-10', 200, undefined, [['Gasto intacto', 'pm.expect(body).to.have.lengthOf(1); pm.expect(body[0].monto).to.equal(800);']]);
for (const mes of [null, '', '2026-1', '2026-00', '2026-13', '2026-10-01']) {
  add(rf3, `RF3-GET-MES-${mes === null ? 'AUSENTE' : mes || 'VACIO'}`, 'GET', mes === null ? '/presupuestos' : `/presupuestos?mes=${mes}`, 400, undefined, error('MES_INVALIDO'));
}
for (const [method, route, body] of [
  ['GET', '/presupuestos?mes=2026-10'], ['POST', '/presupuestos', budget('2026-10')],
  ['PUT', '/presupuestos/1', { monto_limite: 1000 }], ['DELETE', '/presupuestos/1'],
]) for (const token of [null, 'tokenInvalido']) {
  add(rf3, `RF3-AUTH-${method}-${token ? 'INVALIDO' : 'AUSENTE'}`, method, route, 401, body, error('NO_AUTORIZADO'), [], token);
}
collection.variable.push({ key: 'tokenInvalido', value: 'invalido', type: 'string' });

const rf4 = folder('02 RF4 · CP y límites por POST y PUT');
let scenario = 0;
for (const [id, previo, monto, total, porcentaje, estado] of [
  ['CP-RF4-01', 700, 100, 800, 80, 'alerta'],
  ['CP-RF4-02', 950, 100, 1050, 105, 'excedido'],
  ['CP-RF4-03', 100, 50, 150, 15, 'ok'],
  ['CP-RF4-04-L7999', 700, 99.9, 799.9, 80, 'ok'],
  ['CP-RF4-05-L8000', 700, 100, 800, 80, 'alerta'],
  ['CP-RF4-06-L10000', 950, 50, 1000, 100, 'alerta'],
  ['CP-RF4-07-L10001', 950, 50.1, 1000.1, 100, 'excedido'],
]) for (const method of ['POST', 'PUT']) {
  // Mes propio por escenario; repetir la colección crea cuentas nuevas.
  const n = scenario++; const mes = `${2030 + Math.floor(n / 12)}-${String(n % 12 + 1).padStart(2, '0')}`;
  const name = `${id}-${method}`;
  crear(rf4, name + '-PRESUPUESTO', mes);
  add(rf4, name + '-PREVIO', 'POST', '/gastos', 201, expense(previo, mes + '-05'), [alerta(Math.round(previo / 10), previo >= 800 ? 'alerta' : 'ok')]);
  if (method === 'PUT') add(rf4, name + '-SEMILLA', 'POST', '/gastos', 201, expense(0.01, mes + '-06'), [], [store('gastoId', 'body?.gasto?.id')]);
  add(rf4, name, method, method === 'POST' ? '/gastos' : '/gastos/{{gastoId}}', method === 'POST' ? 201 : 200, expense(monto, mes + '-06'), [
    ['Monto guardado', `pm.expect(body.gasto.monto).to.equal(${monto});`], alerta(porcentaje, estado),
  ]);
  consultar(rf4, name + '-GET', mes, total, porcentaje, estado);
}
crear(rf4, 'RF4-CENTAVO-PRESUPUESTO', '2032-01', 100);
add(rf4, 'RF4-CENTAVO', 'POST', '/gastos', 201, expense(100.01, '2032-01-05'), [alerta(100, 'excedido')]);
consultar(rf4, 'RF4-CENTAVO-GET', '2032-01', 100.01, 100, 'excedido', 100);
add(rf4, 'RF4-SIN-PRESUPUESTO-POST', 'POST', '/gastos', 201, expense(9999, '2032-02-05'), [alerta(0, 'ok')], [store('gastoId', 'body?.gasto?.id')]);
add(rf4, 'RF4-SIN-PRESUPUESTO-PUT', 'PUT', '/gastos/{{gastoId}}', 200, expense(9998, '2032-02-05'), [alerta(0, 'ok')]);
crear(rf4, 'RF4-RECALCULO-PRESUPUESTO', '2032-03');
add(rf4, 'RF4-RECALCULO-EXCEDIDO', 'POST', '/gastos', 201, expense(1000.1, '2032-03-05'), [alerta(100, 'excedido')], [store('gastoId', 'body?.gasto?.id')]);
add(rf4, 'RF4-RECALCULO-PUT', 'PUT', '/gastos/{{gastoId}}', 200, expense(799.9, '2032-03-05'), [alerta(80, 'ok')]);
consultar(rf4, 'RF4-RECALCULO-GET', '2032-03', 799.9, 80, 'ok');
add(rf4, 'RF4-RECALCULO-DELETE', 'DELETE', '/gastos/{{gastoId}}', 200, undefined, [['Eliminado', 'pm.expect(body.eliminado).to.equal(true);']]);
consultar(rf4, 'RF4-RECALCULO-CERO', '2032-03', 0, 0, 'ok');

const isolation = folder('03 RF3/RF4 · aislamiento de usuarios, meses y categorías');
crear(isolation, 'RF3-USUARIOS-A', '2033-01');
isolation.item.at(-1).event[0].script.exec.push(store('propioA', 'body?.presupuesto?.id'));
crear(isolation, 'RF3-USUARIOS-B', '2033-01', 2000, 'qaTokenB');
add(isolation, 'RF4-USUARIOS-A', 'POST', '/gastos', 201, expense(150, '2033-01-05'), [alerta(15, 'ok')], [store('gastoPropioA', 'body?.gasto?.id')]);
add(isolation, 'RF4-USUARIOS-B', 'POST', '/gastos', 201, expense(2100, '2033-01-05'), [alerta(105, 'excedido')], [], 'qaTokenB');
consultar(isolation, 'RF3/RF4-USUARIOS-GET-A', '2033-01', 150, 15, 'ok');
consultar(isolation, 'RF3/RF4-USUARIOS-GET-B', '2033-01', 2100, 105, 'excedido', 2000, 'qaTokenB');
for (const method of ['PUT', 'DELETE']) {
  add(isolation, `RF3-PRIVACIDAD-${method}`, method, '/presupuestos/{{propioA}}', 404, method === 'PUT' ? { monto_limite: 1 } : undefined, error('PRESUPUESTO_NO_ENCONTRADO'), [], 'qaTokenB');
}
consultar(isolation, 'RF3-PRIVACIDAD-INTACTO', '2033-01', 150, 15, 'ok');
for (const [mes, total, porcentaje, estado, dia] of [
  ['2033-09', 2000, 200, 'excedido', '30'], ['2033-10', 800, 80, 'alerta', '31'],
  ['2033-11', 3000, 300, 'excedido', '01'], ['2033-12', 4000, 400, 'excedido', '31'],
  ['2034-01', 150, 15, 'ok', '01'],
]) {
  crear(isolation, `RF3-MESES-${mes}`, mes);
  if (mes === '2033-10') {
    add(isolation, 'RF4-MESES-OCTUBRE-INICIO', 'POST', '/gastos', 201, expense(100, mes + '-01'), [alerta(10, 'ok')]);
  }
  add(isolation, `RF4-MESES-${mes}`, 'POST', '/gastos', 201, expense(mes === '2033-10' ? 700 : total, mes + '-' + dia), [alerta(porcentaje, estado)]);
}
for (const [mes, total, porcentaje, estado] of [
  ['2033-09', 2000, 200, 'excedido'], ['2033-10', 800, 80, 'alerta'],
  ['2033-11', 3000, 300, 'excedido'], ['2033-12', 4000, 400, 'excedido'], ['2034-01', 150, 15, 'ok'],
]) consultar(isolation, `RF3/RF4-MESES-GET-${mes}`, mes, total, porcentaje, estado);
add(isolation, 'RF3-MES-SIN-DATOS', 'GET', '/presupuestos?mes=2034-02', 200, undefined, [['Lista vacía', 'pm.expect(body).to.deep.equal([]);']]);
crear(isolation, 'RF3-CATEGORIAS-A', '2034-03');
crear(isolation, 'RF3-CATEGORIAS-B', '2034-03', 1000, undefined, '{{otraCategoria}}');
add(isolation, 'RF4-CATEGORIAS-B', 'POST', '/gastos', 201, expense(1100, '2034-03-05', '{{otraCategoria}}'), [alerta(110, 'excedido', 'otraCategoria')]);
add(isolation, 'RF4-CATEGORIAS-A', 'POST', '/gastos', 201, expense(150, '2034-03-05'), [alerta(15, 'ok')]);
add(isolation, 'RF3/RF4-CATEGORIAS-GET', 'GET', '/presupuestos?mes=2034-03', 200, undefined, [
  ['Totales independientes', "pm.expect(body).to.have.lengthOf(2); const a=body.find(p=>p.categoria_id===Number(pm.collectionVariables.get('categoriaId'))); const b=body.find(p=>p.categoria_id===Number(pm.collectionVariables.get('otraCategoria'))); pm.expect(a).to.include({gastado:150,porcentaje:15,estado:'ok'}); pm.expect(b).to.include({gastado:1100,porcentaje:110,estado:'excedido'});"],
]);
crear(isolation, 'RF4-TRASLADO-DESTINO', '2034-04', 1000, undefined, '{{otraCategoria}}');
add(isolation, 'RF4-TRASLADO', 'PUT', '/gastos/{{gastoPropioA}}', 200, expense(1000.1, '2034-04-01', '{{otraCategoria}}'), [alerta(100, 'excedido', 'otraCategoria')]);
consultar(isolation, 'RF4-TRASLADO-ORIGEN', '2033-01', 0, 0, 'ok');
consultar(isolation, 'RF4-TRASLADO-DESTINO-GET', '2034-04', 1000.1, 100, 'excedido', 1000, undefined, 'otraCategoria');

const cleanup = folder('04 Limpieza · solo las cuentas de esta iteración');
for (const user of ['A', 'B']) {
  for (const resource of ['gastos', 'presupuestos']) {
    // Los meses son conocidos: se conservan las rutas por escenario para limpiar presupuestos.
    const months = [...new Set(collection.item.flatMap(f => f.item)
      .filter(i => i.request.method === 'POST' && i.request.url === '{{baseUrl}}/presupuestos')
      .map(i => JSON.parse(i.request.body.raw.replace(/\{\{categoriaId\}\}|\{\{otraCategoria\}\}/g, '1')).mes)
      .filter(m => /^\d{4}-(0[1-9]|1[0-2])$/.test(m)))];
    const routes = resource === 'gastos' ? ['/gastos'] : months.map(m => '/presupuestos?mes=' + m);
    for (const route of routes) {
      const item = add(cleanup, `LIMPIEZA-${user}-${route}`, 'GET', route, 200, undefined, [['Lista para limpieza', 'pm.expect(body).to.be.an("array");']], [], `qaToken${user}`);
      item.event[0].script.exec.push(
        `const root=pm.collectionVariables.get('baseUrl'); const auth='Bearer '+pm.collectionVariables.get('qaToken${user}');`,
        'const ids=Array.isArray(body)?body.map(x=>x.id):[];',
        `function next(){if(!ids.length){pm.sendRequest({url:root+'${route}',method:'GET',header:{Authorization:auth}},(err,res)=>{pm.test('Limpieza verificada',()=>{pm.expect(err).to.equal(null);pm.expect(res.code).to.equal(200);pm.expect(res.json()).to.deep.equal([]);});});return;}`,
        `const id=ids.shift(); pm.sendRequest({url:root+'/${resource}/'+id,method:'DELETE',header:{Authorization:auth}},(err,res)=>{pm.test('Eliminar '+id,()=>{pm.expect(err).to.equal(null);pm.expect(res.code).to.equal(200);pm.expect(res.json().eliminado).to.equal(true);});next();});} next();`,
      );
    }
  }
}

if (require.main === module) {
  const target = path.resolve(__dirname, '../../docs/postman/presupuestos.postman_collection.json');
  fs.writeFileSync(target, JSON.stringify(collection, null, 2) + '\n');
  console.log(`${collection.item.reduce((n, f) => n + f.item.length, 0)} peticiones generadas`);
}
module.exports = collection;
