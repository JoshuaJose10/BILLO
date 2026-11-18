// Deep link del widget «Registrar por voz»: billo://registrar?tipo=gasto|ingreso&voz=0|1.
// Sin imports de React Native para poder probarlo con node --test; services/enlaces.js lo conecta.

const TIPOS = ['gasto', 'ingreso'];

// { tipo, voz } → 'billo://registrar?tipo=…&voz=…' (lo usan los botones del widget).
export function crearEnlace({ tipo = 'gasto', voz = false } = {}) {
  return `billo://registrar?tipo=${tipo}&voz=${voz ? 1 : 0}`;
}

// URL → params de la hoja NuevoGasto ({ tipo, iniciarVoz }), o null si no es un link válido de
// Billo. Sin `tipo` es gasto y sin `voz` no dicta; cualquier otro valor invalida el link.
// No usa URL/URLSearchParams: en React Native están incompletos.
export function parsearEnlace(url) {
  if (typeof url !== 'string') return null;
  const coincide = /^billo:\/*registrar\/?(?:\?([^#]*))?(?:#.*)?$/i.exec(url.trim());
  if (!coincide) return null;

  const params = {};
  for (const par of (coincide[1] ?? '').split('&')) {
    if (!par) continue;
    const [clave, valor = ''] = par.split('=');
    params[clave] = decodeURIComponent(valor);
  }

  const tipo = params.tipo ?? 'gasto';
  const voz = params.voz ?? '0';
  if (!TIPOS.includes(tipo) || (voz !== '0' && voz !== '1')) return null;
  return { tipo, iniciarVoz: voz === '1' };
}

// Qué hacer con un link pendiente según el navegador raíz (utils/flujoInicio.navegadorRaiz):
// - 'abrir' con sesión, o en el modo exploración (ahí la ruta NuevoGasto es la invitación a
//   crear cuenta, como las demás hojas);
// - 'esperar' sin sesión (Onboarding/Auth) o mientras la cuenta elige sus categorías
//   (ElegirCategorias, HU-89): el link se abre al llegar a 'Sesion'.
export function destinoEnlace(raiz) {
  return raiz === 'Sesion' || raiz === 'Visitante' ? 'abrir' : 'esperar';
}
