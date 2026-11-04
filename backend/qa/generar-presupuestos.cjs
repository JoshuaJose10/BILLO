// Generador determinista de la colección importable; no necesita servidor ni credenciales.
const fs = require('node:fs');
const path = require('node:path');
const folders = [];
let folder;
function group(name) { folder = { name, item: [] }; folders.push(folder); }
function add(name, method, route, body, status, tests = [], user = 'A') {
  const scripts = [
    `pm.test('HTTP ${status}', () => pm.response.to.have.status(${status}));`,
    "pm.test('Respuesta JSON', () => pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json'));",
    'const b = pm.response.json();', ...tests,
  ];
  folder.item.push({ name, request: {
    method, header: [{ key: 'Content-Type', value: 'application/json' }],
    auth: user ? { type: 'bearer', bearer: [{ key: 'token', value: `{{token${user}}}`, type: 'string' }] } : { type: 'noauth' },
    url: '{{baseUrl}}' + route,
    ...(body === undefined ? {} : { body: { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } } }),
  }, event: [{ listen: 'test', script: { type: 'text/javascript', exec: scripts } }] });
}
const cat = '{{categoriaId}}';
// Los números dinámicos se sustituyen como números JSON, no como cadenas.
function numericVariables(item) {
  if (item.request?.body) item.request.body.raw = item.request.body.raw.replace(/"(\{\{(?:categoriaId|otraCategoriaId)\}\})"/g, '$1');
}
const budget = (mes, monto_limite = 1000, categoria_id = cat) => ({ categoria_id, mes, monto_limite });
const expense = (fecha, monto, categoria_id = cat) => ({ monto, categoria_id, fecha, metodo_pago: 'efectivo', nota: 'QA presupuestos' });
const save = (key, field) => `pm.test('ID disponible', () => pm.expect(b.${field}.id).to.be.a('number')); pm.collectionVariables.set('${key}', b.${field}.id);`;
const error = code => [`pm.test('Error ${code}', () => { pm.expect(b.error.code).to.eql('${code}'); pm.expect(b.error.message).to.be.a('string').and.not.empty; });`];
function state(total, porcentaje, estado, limite = 1000, month, category = 'categoriaId') {
  return [`pm.test('Saldo, porcentaje y estado exactos', () => {
    pm.expect(b).to.be.an('array').with.lengthOf(1);
    pm.expect(b[0].gastado).to.eql(${total}); pm.expect(b[0].porcentaje).to.eql(${porcentaje});
    pm.expect(b[0].estado).to.eql('${estado}'); pm.expect(b[0].monto_limite).to.eql(${limite});
    pm.expect(b[0].categoria_id).to.eql(Number(pm.collectionVariables.get('${category}')));
    ${month ? `pm.expect(b[0].mes).to.eql('${month}');` : ''}
  });`];
}
function alert(porcentaje, estado) {
  return [estado === 'ok'
    ? "pm.test('Sin aviso bajo el umbral', () => pm.expect(b).not.to.have.property('alerta'));"
    : `pm.test('Aviso exacto', () => pm.expect(b.alerta).to.eql({categoria_id: Number(pm.collectionVariables.get('categoriaId')), porcentaje: ${porcentaje}, estado: '${estado}'}));`];
}
group('01 Preparación aislada');
for (const user of ['A', 'B']) {
  add(`PREP-${user}: registrar usuario QA`, 'POST', '/auth/register', {
    nombre: `QA presupuestos ${user}`, email: `qa-pres-${user}-{{$guid}}@example.test`, password: 'QaPresupuestos123!',
  }, 201, [`pm.test('Sesión creada', () => pm.expect(b.token).to.be.a('string').and.not.empty); pm.collectionVariables.set('token${user}', b.token);`], null);
}
add('PREP-CAT: categorías reales de gasto', 'GET', '/categorias', undefined, 200, [
  "const cats = b.filter(c => c.tipo === 'gasto'); pm.test('Dos categorías disponibles', () => pm.expect(cats.length).to.be.at.least(2));",
  "pm.collectionVariables.set('categoriaId', cats[0].id); pm.collectionVariables.set('otraCategoriaId', cats[1].id);",
]);
group('02 CP-RF3 presupuestos');
add('CP-RF3-01: crear límite 2000', 'POST', '/presupuestos', budget('2026-11', 2000), 201, [save('presupuestoId', 'presupuesto'),
  "pm.test('Límite persistido', () => pm.expect(b.presupuesto).to.include({mes:'2026-11',monto_limite:2000}));"]);
