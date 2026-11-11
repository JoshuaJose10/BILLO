// Interpretación de lo que el usuario dicta en Nuevo gasto (HU-57, RF12): «ochenta pesos en
// comida» → { monto: 80, categoria: 'Comida', nota: null }. Solo propone datos: la hoja los
// muestra y el usuario los revisa antes de Confirmar. Si algo no se entiende o es ambiguo, ese
// campo queda en null; nunca se adivina.
// Sin imports para poder probarlo con node --test.

// Mismo tope que el teclado (utils/monto.js, MAX_ENTEROS = 9).
const MONTO_MAXIMO = 999999999.99;

const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');

// Minúsculas y sin acentos: "Comí" → "comi". La ñ se conserva.
export const normalizar = (texto) =>
  String(texto ?? '')
    .toLowerCase()
    .replace(/ñ/g, '\u0001')
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .replace(/\u0001/g, 'ñ');

// ---------------------------------------------------------------------------------------------
// Números en palabras

const UNIDADES = {
  cero: 0,
  uno: 1,
  un: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
};

const ESPECIALES = {
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiun: 21,
  veintiuno: 21,
  veintiuna: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
};

const DECENAS = {
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
};

const CENTENAS = {
  cien: 100,
  ciento: 100,
  doscientos: 200,
  doscientas: 200,
  trescientos: 300,
  trescientas: 300,
  cuatrocientos: 400,
  cuatrocientas: 400,
  quinientos: 500,
  quinientas: 500,
  seiscientos: 600,
  seiscientas: 600,
  setecientos: 700,
  setecientas: 700,
  ochocientos: 800,
  ochocientas: 800,
  novecientos: 900,
  novecientas: 900,
};

const MILLON = ['millon', 'millones'];

const esPalabraNumero = (p) =>
  p in UNIDADES ||
  p in ESPECIALES ||
  p in DECENAS ||
  p in CENTENAS ||
  p === 'mil' ||
  MILLON.includes(p);

// Lee un número en palabras desde tokens[inicio]. Devuelve { valor, fin } (fin = primer token
// que no forma parte) o null si ahí no empieza un número. Acepta "y" solo entre decena y unidad
// ("ochenta y cinco"); "ochenta y comida" termina en "ochenta".
function leerNumeroPalabras(tokens, inicio) {
  let total = 0; // millones y miles ya cerrados
  let grupo = 0; // lo que va de 0 a 999
  let i = inicio;
  let leidos = 0;
  let soloUn = true; // "un"/"una" sueltos no son un monto ("un café")

  while (i < tokens.length) {
    const p = tokens[i];
    if (p === 'y') {
      // Solo "decena y unidad": la decena ya está en `grupo` y lo siguiente es una unidad.
      const sig = tokens[i + 1];
      if (leidos > 0 && grupo % 100 >= 30 && grupo % 10 === 0 && sig in UNIDADES) {
        i += 1;
        continue;
      }
      break;
    }
    if (!esPalabraNumero(p)) break;

    if (p === 'mil') {
      total += (grupo || 1) * 1000;
      grupo = 0;
    } else if (MILLON.includes(p)) {
      total = (total + (grupo || 1)) * 1000000;
      grupo = 0;
    } else if (p in CENTENAS) {
      if (grupo % 1000 >= 100) break; // "cien doscientos": dos números, no uno
      grupo += CENTENAS[p];
    } else if (p in DECENAS || p in ESPECIALES) {
      if (grupo % 100 !== 0) break;
      grupo += DECENAS[p] ?? ESPECIALES[p];
    } else {
      if (grupo % 10 !== 0 || (grupo % 100 >= 10 && grupo % 100 < 30)) break;
      grupo += UNIDADES[p];
    }
    if (p !== 'un' && p !== 'una') soloUn = false;
    leidos += 1;
    i += 1;
  }

  if (leidos === 0 || soloUn) return null;
  return { valor: total + grupo, fin: i };
}

// ---------------------------------------------------------------------------------------------
// Montos

const MARCAS_PESOS = ['peso', 'pesos', 'varo', 'varos', 'mxn'];
const PALABRAS_CENTAVOS = ['centavo', 'centavos'];
const CIERRES_CENTAVOS = ['en', 'de', 'del', 'por', 'para', 'y'];

// "$1,200.50" · "1200" · "80.5" · "80,50" → número, o null.
function numeroDesdeDigitos(texto) {
  const limpio = texto.replace(/^\$/, '');
  if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(limpio)) return Number(limpio.replace(/,/g, ''));
  if (/^\d+([.,]\d{1,2})?$/.test(limpio)) return Number(limpio.replace(',', '.'));
  return null;
}

