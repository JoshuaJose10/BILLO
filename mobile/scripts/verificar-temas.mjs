// Falla si temas.claro y temas.oscuro (src/theme/colors.js) no tienen exactamente las mismas
// claves: un token que solo existe en un tema dejaría `undefined` en el otro.
// Uso: npm run verificar:temas
import { temas } from '../src/theme/colors.js';

const nombres = Object.keys(temas);
const referencia = new Set(Object.keys(temas.oscuro));
let errores = 0;

for (const nombre of nombres) {
  const claves = new Set(Object.keys(temas[nombre]));
  const faltan = [...referencia].filter((k) => !claves.has(k));
  const sobran = [...claves].filter((k) => !referencia.has(k));
  if (faltan.length) console.error(`temas.${nombre}: faltan ${faltan.join(', ')}`);
  if (sobran.length) console.error(`temas.${nombre}: sobran ${sobran.join(', ')}`);
  errores += faltan.length + sobran.length;
}

if (errores > 0) {
  process.exitCode = 1;
} else {
  console.log(`Temas ${nombres.join(' y ')}: ${referencia.size} claves iguales.`);
}
