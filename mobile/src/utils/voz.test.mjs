// Pruebas de utils/voz.js (HU-57, RF12) con el runner de Node: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DESCRIPCION_MAX, FUENTES } from './ingresos.js';
import {
  avisoDictado,
  interpretarGasto,
  interpretarDictado,
  interpretarIngreso,
  mensajeFalloVoz,
  normalizar,
  notaDictada,
  pareceGasto,
  pareceIngreso,
} from './voz.js';

const CATEGORIAS = ['Comida', 'Transporte', 'Entretenimiento', 'Servicios', 'Salud', 'Otros'];

const monto = (texto) => interpretarGasto(texto, CATEGORIAS).monto;
const categoria = (texto, nombres = CATEGORIAS) => interpretarGasto(texto, nombres).categoria;
const nota = (texto) => interpretarGasto(texto, CATEGORIAS).nota;

describe('interpretarGasto: casos de aceptación', () => {
  it('«ochenta pesos en comida» → 80 y Comida, sin nota', () => {
    assert.deepEqual(interpretarGasto('ochenta pesos en comida', CATEGORIAS), {
      monto: 80,
      categoria: 'Comida',
      nota: null,
    });
  });

  it('«ciento cincuenta en transporte» → 150 y Transporte', () => {
    assert.deepEqual(interpretarGasto('ciento cincuenta en transporte', CATEGORIAS), {
      monto: 150,
      categoria: 'Transporte',
      nota: null,
    });
  });

  it('sin monto: conserva la categoría y el monto queda en null', () => {
    assert.deepEqual(interpretarGasto('gasté en el cine', CATEGORIAS), {
      monto: null,
      categoria: 'Entretenimiento',
      nota: 'Cine',
    });
  });

  it('sin categoría: conserva el monto y la categoría queda en null', () => {
    assert.deepEqual(interpretarGasto('doscientos pesos', CATEGORIAS), {
      monto: 200,
      categoria: null,
      nota: null,
    });
  });

  it('solo ruido: todo en null', () => {
    for (const ruido of ['eh este pues', 'mmm bueno', '', '   ', '¿?', null, undefined]) {
      assert.deepEqual(interpretarGasto(ruido, CATEGORIAS), {
        monto: null,
        categoria: null,
        nota: null,
      });
    }
  });

  it('mayúsculas y acentos no cambian el resultado', () => {
    assert.deepEqual(interpretarGasto('OCHENTA PESOS EN COMIDA', CATEGORIAS), {
      monto: 80,
      categoria: 'Comida',
      nota: null,
    });
    assert.equal(monto('Ciénto Cincuénta'), 150);
    assert.equal(monto('dieciséis'), 16);
    assert.equal(monto('dieciseis'), 16);
    assert.equal(categoria('Comí en un RESTAURANTE'), 'Comida');
    assert.equal(categoria('fui al médico'), 'Salud');
    assert.equal(categoria('camión'), 'Transporte');
  });
});

describe('montos en dígitos', () => {
  it('enteros, decimales, signo de pesos y miles con coma', () => {
    assert.equal(monto('80'), 80);
    assert.equal(monto('80.50'), 80.5);
    assert.equal(monto('80,50'), 80.5);
    assert.equal(monto('$80'), 80);
    assert.equal(monto('$ 80'), 80);
    assert.equal(monto('$1,200'), 1200);
    assert.equal(monto('1,200.75 de renta'), 1200.75);
    assert.equal(monto('12,345,678'), 12345678);
    assert.equal(monto('1 200 pesos'), 1200);
  });

  it('con puntuación del dictado alrededor', () => {
    assert.equal(monto('Gasté 85 en tacos.'), 85);
    assert.equal(monto('¿80?'), 80);
    assert.equal(monto('fueron 80, en comida'), 80);
  });

  it('dígitos y centavos dichos', () => {
    assert.equal(monto('80 con 50'), 80.5);
    assert.equal(monto('80 punto 50'), 80.5);
    assert.equal(monto('80 punto 5'), 80.5);
    assert.equal(monto('80 pesos con 25 centavos'), 80.25);
  });
});

