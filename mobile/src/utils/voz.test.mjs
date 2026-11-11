// Pruebas de utils/voz.js (HU-57, RF12) con el runner de Node: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { interpretarGasto, normalizar } from './voz.js';

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