// Separa el dictado en palabras: `originales` tal como se dijeron (para la nota) y `tokens`
// normalizados en la misma posición. Los signos se vuelven espacios salvo los de las cifras.
function tokenizar(texto) {
  const originales = String(texto ?? '')
    .replace(/(\d)\s+(?=\d{3}\b)/g, '$1,') // "1 200" que a veces escribe el dictado
    .replace(/[^\p{L}\p{N}$.,]+/gu, ' ')
    .replace(/(?<!\d)[.,]|[.,](?!\d)/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return { originales, tokens: originales.map(normalizar) };
}

// Todos los montos que aparecen: [{ valor, inicio, fin, conPesos }].
function candidatosMonto(tokens) {
  const candidatos = [];
  let i = 0;
  while (i < tokens.length) {
    let leido = null;
    const p = tokens[i];
    const digitos = numeroDesdeDigitos(p);
    if (digitos != null) {
      leido = { valor: digitos, fin: i + 1, conPesos: p.startsWith('$') };
    } else if (p === '$' && numeroDesdeDigitos(tokens[i + 1] ?? '') != null) {
      leido = { valor: numeroDesdeDigitos(tokens[i + 1]), fin: i + 2, conPesos: true };
    } else {
      const palabras = leerNumeroPalabras(tokens, i);
      if (palabras) leido = { ...palabras, conPesos: false };
    }

    if (!leido) {
      i += 1;
      continue;
    }

    let { valor, fin, conPesos } = leido;
    if (MARCAS_PESOS.includes(tokens[fin])) {
      conPesos = true;
      fin += 1;
    }
    // Centavos: "ochenta y cinco con cincuenta", "80 punto 50", "80 pesos con 50 centavos".
    if ((tokens[fin] === 'con' || tokens[fin] === 'punto') && Number.isInteger(valor)) {
      const sig = tokens[fin + 1] ?? '';
      const centavos = /^\d{1,2}$/.test(sig)
        ? { valor: Number(sig), fin: fin + 2 }
        : leerNumeroPalabras(tokens, fin + 1);
      // Después de los centavos solo puede seguir el final o un conector («80 con 2 amigos» no
      // son centavos).
      const despues = centavos ? tokens[centavos.fin] : undefined;
      const cierra =
        despues === undefined ||
        PALABRAS_CENTAVOS.includes(despues) ||
        MARCAS_PESOS.includes(despues) ||
        CIERRES_CENTAVOS.includes(despues);
      if (centavos && centavos.valor < 100 && cierra) {
        // "con cinco" son 5 centavos, pero "punto cinco" es medio peso ("punto cero cinco", no).
        const fraccion =
          tokens[fin] === 'punto' && centavos.valor < 10 && sig !== `0${centavos.valor}`
            ? centavos.valor / 10
            : centavos.valor / 100;
        valor += fraccion;
        fin = centavos.fin;
        if (PALABRAS_CENTAVOS.includes(tokens[fin])) fin += 1;
      }
    }
    candidatos.push({ valor: Math.round(valor * 100) / 100, inicio: i, fin, conPesos });
    i = fin;
  }
  return candidatos;
}

// El monto que se dijo, o null si no hay ninguno o hay varios sin forma de elegir
// («dos tacos de ochenta pesos» → 80 porque solo uno lleva "pesos"; «dos tacos ochenta» → null).
function elegirMonto(candidatos) {
  const validos = candidatos.filter((c) => c.valor > 0 && c.valor <= MONTO_MAXIMO);
  if (validos.length === 1) return validos[0];
  const conPesos = validos.filter((c) => c.conPesos);
  return conPesos.length === 1 ? conPesos[0] : null;
}

// ---------------------------------------------------------------------------------------------
// Categorías

// Nombres de las categorías del seed (backend/migrations/007_seed_categorias.sql) y palabras que
// las delatan. Se comparan palabras completas ya normalizadas.
export const SINONIMOS = {
  Comida: [
    'comida',
    'comi',
    'comer',
    'comimos',
    'restaurante',
    'restaurant',
    'taco',
    'tacos',
    'super',
    'supermercado',
    'mercado',
    'despensa',
    'cafe',
    'desayuno',
    'almuerzo',
    'cena',
    'cenamos',
    'pizza',
    'hamburguesa',
    'tortas',
    'torta',
    'sushi',
  ],
  Transporte: [
    'transporte',
    'uber',
    'didi',
    'taxi',
    'gasolina',
    'camion',
    'metro',
    'metrobus',
    'pasaje',
    'estacionamiento',
    'caseta',
    'autobus',
  ],
  Entretenimiento: [
    'entretenimiento',
    'cine',
    'netflix',
    'spotify',
    'concierto',
    'videojuego',
    'videojuegos',
    'teatro',
    'boliche',
  ],
  Servicios: [
    'servicios',
    'servicio',
    'luz',
    'agua',
    'internet',
    'telefono',
    'celular',
    'gas',
    'recibo',
  ],
  Salud: [
    'salud',
    'farmacia',
    'doctor',
    'doctora',
    'medico',
    'medica',
    'medicina',
    'medicinas',
    'medicamento',
    'consulta',
    'dentista',
    'hospital',
  ],
  Otros: ['otros', 'otro', 'otra'],
};

// La categoría mencionada, o null si no se menciona ninguna o se mencionan varias distintas.
// `nombres` son las categorías del usuario (GET /categorias): se reconocen por su nombre, también
// las personalizadas; las del seed además por sus sinónimos. Devuelve el nombre tal como viene en
// `nombres` (o el del seed si no se pasan).
function detectarCategoria(tokens, nombres) {
  const lista = nombres.length ? nombres : Object.keys(SINONIMOS);
  const encontradas = new Set();
  const palabras = new Set(tokens);
  const texto = ` ${tokens.join(' ')} `;

  for (const nombre of lista) {
    const clave = normalizar(nombre).trim();
    if (!clave) continue;
    const base = Object.keys(SINONIMOS).find((k) => normalizar(k) === clave);
    const terminos = [clave, ...(base ? SINONIMOS[base] : [])];
    const aparece = terminos.some((t) =>
      t.includes(' ') ? texto.includes(` ${t} `) : palabras.has(t),
    );
    if (aparece) encontradas.add(nombre);
  }
  return encontradas.size === 1 ? [...encontradas][0] : null;
}

// ---------------------------------------------------------------------------------------------
// Nota

// Palabras que no dicen nada del gasto: muletillas, verbos de "gastar" y conectores.
const MULETILLAS = new Set([
  'eh',
  'em',
  'mm',
  'mmm',
  'este',
  'pues',
  'bueno',
  'ok',
  'okay',
  'oye',
  'gaste',
  'gastamos',
  'pague',
  'pagamos',
  'compre',
  'fueron',
  'fue',
  'son',
  'es',
  'me',
  'costo',
  'registra',
  'anota',
  'agrega',
]);
const CONECTORES = new Set([
  'en',
  'de',
  'del',
  'por',
  'para',
  'el',
  'la',
  'los',
  'las',
  'al',
  'a',
  'y',
  'con',
  'un',
  'una',
  'unos',
  'unas',
  'mi',
  'mis',
  'categoria',
]);

// Lo que queda del dictado sin el monto, la categoría y las muletillas («gasté 85 en tacos con
// amigos» → "Tacos con amigos"), con las palabras tal como se dijeron. null si no queda nada.
function sugerirNota({ originales, tokens }, monto, categoria) {
  const nombreCategoria = categoria ? normalizar(categoria) : null;
  const palabras = originales.filter((_, i) => {
    const n = tokens[i];
    if (monto && i >= monto.inicio && i < monto.fin) return false;
    return (
      n !== nombreCategoria &&
      !MULETILLAS.has(n) &&
      !MARCAS_PESOS.includes(n) &&
      n !== '$' &&
      numeroDesdeDigitos(n) == null
    );
  });
  while (palabras.length && CONECTORES.has(normalizar(palabras[0]))) palabras.shift();
  while (palabras.length && CONECTORES.has(normalizar(palabras.at(-1)))) palabras.pop();
  if (!palabras.length) return null;

  const nota = palabras.join(' ').slice(0, 200);
  return nota.charAt(0).toUpperCase() + nota.slice(1);
}

// ---------------------------------------------------------------------------------------------

// { monto: número | null, categoria: nombre | null, nota: texto | null } a partir del dictado.
// `nombres`: los nombres de las categorías del usuario (opcional).
export function interpretarGasto(texto, nombres = []) {
  const palabras = tokenizar(texto);
  const monto = elegirMonto(candidatosMonto(palabras.tokens));
  const categoria = detectarCategoria(palabras.tokens, nombres);
  return {
    monto: monto ? monto.valor : null,
    categoria,
    nota: sugerirNota(palabras, monto, categoria),
  };
}