describe('montos en palabras', () => {
  const casos = {
    cero: null,
    uno: 1,
    cinco: 5,
    diez: 10,
    quince: 15,
    veinte: 20,
    veintiuno: 21,
    'veintiún pesos': 21,
    veinticinco: 25,
    treinta: 30,
    'treinta y cinco': 35,
    ochenta: 80,
    'ochenta y cinco': 85,
    'noventa y nueve': 99,
    cien: 100,
    'ciento uno': 101,
    'ciento cincuenta': 150,
    'ciento noventa y nueve': 199,
    doscientos: 200,
    'doscientos treinta y cinco': 235,
    quinientos: 500,
    setecientos: 700,
    novecientos: 900,
    mil: 1000,
    'un mil': 1000,
    'mil quinientos': 1500,
    'mil doscientos cincuenta': 1250,
    'dos mil': 2000,
    'dos mil trescientos cuarenta y cinco': 2345,
    'quince mil': 15000,
    'ciento veinte mil': 120000,
    'un millón': 1000000,
    'dos millones quinientos mil': 2500000,
  };
  for (const [texto, esperado] of Object.entries(casos)) {
    it(`«${texto}» → ${esperado}`, () => assert.equal(monto(texto), esperado));
  }

  it('centavos con "con", "punto" y "centavos"', () => {
    assert.equal(monto('ochenta y cinco con cincuenta'), 85.5);
    assert.equal(monto('ochenta y cinco con cincuenta en comida'), 85.5);
    assert.equal(monto('cien pesos con veinte centavos'), 100.2);
    assert.equal(monto('cien con cinco'), 100.05);
    assert.equal(monto('cien punto cinco'), 100.5);
    assert.equal(monto('mil doscientos cincuenta pesos con veinte centavos de doctor'), 1250.2);
  });

  it('"con" seguido de otra cosa no son centavos', () => {
    assert.equal(monto('ochenta con tarjeta'), 80);
    assert.equal(monto('80 con 2 amigos'), null); // dos cifras sin "pesos": ambiguo
    assert.equal(monto('80 pesos con 2 amigos'), 80);
  });

  it('"y" solo une decena y unidad', () => {
    assert.equal(monto('ochenta y comida'), 80);
    assert.equal(monto('cien y cinco'), null); // 100 y 5: dos números
  });
});

describe('montos ambiguos o inexistentes: null, nunca se inventa', () => {
  it('"un"/"una" sueltos no son un monto', () => {
    assert.equal(monto('gasté en un café'), null);
    assert.equal(monto('una pizza'), null);
  });

  it('varias cifras sin forma de elegir', () => {
    assert.equal(monto('dos tacos ochenta'), null);
    assert.equal(monto('80 o 90'), null);
    assert.equal(monto('veinte cinco'), null);
  });

  it('con varias cifras gana la única que lleva "pesos" o "$"', () => {
    assert.equal(monto('dos tacos de ochenta pesos'), 80);
    assert.equal(monto('3 cafés por $120'), 120);
    assert.equal(monto('2 boletos de 150 pesos'), 150);
    assert.equal(monto('80 pesos y 90 pesos'), null);
  });

  it('cero, negativos y fuera del tope del teclado', () => {
    assert.equal(monto('0 pesos'), null);
    assert.equal(monto('mil millones'), null);
    assert.equal(monto('-80'), 80); // el signo menos se ignora (no hay montos negativos)
  });

  it('palabras que contienen números no cuentan', () => {
    assert.equal(monto('dosis de medicina'), null);
    assert.equal(monto('milanesa'), null);
  });
});

describe('categorías', () => {
  const casos = {
    'tacos al pastor': 'Comida',
    'comí con mi familia': 'Comida',
    'el súper': 'Comida',
    'despensa del mes': 'Comida',
    'un uber': 'Transporte',
    gasolina: 'Transporte',
    'el camión': 'Transporte',
    'el cine': 'Entretenimiento',
    netflix: 'Entretenimiento',
    'la luz': 'Servicios',
    'el recibo del agua': 'Servicios',
    internet: 'Servicios',
    farmacia: 'Salud',
    'el doctor': 'Salud',
    otros: 'Otros',
  };
  for (const [texto, esperado] of Object.entries(casos)) {
    it(`«${texto}» → ${esperado}`, () => assert.equal(categoria(texto), esperado));
  }

  it('palabras completas: "gasolina" no es "gas", "cinema" no es "cine"', () => {
    assert.equal(categoria('gasolina'), 'Transporte');
    assert.equal(categoria('cinema'), null);
    assert.equal(categoria('superman'), null);
  });

  it('dos categorías distintas: null', () => {
    assert.equal(categoria('comí en el cine'), null);
    assert.equal(categoria('uber a la farmacia'), null);
  });

  it('varias palabras de la misma categoría: esa categoría', () => {
    assert.equal(categoria('tacos en el restaurante'), 'Comida');
  });

  it('devuelve el nombre como lo trae el usuario y reconoce las personalizadas', () => {
    assert.equal(categoria('tacos', ['COMIDA', 'Mascotas']), 'COMIDA');
    assert.equal(categoria('croquetas para mascotas', [...CATEGORIAS, 'Mascotas']), 'Mascotas');
  });

  it('una categoría del seed que el usuario no tiene no se propone', () => {
    assert.equal(categoria('netflix', ['Comida', 'Transporte']), null);
  });

  it('sin lista usa las del seed', () => {
    assert.equal(interpretarGasto('ochenta en comida').categoria, 'Comida');
  });
});

