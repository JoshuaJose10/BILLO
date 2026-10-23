// Convierte el reporte privado de Newman en evidencia publicable sin tokens ni credenciales.
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Uso: node docs/postman/resumir-ejecucion.cjs <newman-privado.json> <evidencia.json>');
const report = JSON.parse(fs.readFileSync(input, 'utf8'));
function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, /token|password|secret|authorization/i.test(k) ? '[OMITIDO]' : sanitize(v)]));
  if (typeof value === 'string') return value.replace(/[A-Z0-9._%+-]+@example\.test/gi, '[CORREO_QA]').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT_OMITIDO]');
  return value;
}
const folderById = new Map();
for (const folder of report.collection.item) for (const item of folder.item) folderById.set(item.id, folder.name);
const groups = {};
// Newman repite el contexto del item padre para pm.sendRequest. No son casos nuevos.
const seen = new Set();
const mainExecutions = report.run.executions.filter(e => {
  const key = `${e.cursor.iteration}:${e.item.id}`;
  if (seen.has(key)) return false;
  seen.add(key); return true;
});
const executions = mainExecutions.map(e => {
  const folder = folderById.get(e.item.id);
  const assertions = (e.assertions || []).map(a=>({name:a.assertion,passed:!a.error, ...(a.error?{error:sanitize(a.error.message)}:{})}));
  const passed = !e.requestError && assertions.length>0 && assertions.every(a=>a.passed);
  const group = groups[folder] ||= {cases:0,passed:0,failed:0,assertionsPassed:0,assertionsFailed:0};
  group.cases++;group[passed?'passed':'failed']++;
  assertions.forEach(a=>group[a.passed?'assertionsPassed':'assertionsFailed']++);
  let body;
  if(e.response?.stream){const raw=Buffer.from(e.response.stream.data||e.response.stream).toString('utf8');try{body=sanitize(JSON.parse(raw));}catch{body=sanitize(raw);}}
  return {iteration:e.cursor.iteration+1,folder,name:e.item.name,method:e.request.method,path:e.request.url.path.join('/'),status:e.response?.code,passed,assertions,response:body,...(e.requestError?{transportError:sanitize(e.requestError.message)}:{})};
});
const evidence = {
  task:'HU-15',date:'2026-10-22',timezone:'America/Mexico_City',
  backendCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  backendTree:execFileSync('git',['rev-parse','HEAD:backend'],{encoding:'utf8'}).trim(),
  collectionSha256:require('node:crypto').createHash('sha256').update(fs.readFileSync('docs/postman/billo-api.postman_collection.json')).digest('hex'),
  node:process.version,newman:'6.2.3',iterations:report.run.stats.iterations.total,
  scope:'Perfil en /auth/profile por instrucción del usuario; sin nuevos reportes de bugs. Se conservan fallas observadas. Cuentas QA nuevas por iteración; limpieza de gastos vía API.',
  groups,stats:report.run.stats,
  auxiliaryRequests:report.run.stats.requests.total-mainExecutions.length,
  executionErrors:(report.run.failures||[]).filter(f=>!String(f.at).startsWith('assertion:')).map(f=>({name:f.error?.name,message:sanitize(f.error?.message)})),executions
};
if (executions.length !== report.run.stats.items.total) throw new Error('El total de casos no coincide con Newman');
const assertionCount = executions.reduce((n,e)=>n+e.assertions.length,0);
const failedCount = executions.reduce((n,e)=>n+e.assertions.filter(a=>!a.passed).length,0);
if (assertionCount !== report.run.stats.assertions.total || failedCount !== report.run.stats.assertions.failed) throw new Error('Las aserciones no coinciden con Newman');
fs.writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({groups,stats:evidence.stats,executionErrors:evidence.executionErrors},null,2));
