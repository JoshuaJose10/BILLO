// Fuente editable. El runner consume el JSON importable sin regenerarlo.
const fs = require('node:fs');
const path = require('node:path');
const collection = {
  info: {
    _postman_id: '302775ab-9337-497a-8a61-b620a4e80378',
    name: 'Billo · QA membresías y reportes (RF5/RF6/RF8)',
    description: 'Ejecutar completa y en orden, sin ambiente, dos iteraciones. Cuentas nuevas y mes fijo 2026-10. suma(categorías)=resumen.gasto_variable; suma(membresías mensualizadas)=resumen.gasto_fijo; variable+fijo=total. Catálogo compartido. No sustituye revisión de Joshua ni UI. Ver docs/qa/membresias-reportes-reporte.md.',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [{ key: 'baseUrl', value: 'http://127.0.0.1:3000', type: 'string' },
    { key: 'tokenInvalido', value: 'invalido', type: 'string' }],
  item: [],
};
const folder = name => { const f = { name, item: [] }; collection.item.push(f); return f; };
const event = (listen, exec) => ({ listen, script: { type: 'text/javascript', exec } });
function add(group, name, method, route, status, body, checks = [], saves = [], token = 'qaTokenA') {
  const request = {
    method, url: '{{baseUrl}}' + route,
    auth: token ? { type: 'bearer', bearer: [{ key: 'token', value: `{{${token}}}`, type: 'string' }] } : { type: 'noauth' },
    header: body === undefined ? [] : [{ key: 'Content-Type', value: 'application/json' }],
  };
  if (body !== undefined) request.body = { mode: 'raw',
    raw: JSON.stringify(body, null, 2).replace(/"\{\{(catComida|catTransporte|catOcio|servicioId)\}\}"/g, '{{$1}}'),
    options: { raw: { language: 'json' } } };
  const item = { name, request, event: [event('test', [
    `pm.test('HTTP ${status}', () => pm.response.to.have.status(${status}));`,
    'let body; pm.test("Respuesta JSON", () => { body = pm.response.json(); });',
    ...checks.map(([label, code]) => `pm.test(${JSON.stringify(label)}, () => { ${code} });`), ...saves,
  ])] };
  group.item.push(item); return item;
}
const save = (key, expr) => `if (${expr} != null) pm.collectionVariables.set('${key}', ${expr});`;
const error = code => [['Error estructurado', `pm.expect(body).to.have.all.keys('error'); pm.expect(body.error).to.have.all.keys('code','message'); pm.expect(body.error.code).to.equal('${code}'); pm.expect(body.error.message).to.be.a('string').and.not.empty;`]];
const datos = (patch = {}) => ({ nombre: 'Netflix', costo: 199, frecuencia: 'mensual', fecha_cobro: '2026-10-20', ...patch });
function crearM(group, name, key, patch = {}, token) {
  const expected = datos(patch);
  add(group, name, 'POST', '/membresias', 201, expected, [
    ['Membresía persistida', `pm.expect(body.membresia).to.have.all.keys('id','servicio_id','nombre','costo','frecuencia','fecha_cobro'); pm.expect(body.membresia.id).to.be.a('number').and.above(0); pm.expect(body.membresia).to.include(${JSON.stringify(expected)}); pm.expect(body.membresia.servicio_id).to.equal(null);`],
  ], [save(key, 'body?.membresia?.id')], token);
}
function crearG(group, name, key, monto, categoria = 'catComida', fecha = '2026-10-15', token) {
  add(group, name, 'POST', '/gastos', 201,
    { monto, categoria_id: `{{${categoria}}}`, fecha, metodo_pago: 'efectivo' }, [
      ['Gasto persistido', `pm.expect(body.gasto).to.include({monto:${monto},fecha:'${fecha}',categoria_id:Number(pm.collectionVariables.get('${categoria}'))});`],
    ], [save(key, 'body?.gasto?.id')], token);
}
function eliminar(group, tipo, key, token) {
  add(group, `LIMPIEZA-${key}`, 'DELETE', `/${tipo}/{{${key}}}`, 200, undefined,
    [['Eliminado', 'pm.expect(body).to.deep.equal({eliminado:true});']], [], token);
}
function resumen(group, name, variable, fijo, total, token, query = '') {
  add(group, name, 'GET', '/reportes/resumen?mes=2026-10' + query, 200, undefined, [
    ['Resumen coincide con suma manual', `pm.expect(body).to.deep.equal({mes:'2026-10',gasto_variable:${variable},gasto_fijo:${fijo},total:${total}}); pm.expect(Math.round((body.gasto_variable+body.gasto_fijo)*100)).to.equal(Math.round(body.total*100));`],
  ], [save('ultimoResumen', 'JSON.stringify(body)')], token);
}
function membresias(group, name, count, fixed, token, query = '') {
  add(group, name, 'GET', '/membresias' + query, 200, undefined, [
    ['Lista y suma mensual coinciden con suma manual', `pm.expect(body).to.be.an('array').with.lengthOf(${count}); body.forEach(m=>{pm.expect(m.costo).to.be.a('number');pm.expect(m.dias_para_cobro).to.be.a('number');}); const fijo=Math.round(body.reduce((s,m)=>s+(m.frecuencia==='anual'?m.costo/12:m.costo),0)*100); pm.expect(fijo).to.equal(Math.round(${fixed}*100));`],
  ], [], token);
}
function categorias(group, name, totals, percentages, token, query = '', cross = false) {
  add(group, name, 'GET', '/reportes/por-categoria?mes=2026-10' + query, 200, undefined, [
    ['Categorías, importes, porcentajes y orden exactos', `const id=n=>Number(pm.collectionVariables.get(({Comida:'catComida',Transporte:'catTransporte',Entretenimiento:'catOcio'})[n])); const esperado=${JSON.stringify(totals)}.sort((a,b)=>b[1]-a[1]||id(a[0])-id(b[0])); pm.expect(body).to.be.an('array').with.lengthOf(esperado.length); pm.expect(body.map(c=>[c.categoria,c.total])).to.deep.equal(esperado); pm.expect(body.map(c=>c.porcentaje)).to.deep.equal(${JSON.stringify(percentages)}); body.forEach(c=>{pm.expect(c).to.have.all.keys('categoria_id','categoria','total','porcentaje');pm.expect(c.categoria_id).to.equal(id(c.categoria));});`],
    ...(cross ? [['Conciliación con resumen consultado', "const r=JSON.parse(pm.collectionVariables.get('ultimoResumen')); pm.expect(Math.round(body.reduce((s,c)=>s+c.total,0)*100)).to.equal(Math.round(r.gasto_variable*100));"]] : []),
  ], [], token);
}

const prep = folder('00 Preparación · cuentas nuevas, categorías y catálogo');
for (const user of ['A', 'B']) {
  const item = add(prep, `PREP-USUARIO-${user}`, 'POST', '/auth/register', 201, {
    nombre: `QA membresías ${user}`, email: `qa.membresias.${user.toLowerCase()}.{{qaRun}}@example.test`, password: '{{qaPassword}}',
  }, [['Sesión válida', "pm.expect(body.token).to.be.a('string').and.not.empty; pm.expect(body.usuario.id).to.be.a('number');"]],
  [save(`qaToken${user}`, 'body?.token'), save(`usuario${user}`, 'body?.usuario?.id')], null);
  if (user === 'A') item.event.unshift(event('prerequest', [
    "Object.keys(pm.collectionVariables.toObject()).filter(k=>!['baseUrl','tokenInvalido'].includes(k)).forEach(k=>pm.collectionVariables.unset(k));",
    "const run=pm.variables.replaceIn('{{$guid}}').replace(/-/g,''); pm.collectionVariables.set('qaRun',run); pm.collectionVariables.set('qaPassword','Qa!'+run);",
  ]));
}
add(prep, 'PREP-CATEGORIAS', 'GET', '/categorias', 200, undefined, [
  ['Categorías del conjunto conocido', "['Comida','Transporte','Entretenimiento'].forEach(n=>pm.expect(body.some(c=>c.nombre===n)).to.equal(true));"],
], ["if(Array.isArray(body)) for(const [n,k] of [['Comida','catComida'],['Transporte','catTransporte'],['Entretenimiento','catOcio']]) {const c=body.find(c=>c.nombre===n);if(c)pm.collectionVariables.set(k,c.id);}"]);
add(prep, 'RF5-CATALOGO-A', 'GET', '/catalogo', 200, undefined, [
  ['Contrato de catálogo y Netflix 199', "pm.expect(body).to.be.an('array').and.not.empty; body.forEach(s=>{pm.expect(s).to.have.all.keys('id','nombre','logo_url','costo_sugerido');pm.expect(s.costo_sugerido).to.be.a('number');}); pm.expect(body.find(s=>s.nombre==='Netflix').costo_sugerido).to.equal(199);"],
], [save('catalogoOriginal', 'JSON.stringify(body)'), "const s=body.find(s=>s.nombre==='Netflix'); if(s)pm.collectionVariables.set('servicioId',s.id);"]);

const rf5 = folder('01 RF5 · casos CP y valores del catálogo');
resumen(rf5, 'CP-RF6-02', 0, 0, 0);
categorias(rf5, 'CP-RF8-02', [], [], undefined, '', true);
membresias(rf5, 'RF5-LISTA-VACIA', 0, 0);
crearM(rf5, 'CP-RF5-01-CREAR', 'crud');
add(rf5, 'CP-RF5-01-LISTAR', 'GET', '/membresias', 200, undefined, [
  ['Cuatro datos capturados', "pm.expect(body).to.have.lengthOf(1);pm.expect(body[0]).to.include({id:Number(pm.collectionVariables.get('crud')),nombre:'Netflix',costo:199,frecuencia:'mensual',fecha_cobro:'2026-10-20',servicio_id:null});pm.expect(Number.isInteger(body[0].dias_para_cobro)).to.equal(true);"],
]);
add(rf5, 'CP-RF5-02-EDITAR', 'PUT', '/membresias/{{crud}}', 200, datos({ costo: 219 }), [
  ['Costo actualizado', "pm.expect(body.membresia.costo).to.equal(219);"],
]);
membresias(rf5, 'CP-RF5-02-PERSISTENCIA', 1, 219);
resumen(rf5, 'CP-RF5-02-RESUMEN', 0, 219, 219);
eliminar(rf5, 'membresias', 'crud');
membresias(rf5, 'CP-RF5-02-ELIMINADA', 0, 0);
for (const [id, patch, code] of [
  ['CP-RF5-03', { nombre: '' }, 'NOMBRE_INVALIDO'], ['CP-RF5-04', { costo: 'abc' }, 'COSTO_INVALIDO'],
  ['RF5-COSTO-CERO', { costo: 0 }, 'COSTO_INVALIDO'],
  ['RF5-FRECUENCIA', { frecuencia: 'semanal' }, 'FRECUENCIA_INVALIDA'],
  ['RF5-FECHA', { fecha_cobro: '2026-02-30' }, 'FECHA_INVALIDA'],
  ['RF5-SERVICIO', { servicio_id: 2147483647 }, 'SERVICIO_INEXISTENTE'],
]) add(rf5, id, 'POST', '/membresias', 400, datos(patch), error(code));
membresias(rf5, 'RF5-INVALIDOS-NO-PERSISTEN', 0, 0);
const catalogBody = { servicio_id: '{{servicioId}}', frecuencia: 'mensual', fecha_cobro: '2026-10-20' };
add(rf5, 'RF5-CATALOGO-HERENCIA', 'POST', '/membresias', 201, catalogBody, [
  ['Nombre y costo heredados', "pm.expect(body.membresia).to.include({nombre:'Netflix',costo:199,servicio_id:Number(pm.collectionVariables.get('servicioId'))});"],
], [save('desdeCatalogo', 'body?.membresia?.id')]);
resumen(rf5, 'RF5-CATALOGO-RESUMEN', 0, 199, 199);
add(rf5, 'RF5-CATALOGO-COSTO-PROPIO', 'PUT', '/membresias/{{desdeCatalogo}}', 200, { ...catalogBody, costo: 219 }, [
  ['Costo propio sin cambiar servicio', "pm.expect(body.membresia).to.include({nombre:'Netflix',costo:219,servicio_id:Number(pm.collectionVariables.get('servicioId'))});"],
]);
resumen(rf5, 'RF5-CATALOGO-COSTO-PROPIO-RESUMEN', 0, 219, 219);
add(rf5, 'RF5-CATALOGO-INTACTO', 'GET', '/catalogo', 200, undefined, [
  ['Catálogo intacto', "pm.expect(body).to.deep.equal(JSON.parse(pm.collectionVariables.get('catalogoOriginal')));"],
]);
eliminar(rf5, 'membresias', 'desdeCatalogo');

const rf6 = folder('02 RF6 · CP-RF6-01 500 + 300 = 800');
crearG(rf6, 'RF6-GASTO-350', 'cp6G1', 350);
crearG(rf6, 'RF6-GASTO-150', 'cp6G2', 150);
crearM(rf6, 'RF6-MENSUAL-300', 'cp6M', { costo: 300 });
resumen(rf6, 'CP-RF6-01', 500, 300, 800);
membresias(rf6, 'CP-RF6-01-FIJO', 1, 300);
categorias(rf6, 'CP-RF6-01-VARIABLE', [['Comida', 500]], [100], undefined, '', true);
for (const key of ['cp6G1', 'cp6G2']) eliminar(rf6, 'gastos', key);
eliminar(rf6, 'membresias', 'cp6M');

const conocido = folder('03 RF8 y conciliación · anual, meses y usuarios');
for (const [i, monto, cat, fecha] of [
  [0, 350, 'catComida', '2026-10-01'], [1, 250, 'catComida', '2026-10-31'],
  [2, 300, 'catTransporte', '2026-10-15'], [3, 100, 'catOcio', '2026-10-20'],
  [4, 777, 'catComida', '2026-09-30'], [5, 888, 'catComida', '2026-11-01'],
]) crearG(conocido, `DATOS-GASTO-${i}`, `datosG${i}`, monto, cat, fecha);
crearM(conocido, 'DATOS-MENSUAL-200', 'mensual', { nombre: 'Gimnasio', costo: 200 });
crearM(conocido, 'DATOS-ANUAL-1200', 'anual', { nombre: 'Anual', costo: 1200, frecuencia: 'anual', fecha_cobro: '2027-01-01' });
membresias(conocido, 'CONSISTENCIA-ANUAL-FIJO', 2, 300);
resumen(conocido, 'CONSISTENCIA-ANUAL-RESUMEN', 1000, 300, 1300);
categorias(conocido, 'CP-RF8-01 / CONSISTENCIA-ANUAL-CATEGORIAS', [['Comida', 600], ['Transporte', 300], ['Entretenimiento', 100]], [60, 30, 10], undefined, '', true);
crearG(conocido, 'DATOS-B-GASTO', 'bGasto', 999, 'catComida', '2026-10-15', 'qaTokenB');
crearM(conocido, 'DATOS-B-MEMBRESIA', 'bMembresia', { nombre: 'Privada B', costo: 750 }, 'qaTokenB');
for (const [user, count, variable, fixed, total, totals, percentages] of [
  ['A', 2, 1000, 300, 1300, [['Comida', 600], ['Transporte', 300], ['Entretenimiento', 100]], [60, 30, 10]],
  ['B', 1, 999, 750, 1749, [['Comida', 999]], [100]],
]) {
  const token = `qaToken${user}`;
  const other = user === 'A' ? 'B' : 'A';
  membresias(conocido, `AISLAMIENTO-${user}-MEMBRESIAS`, count, fixed, token, `?usuario_id={{usuario${other}}}`);
  resumen(conocido, `AISLAMIENTO-${user}-RESUMEN`, variable, fixed, total, token, `&usuario_id={{usuario${other}}}`);
  categorias(conocido, `AISLAMIENTO-${user}-CATEGORIAS`, totals, percentages, token, `&usuario_id={{usuario${other}}}`, true);
  add(conocido, `AISLAMIENTO-${user}-CATALOGO-COMPARTIDO`, 'GET', '/catalogo', 200, undefined, [
    ['Catálogo global sin membresías privadas', "pm.expect(body).to.deep.equal(JSON.parse(pm.collectionVariables.get('catalogoOriginal')));pm.expect(body.some(s=>s.nombre==='Privada B')).to.equal(false);"],
  ], [], token);
}
for (const method of ['PUT', 'DELETE']) add(conocido, `AISLAMIENTO-${method}-AJENA`, method,
  '/membresias/{{anual}}', 404, method === 'PUT' ? datos({ costo: 1 }) : undefined,
  error('MEMBRESIA_NO_ENCONTRADA'), [], 'qaTokenB');
membresias(conocido, 'AISLAMIENTO-A-CONSERVA-FIJO', 2, 300);
resumen(conocido, 'AISLAMIENTO-A-CONSERVA-TOTAL', 1000, 300, 1300);
for (const [mes, total] of [['2026-09', 777], ['2026-11', 888]]) {
  add(conocido, `MESES-${mes}-RESUMEN`, 'GET', `/reportes/resumen?mes=${mes}`, 200, undefined, [
    ['Mes independiente, fijo mensualizado', `pm.expect(body).to.deep.equal({mes:'${mes}',gasto_variable:${total},gasto_fijo:300,total:${total + 300}});`],
  ]);
  add(conocido, `MESES-${mes}-CATEGORIAS`, 'GET', `/reportes/por-categoria?mes=${mes}`, 200, undefined, [
    ['Solo gastos del mes', `pm.expect(body).to.have.lengthOf(1);pm.expect(body[0]).to.include({categoria:'Comida',total:${total},porcentaje:100});`],
  ]);
}

const auth = folder('04 Seguridad y validación de meses');
for (const [method, route, body] of [
  ['GET', '/catalogo'], ['GET', '/membresias'], ['POST', '/membresias', datos()],
  ['PUT', '/membresias/{{anual}}', datos()], ['DELETE', '/membresias/{{anual}}'],
  ['GET', '/reportes/resumen?mes=2026-10'], ['GET', '/reportes/por-categoria?mes=2026-10'],
]) for (const token of [null, 'tokenInvalido']) add(auth, `AUTH-${method}-${route}-${token ? 'INVALIDO' : 'AUSENTE'}`,
  method, route, 401, body, error('NO_AUTORIZADO'), [], token);
membresias(auth, 'AUTH-NO-MODIFICA-MEMBRESIAS', 2, 300);
resumen(auth, 'AUTH-NO-MODIFICA-RESUMEN', 1000, 300, 1300);
for (const route of ['/reportes/resumen', '/reportes/por-categoria']) {
  for (const mes of [null, '', '2026-13', '2026-1', '2026-10-01']) add(auth,
    `MES-INVALIDO-${route}-${mes === null ? 'AUSENTE' : mes || 'VACIO'}`, 'GET',
    route + (mes === null ? '' : `?mes=${mes}`), 400, undefined, error('MES_INVALIDO'));
}

const cambios = folder('05 Cambios y limpieza del conjunto conocido');
add(cambios, 'CAMBIOS-ANUAL-2400', 'PUT', '/membresias/{{anual}}', 200,
  datos({ nombre: 'Anual', costo: 2400, frecuencia: 'anual' }), [['Anual actualizada', 'pm.expect(body.membresia.costo).to.equal(2400);']]);
add(cambios, 'CAMBIOS-GASTO-400', 'PUT', '/gastos/{{datosG0}}', 200,
  { monto: 400, categoria_id: '{{catComida}}', fecha: '2026-10-01', metodo_pago: 'efectivo' },
  [['Gasto actualizado', 'pm.expect(body.gasto.monto).to.equal(400);']]);
membresias(cambios, 'CAMBIOS-FIJO', 2, 400);
resumen(cambios, 'CAMBIOS-RESUMEN', 1050, 400, 1450);
categorias(cambios, 'CAMBIOS-CATEGORIAS', [['Comida', 650], ['Transporte', 300], ['Entretenimiento', 100]], [61, 29, 10], undefined, '', true);
for (let i = 0; i < 6; i++) eliminar(cambios, 'gastos', `datosG${i}`);
for (const key of ['mensual', 'anual']) eliminar(cambios, 'membresias', key);
eliminar(cambios, 'gastos', 'bGasto', 'qaTokenB');
eliminar(cambios, 'membresias', 'bMembresia', 'qaTokenB');
resumen(cambios, 'CAMBIOS-ELIMINADOS-RESUMEN', 0, 0, 0);
categorias(cambios, 'CAMBIOS-ELIMINADOS-CATEGORIAS', [], [], undefined, '', true);
membresias(cambios, 'CAMBIOS-ELIMINADOS-MEMBRESIAS', 0, 0);

const decimales = folder('06 Decimales, porcentajes y limpieza final');
crearG(decimales, 'DECIMALES-010', 'decimalG1', 0.1);
crearG(decimales, 'DECIMALES-020', 'decimalG2', 0.2, 'catTransporte');
crearM(decimales, 'DECIMALES-ANUAL1', 'decimalM1', { costo: 100, frecuencia: 'anual' });
crearM(decimales, 'DECIMALES-ANUAL2', 'decimalM2', { costo: 100, frecuencia: 'anual' });
membresias(decimales, 'CONSISTENCIA-DECIMALES-FIJO', 2, 16.67);
resumen(decimales, 'CONSISTENCIA-DECIMALES-RESUMEN', 0.3, 16.67, 16.97);
categorias(decimales, 'CONSISTENCIA-DECIMALES-CATEGORIAS', [['Transporte', 0.2], ['Comida', 0.1]], [67, 33], undefined, '', true);
for (const key of ['decimalG1', 'decimalG2']) eliminar(decimales, 'gastos', key);
for (const key of ['decimalM1', 'decimalM2']) eliminar(decimales, 'membresias', key);
for (const [i, cat] of ['catComida', 'catTransporte', 'catOcio'].entries()) crearG(decimales, `TERCIOS-${i}`, `tercio${i}`, 1, cat);
categorias(decimales, 'RF8-REDONDEO-100', [['Comida', 1], ['Transporte', 1], ['Entretenimiento', 1]], [34, 33, 33]);
for (let i = 0; i < 3; i++) eliminar(decimales, 'gastos', `tercio${i}`);
for (const user of ['A', 'B']) {
  resumen(decimales, `FINAL-${user}-RESUMEN`, 0, 0, 0, `qaToken${user}`);
  categorias(decimales, `FINAL-${user}-CATEGORIAS`, [], [], `qaToken${user}`, '', true);
  membresias(decimales, `FINAL-${user}-MEMBRESIAS`, 0, 0, `qaToken${user}`);
  add(decimales, `FINAL-${user}-GASTOS`, 'GET', '/gastos', 200, undefined,
    [['Sin gastos de ningún mes', 'pm.expect(body).to.deep.equal([]);']], [], `qaToken${user}`);
}
const output = path.resolve(__dirname, '../../docs/postman/membresias-reportes.postman_collection.json');
fs.writeFileSync(output, JSON.stringify(collection, null, 2) + '\n');
console.log(`Colección: ${collection.item.reduce((s, f) => s + f.item.length, 0)} peticiones por iteración.`);