add('CP-RF3-01: consultar presupuesto sin gastos', 'GET', '/presupuestos?mes=2026-11', undefined, 200, state(0, 0, 'ok', 2000, '2026-11'));
add('CP-RF3-02: monto negativo no crea', 'POST', '/presupuestos', budget('2026-10', -500), 400, error('MONTO_INVALIDO'));
add('CP-RF3-02: ausencia tras rechazo', 'GET', '/presupuestos?mes=2026-10', undefined, 200, ["pm.test('Sin presupuesto insertado', () => pm.expect(b).to.eql([]));"]);
add('CP-RF3-DUP: duplicado mismo usuario y mes', 'POST', '/presupuestos', budget('2026-11'), 409, error('PRESUPUESTO_DUPLICADO'));
for (const [name, value] of [['cero', 0], ['texto', '1000'], ['tres decimales', 1.001], ['negativo', -500]]) {
  add(`CP-RF3-VAL: PUT ${name}`, 'PUT', '/presupuestos/{{presupuestoId}}', { monto_limite: value }, 400, error('MONTO_INVALIDO'));
}
add('CP-RF3-VAL: rechazos no alteran límite', 'GET', '/presupuestos?mes=2026-11', undefined, 200, state(0, 0, 'ok', 2000));
add('CP-RF3-CRUD: editar a 1000', 'PUT', '/presupuestos/{{presupuestoId}}', { monto_limite: 1000 }, 200, ["pm.test('Límite actualizado', () => pm.expect(b.presupuesto.monto_limite).to.eql(1000));"]);
add('CP-RF3-CRUD: edición persistida', 'GET', '/presupuestos?mes=2026-11', undefined, 200, state(0, 0, 'ok'));
add('CP-RF3-USR: B no lista A', 'GET', '/presupuestos?mes=2026-11', undefined, 200, ["pm.test('Lista privada', () => pm.expect(b).to.eql([]));"], 'B');
for (const method of ['PUT', 'DELETE']) {
  add(`CP-RF3-USR: B no ${method} A`, method, '/presupuestos/{{presupuestoId}}', method === 'PUT' ? { monto_limite: 1 } : undefined, 404, error('PRESUPUESTO_NO_ENCONTRADO'), 'B');
}
add('CP-RF3-USR: A permanece intacto', 'GET', '/presupuestos?mes=2026-11', undefined, 200, state(0, 0, 'ok'));
add('CP-RF3-MES: mes obligatorio', 'GET', '/presupuestos', undefined, 400, error('MES_INVALIDO'));
add('CP-RF3-MES: mes inválido', 'POST', '/presupuestos', budget('2026-13'), 400, error('MES_INVALIDO'));
add('CP-RF3-CAT: categoría inexistente', 'POST', '/presupuestos', budget('2026-10', 1000, 2147483647), 400, error('CATEGORIA_INEXISTENTE'));
for (const method of ['POST', 'GET', 'PUT', 'DELETE']) {
  add(`CP-RF3-AUTH: ${method} sin sesión`, method, ['PUT', 'DELETE'].includes(method) ? '/presupuestos/{{presupuestoId}}' : '/presupuestos?mes=2026-11',
    ['POST', 'PUT'].includes(method) ? budget('2026-11') : undefined, 401, error('NO_AUTORIZADO'), null);
}
group('03 CP-RF4 alertas y límites');
const scenarios = [
  ['CP-RF4-01', 1000, 700, 100, 800, 80, 'alerta'],
  ['CP-RF4-02', 1000, 950, 100, 1050, 105, 'excedido'],
  ['CP-RF4-03', 1000, 100, 50, 150, 15, 'ok'],
  ['CP-RF4-L7999', 10000, 7000, 999, 7999, 80, 'ok'],
  ['CP-RF4-L80', 10000, 7000, 1000, 8000, 80, 'alerta'],
  ['CP-RF4-L100', 10000, 7000, 3000, 10000, 100, 'alerta'],
  ['CP-RF4-L10001', 10000, 7000, 3001, 10001, 100, 'excedido'],
];
scenarios.forEach(([id, limite, previo, monto, total, porcentaje, status], index) => {
  const mes = `2026-0${index + 1}`;
  add(`${id}: preparar presupuesto`, 'POST', '/presupuestos', budget(mes, limite), 201, [save('casoPresupuestoId', 'presupuesto')]);
  add(`${id}: saldo inicial ${previo}`, 'POST', '/gastos', expense(`${mes}-01`, previo), 201, alert(Math.round(previo * 100 / limite), id === 'CP-RF4-02' ? 'alerta' : 'ok'));
  add(`${id}: POST total ${total}`, 'POST', '/gastos', expense(`${mes}-15`, monto), 201, [save('gastoId', 'gasto'), ...alert(porcentaje, status)]);
  add(`${id}: GET después de POST`, 'GET', `/presupuestos?mes=${mes}`, undefined, 200, state(total, porcentaje, status, limite, mes));
  add(`${id}: PUT al mismo total`, 'PUT', '/gastos/{{gastoId}}', expense(`${mes}-15`, monto), 200, alert(porcentaje, status));
  add(`${id}: GET después de PUT`, 'GET', `/presupuestos?mes=${mes}`, undefined, 200, state(total, porcentaje, status, limite, mes));
});
group('04 Aislamiento y recálculo');
add('CP-RF4-AIS: B crea mismo mes y categoría', 'POST', '/presupuestos', budget('2026-11'), 201, [save('presupuestoBId', 'presupuesto')], 'B');
add('CP-RF4-AIS: A crea diciembre', 'POST', '/presupuestos', budget('2026-12'), 201, [save('presupuestoDiciembreId', 'presupuesto')]);
add('CP-RF4-AIS: B llega a 100 %', 'POST', '/gastos', expense('2026-11-01', 1000), 201, alert(100, 'alerta'), 'B');
add('CP-RF4-AIS: A diciembre llega a 100 %', 'POST', '/gastos', expense('2026-12-01', 1000), 201, alert(100, 'alerta'));
add('CP-RF4-AIS: gasto de otra categoría sin presupuesto', 'POST', '/gastos', expense('2026-11-01', 5000, '{{otraCategoriaId}}'), 201, alert(0, 'ok'));
add('CP-RF4-AIS: A noviembre queda en 79,999 %', 'POST', '/gastos', expense('2026-11-30', 799.99), 201, [save('gastoAId', 'gasto'), ...alert(80, 'ok')]);
add('CP-RF4-AIS: total exclusivo de A noviembre', 'GET', '/presupuestos?mes=2026-11', undefined, 200, state(799.99, 80, 'ok', 1000, '2026-11'));
add('CP-RF4-AIS: total exclusivo de B noviembre', 'GET', '/presupuestos?mes=2026-11', undefined, 200, state(1000, 100, 'alerta', 1000, '2026-11'), 'B');
add('CP-RF4-AIS: total exclusivo de A diciembre', 'GET', '/presupuestos?mes=2026-12', undefined, 200, state(1000, 100, 'alerta', 1000, '2026-12'));
add('CP-RF4-AIS: mes sin datos', 'GET', '/presupuestos?mes=2027-01', undefined, 200, ["pm.test('Sin datos de otros meses', () => pm.expect(b).to.eql([]));"]);
add('CP-RF4-REC: editar gasto a 100,001 %', 'PUT', '/gastos/{{gastoAId}}', expense('2026-11-30', 1000.01), 200, alert(100, 'excedido'));
add('CP-RF4-REC: no duplica total anterior', 'GET', '/presupuestos?mes=2026-11', undefined, 200, state(1000.01, 100, 'excedido'));
add('CP-RF4-REC: bajar gasto a 79,999 %', 'PUT', '/gastos/{{gastoAId}}', expense('2026-11-30', 799.99), 200, alert(80, 'ok'));
add('CP-RF4-MOVER: mover gasto a octubre sin presupuesto', 'PUT', '/gastos/{{gastoAId}}', expense('2026-10-31', 799.99), 200, alert(0, 'ok'));
add('CP-RF4-MOVER: noviembre queda en cero', 'GET', '/presupuestos?mes=2026-11', undefined, 200, state(0, 0, 'ok'));
add('CP-RF3-CRUD: eliminar presupuesto', 'DELETE', '/presupuestos/{{presupuestoId}}', undefined, 200, ["pm.test('Eliminado', () => pm.expect(b).to.eql({eliminado:true}));"]);
add('CP-RF3-CRUD: ausencia persistida', 'GET', '/presupuestos?mes=2026-11', undefined, 200, ["pm.test('No reaparece', () => pm.expect(b).to.eql([]));"]);
group('05 Limpieza por API');
for (const user of ['A', 'B']) {
  add(`CLEAN-${user}: eliminar gastos y presupuestos del usuario`, 'GET', '/gastos', undefined, 200, [
    `const token = pm.collectionVariables.get('token${user}'); const base = pm.collectionVariables.get('baseUrl');`,
    `function remove(route, id) { pm.sendRequest({url:base+route+'/'+id, method:'DELETE', header:{Authorization:'Bearer '+token}}, (e,r) => {
      pm.test('Limpieza '+route+'/'+id, () => { pm.expect(e).to.eql(null); pm.expect(r.code).to.eql(200); });
    }); }`,
    "b.forEach(g => remove('/gastos', g.id));",
    `for (let month = 1; month <= 12; month++) { const mes = '2026-'+String(month).padStart(2,'0');
      pm.sendRequest({url:base+'/presupuestos?mes='+mes, header:{Authorization:'Bearer '+token}}, (e,r) => {
        pm.test('Consulta limpieza '+mes, () => {pm.expect(e).to.eql(null); pm.expect(r.code).to.eql(200);});
        if (!e && r.code === 200) r.json().forEach(p => remove('/presupuestos',p.id));
      });
    }`,
  ], user);
}
for (const f of folders) f.item.forEach(numericVariables);
const collection = {
  info: { name: 'Billo · QA presupuestos (RF3 / RF4)',
    description: 'Ejecutar completa y en orden contra una API QA. Crea usuarios nuevos por iteración. Estados por importe exacto: <80 ok; 80..100 alerta; >100 excedido. Los porcentajes de presentación son enteros. No verifica UI móvil.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
  variable: [{ key: 'baseUrl', value: 'http://127.0.0.1:3000', type: 'string' }], item: folders,
};
const target = path.resolve(__dirname, '../../docs/postman/presupuestos.postman_collection.json');
fs.writeFileSync(target, JSON.stringify(collection, null, 2) + '\n');
console.log(`Colección generada: ${folders.reduce((n,f) => n+f.item.length,0)} peticiones por iteración`);