describe('nota sugerida', () => {
  it('lo que queda sin monto, categoría ni muletillas, como se dijo', () => {
    assert.equal(nota('Gasté 85 en tacos con mis amigos'), 'Tacos con mis amigos');
    assert.equal(nota('uber al aeropuerto 250'), 'Uber al aeropuerto');
    assert.equal(nota('doscientos treinta y cinco de luz'), 'Luz');
    assert.equal(nota('mil quinientos en el súper'), 'Súper');
    assert.equal(nota('dos tacos de ochenta pesos'), 'Dos tacos');
    assert.equal(nota('eh pues gasté 80 en un café'), 'Café');
  });

  it('el "con" de la nota se conserva aunque el monto lleve centavos', () => {
    assert.equal(nota('ochenta y cinco con cincuenta en tacos con amigos'), 'Tacos con amigos');
  });

  it('sin nada que anotar: null', () => {
    assert.equal(nota('ochenta pesos en comida'), null);
    assert.equal(nota('$1,200'), null);
    assert.equal(nota('en la de por'), null);
  });

  it('no pasa del límite de 200 caracteres de la API', () => {
    assert.ok(nota(`80 pesos ${'palabra '.repeat(60)}`).length <= 200);
  });
});

describe('normalizar', () => {
  it('quita acentos y mayúsculas pero conserva la ñ', () => {
    assert.equal(normalizar('Comí PIÑA'), 'comi piña');
    assert.equal(normalizar('Médico'), 'medico');
    assert.equal(normalizar(null), '');
  });
});

describe('mensajes de la hoja', () => {
  it('permiso negado o no disponible: aviso claro y sigue la captura manual', () => {
    assert.match(mensajeFalloVoz('permiso'), /permiso de micrófono.*escribe el monto/i);
    assert.equal(mensajeFalloVoz('not-allowed'), mensajeFalloVoz('permiso'));
    assert.match(mensajeFalloVoz('no-disponible'), /no está disponible.*escribe el monto/i);
    assert.match(mensajeFalloVoz('language-not-supported'), /no está disponible/);
  });

  it('sin voz, sin red, micrófono ocupado y desconocidos tienen su aviso', () => {
    assert.match(mensajeFalloVoz('no-speech'), /no te escuché/i);
    assert.match(mensajeFalloVoz('network'), /conexión/);
    assert.match(mensajeFalloVoz('busy'), /ocupado/);
    assert.match(mensajeFalloVoz('algo-nuevo'), /escribe el monto/i);
  });

  it('cancelar (aborted) no avisa', () => {
    assert.equal(mensajeFalloVoz('aborted'), null);
  });

  it('avisoDictado: sin texto, sin monto, sin categoría o nada', () => {
    assert.match(avisoDictado('', { monto: null, categoria: null }), /no te escuché/i);
    assert.equal(
      avisoDictado('en comida', { monto: null, categoria: 'Comida' }),
      'No entendí el monto, escríbelo.',
    );
    assert.equal(
      avisoDictado('ochenta', { monto: 80, categoria: null }),
      'No entendí la categoría, elígela.',
    );
    assert.equal(avisoDictado('ochenta en comida', { monto: 80, categoria: 'Comida' }), null);
  });
});

describe('interpretarIngreso (HU-94)', () => {
  it('monto y fuente por sinónimos', () => {
    const montoYFuente = (texto) => {
      const { monto, fuente } = interpretarIngreso(texto);
      return { monto, fuente };
    };
    assert.deepEqual(montoYFuente('me pagaron cinco mil de sueldo'), {
      monto: 5000,
      fuente: 'Sueldo',
    });
    assert.deepEqual(montoYFuente('recibí la beca de dos mil'), { monto: 2000, fuente: 'Beca' });
    assert.deepEqual(montoYFuente('me depositó el cliente 1500'), {
      monto: 1500,
      fuente: 'Freelance',
    });
    assert.equal(interpretarIngreso('me cayó la quincena, 4 mil').fuente, 'Sueldo');
  });

  it('lo que no entiende queda en null', () => {
    assert.deepEqual(interpretarIngreso('me pagaron'), {
      monto: null,
      fuente: null,
      descripcion: null,
    });
    assert.deepEqual(interpretarIngreso('me cayó 300'), {
      monto: 300,
      fuente: null,
      descripcion: null,
    });
  });

  it('avisoDictado en Ingreso pide la fuente', () => {
    assert.equal(
      avisoDictado('me cayó 300', { monto: 300, categoria: null }, 'la fuente'),
      'No entendí la fuente, elígela.',
    );
  });
});

describe('descripción y fuentes de ingreso (HU-94)', () => {
  const ingreso = (texto) => interpretarIngreso(texto);

  it('descripción sin monto, fuente ni frases de ingreso', () => {
    assert.deepEqual(ingreso('me pagaron cinco mil de sueldo de la chamba de diseño'), {
      monto: 5000,
      fuente: 'Sueldo',
      descripcion: 'Chamba de diseño',
    });
    assert.deepEqual(ingreso('recibí 1500 por el diseño de un logo'), {
      monto: 1500,
      fuente: null,
      descripcion: 'Diseño de un logo',
    });
  });

  it('sin nada más que decir no hay descripción; respeta el máximo', () => {
    assert.equal(ingreso('recibí la beca de dos mil').descripcion, null);
    assert.equal(ingreso('me depositó el cliente 1500').descripcion, null);
    assert.ok(ingreso(`me pagaron 500 ${'x '.repeat(300)}`).descripcion.length <= DESCRIPCION_MAX);
  });

  it('una frase por cada fuente', () => {
    const casos = [
      ['me pagaron el aguinaldo de ocho mil', 8000, 'Aguinaldo/Bono'],
      ['cobré el bono de 3000', 3000, 'Aguinaldo/Bono'],
      ['vendí mi bici en 800', 800, 'Ventas'],
      ['me cayeron intereses de 120', 120, 'Inversiones'],
      ['cobré la renta 5000', 5000, 'Renta'],
      ['me regalaron mil pesos', 1000, 'Regalo'],
      ['me devolvieron 300 del reembolso', 300, 'Reembolso'],
    ];
    for (const [texto, monto, fuente] of casos) {
      const r = ingreso(texto);
      assert.deepEqual([r.monto, r.fuente], [monto, fuente], texto);
      assert.equal(
        FUENTES.some((f) => f.nombre === r.fuente),
        true,
        texto,
      );
    }
  });

  it('con varias fuentes mencionadas gana la primera de FUENTES; «me dieron» no pisa al sueldo', () => {
    assert.equal(ingreso('me dieron mi sueldo 900').fuente, 'Sueldo');
  });

  it('notaDictada: no sobrescribe lo que el usuario ya escribió', () => {
    assert.equal(notaDictada('', 'Chamba'), 'Chamba');
    assert.equal(notaDictada('  ', 'Chamba'), 'Chamba');
    assert.equal(notaDictada('Mi nota', 'Chamba'), null);
    assert.equal(notaDictada(undefined, null), '');
  });

  it('caso del teléfono: un dictado nuevo reemplaza la descripción que vino de otro dictado', () => {
    const { monto, fuente, descripcion } = interpretarIngreso(
      'Me pagaron 3000 del proyecto de la tienda',
    );
    assert.deepEqual(
      { monto, fuente, descripcion },
      {
        monto: 3000,
        fuente: 'Freelance',
        descripcion: 'Tienda',
      },
    );
    // La descripción de antes vino de un dictado (marca en true): se reemplaza.
    assert.equal(notaDictada('Chamba de diseño', descripcion, true), 'Tienda');
    // Sin descripción nueva, la del dictado anterior se vacía en vez de quedarse.
    assert.equal(notaDictada('Chamba de diseño', null, true), '');
    // Escrita a mano (sin marca): se respeta.
    assert.equal(notaDictada('Mi nota', 'Tienda', false), null);
  });
});

describe('pareceIngreso (HU-94)', () => {
  it('true con frases de ingreso', () => {
    for (const texto of [
      'me pagaron cinco mil',
      'Me depositaron 2000',
      'me depositó el cliente 1500',
      'recibí la beca',
      'me cayó 300',
      'cobré el proyecto',
      'cobré la renta 5000',
    ]) {
      assert.equal(pareceIngreso(texto), true, texto);
    }
  });

  it('false con gastos', () => {
    for (const texto of [
      'ochenta pesos en comida',
      'pagué la luz',
      'me cobraron 50',
      'pagué la renta 5000',
      '',
    ]) {
      assert.equal(pareceIngreso(texto), false, texto);
    }
  });
});

describe('categorías base ampliadas (HU-94)', () => {
  const NUEVAS = [
    'Comida rápida',
    'Súper',
    'Café',
    'Hogar',
    'Ropa',
    'Educación',
    'Mascotas',
    'Cuidado personal',
  ];
  const TODAS = [...CATEGORIAS, ...NUEVAS];

  it('con todas activas, cada sinónimo cae en su categoría', () => {
    const esperado = {
      'tacos al pastor': 'Comida rápida',
      'una pizza grande': 'Comida rápida',
      'un hot dog': 'Comida rápida',
      'despensa del mes': 'Súper',
      'compras en walmart': 'Súper',
      'un café en starbucks': 'Café',
      'la renta del depa': 'Hogar',
      'zapatos nuevos': 'Ropa',
      'la colegiatura': 'Educación',
      'croquetas del perro': 'Mascotas',
      'la peluquería': 'Cuidado personal',
      'comí en un restaurante': 'Comida',
      'pagué la luz': 'Servicios',
      'el dentista': 'Salud',
    };
    for (const [texto, cat] of Object.entries(esperado)) {
      assert.equal(categoria(texto, TODAS), cat, texto);
    }
  });

  it('sin la lista del usuario se reconocen todas', () => {
    assert.equal(interpretarGasto('tacos 80').categoria, 'Comida rápida');
  });

  it('si la nueva no está activa cae en la más cercana: Comida, Servicios, Salud u Otros', () => {
    const esperado = {
      tacos: 'Comida',
      'despensa del mes': 'Comida',
      'un café': 'Comida',
      'la renta': 'Servicios',
      'corte de pelo': 'Salud',
      'zapatos nuevos': 'Otros',
      'la colegiatura': 'Otros',
      'croquetas del perro': 'Otros',
    };
    for (const [texto, cat] of Object.entries(esperado)) {
      assert.equal(categoria(texto, CATEGORIAS), cat, texto);
    }
  });

  it('el fallback solo aplica a las no activas y exige que la cercana esté activa', () => {
    assert.equal(categoria('tacos', ['Comida', 'Café']), 'Comida');
    assert.equal(categoria('un café', ['Comida', 'Café']), 'Café');
    assert.equal(categoria('un café', ['Servicios']), null);
    assert.equal(categoria('tacos en el super', TODAS), null);
    assert.equal(categoria('tacos en el super', CATEGORIAS), 'Comida');
  });
});

describe('cambio automático de pestaña (HU-94)', () => {
  const TODAS = [...CATEGORIAS, 'Comida rápida', 'Súper', 'Café', 'Hogar'];

  it('«me pagaron 3000» en Gasto cambia a Ingreso', () => {
    const r = interpretarDictado('me pagaron 3000', 'gasto', TODAS);
    assert.equal(r.modo, 'ingreso');
    assert.equal(r.cambio, true);
    assert.equal(r.monto, 3000);
    assert.ok('fuente' in r && 'descripcion' in r);
  });

  it('«gasté 90 en tacos» en Ingreso cambia a Gasto con Comida rápida', () => {
    const r = interpretarDictado('gasté 90 en tacos', 'ingreso', TODAS);
    assert.deepEqual(
      [r.modo, r.cambio, r.monto, r.categoria],
      ['gasto', true, 90, 'Comida rápida'],
    );
  });

  it('«pagué la renta» en Gasto se queda en Gasto', () => {
    const r = interpretarDictado('pagué la renta 5000', 'gasto', TODAS);
    assert.deepEqual([r.modo, r.cambio, r.categoria], ['gasto', false, 'Hogar']);
  });

  it('sin `cambiar` (Deshacer) interpreta en la pestaña pedida', () => {
    const r = interpretarDictado('me pagaron 3000', 'gasto', TODAS, false);
    assert.deepEqual([r.modo, r.cambio, r.monto], ['gasto', false, 3000]);
  });

  it('pareceGasto', () => {
    for (const texto of ['gasté 90', 'pagué la luz', 'compré tenis', 'me cobraron 50']) {
      assert.equal(pareceGasto(texto), true, texto);
    }
    for (const texto of ['me pagaron 3000', 'cobré la renta', 'me pagó el cliente', '']) {
      assert.equal(pareceGasto(texto), false, texto);
    }
  });
});
