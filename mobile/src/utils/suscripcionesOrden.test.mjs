import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  agruparPorFrecuencia,
  calcularTotalMensual,
  filtrarCatalogo,
  normalizarBusqueda,
  ORDEN_SUSCRIPCIONES,
  ordenarMembresias,
  tramosSuscripciones,
} from './membresias.js';

// HU-72: buscador del catálogo y ordenar / agrupar la lista de Suscripciones.

const CATALOGO = [
  { id: 1, nombre: 'Netflix Estándar', costo_sugerido: 269 },
  { id: 2, nombre: 'Spotify Individual', costo_sugerido: 139 },
  { id: 3, nombre: 'Spotify Duo', costo_sugerido: 189 },
  { id: 4, nombre: 'Disney+ Estándar', costo_sugerido: 249 },
  { id: 5, nombre: 'Crunchyroll', costo_sugerido: 99 },
];

const ids = (lista) => lista.map((x) => x.id);

describe('normalizarBusqueda', () => {
  test('quita acentos, mayúsculas y espacios sobrantes', () => {
    assert.equal(normalizarBusqueda('  ESTÁNDAR '), 'estandar');
    assert.equal(normalizarBusqueda(undefined), '');
  });
});

describe('filtrarCatalogo', () => {
  test('"spo" deja solo los de Spotify; "net" solo Netflix', () => {
    assert.deepEqual(ids(filtrarCatalogo(CATALOGO, 'spo')), [2, 3]);
    assert.deepEqual(ids(filtrarCatalogo(CATALOGO, 'net')), [1]);
  });

  test('ignora mayúsculas y acentos en ambos lados', () => {
    assert.deepEqual(ids(filtrarCatalogo(CATALOGO, 'SPO')), [2, 3]);
    assert.deepEqual(ids(filtrarCatalogo(CATALOGO, 'estandar')), [1, 4]);
    assert.deepEqual(ids(filtrarCatalogo(CATALOGO, 'estándar')), [1, 4]);
  });

  test('busca también por el plan, con las palabras en cualquier orden', () => {
    assert.deepEqual(ids(filtrarCatalogo(CATALOGO, 'duo')), [3]);
    assert.deepEqual(ids(filtrarCatalogo(CATALOGO, 'duo spotify')), [3]);
  });

  test('sin coincidencias devuelve una lista vacía', () => {
    assert.deepEqual(filtrarCatalogo(CATALOGO, 'xyz'), []);
  });

  test('consulta vacía o de espacios: el catálogo completo', () => {
    assert.equal(filtrarCatalogo(CATALOGO, ''), CATALOGO);
    assert.equal(filtrarCatalogo(CATALOGO, '   '), CATALOGO);
    assert.deepEqual(filtrarCatalogo(undefined, 'spo'), []);
  });
});

const MEMBRESIAS = [
  { id: 1, nombre: 'Spotify', costo: 139, frecuencia: 'mensual', dias_para_cobro: 10 },
  { id: 2, nombre: 'Netflix', costo: 269, frecuencia: 'mensual', dias_para_cobro: 2 },
  { id: 3, nombre: 'Gimnasio', costo: 6000, frecuencia: 'anual', dias_para_cobro: 40 }, // 500/mes
  { id: 4, nombre: 'iCloud', costo: 1200, frecuencia: 'anual', dias_para_cobro: 5 }, // 100/mes
  { id: 5, nombre: 'Sin fecha', costo: 50, frecuencia: 'mensual' },
];

describe('ordenarMembresias', () => {
  test('por fecha: la más próxima primero y las sin fecha al final', () => {
    assert.deepEqual(
      ids(ordenarMembresias(MEMBRESIAS, ORDEN_SUSCRIPCIONES.fecha)),
      [2, 4, 1, 3, 5],
    );
  });

  test('fecha es el criterio por defecto', () => {
    assert.deepEqual(ids(ordenarMembresias(MEMBRESIAS)), [2, 4, 1, 3, 5]);
  });

  test('por costo: de mayor a menor costo mensual (anual ÷ 12)', () => {
    // Gimnasio 500, Netflix 269, Spotify 139, iCloud 100, Sin fecha 50
    assert.deepEqual(
      ids(ordenarMembresias(MEMBRESIAS, ORDEN_SUSCRIPCIONES.costo)),
      [3, 2, 1, 4, 5],
    );
  });

  test('empates: por fecha y luego por nombre', () => {
    const empate = [
      { id: 1, nombre: 'Zeta', costo: 100, frecuencia: 'mensual', dias_para_cobro: 3 },
      { id: 2, nombre: 'Anual', costo: 1200, frecuencia: 'anual', dias_para_cobro: 1 },
      { id: 3, nombre: 'Alfa', costo: 100, frecuencia: 'mensual', dias_para_cobro: 3 },
    ];
    assert.deepEqual(ids(ordenarMembresias(empate, ORDEN_SUSCRIPCIONES.costo)), [2, 3, 1]);
    assert.deepEqual(ids(ordenarMembresias(empate, ORDEN_SUSCRIPCIONES.fecha)), [2, 3, 1]);
  });

  test('no muta la lista original', () => {
    const copia = [...MEMBRESIAS];
    ordenarMembresias(MEMBRESIAS, ORDEN_SUSCRIPCIONES.costo);
    assert.deepEqual(MEMBRESIAS, copia);
    assert.deepEqual(ordenarMembresias(undefined), []);
  });

  test('ordenar no cambia el total mensual ni la barra', () => {
    for (const criterio of Object.values(ORDEN_SUSCRIPCIONES)) {
      const ordenadas = ordenarMembresias(MEMBRESIAS, criterio);
      assert.equal(calcularTotalMensual(ordenadas), calcularTotalMensual(MEMBRESIAS));
      assert.deepEqual(tramosSuscripciones(ordenadas), tramosSuscripciones(MEMBRESIAS));
    }
  });
});

describe('agruparPorFrecuencia', () => {
  test('secciones Mensuales y Anuales, cada una por fecha', () => {
    const grupos = agruparPorFrecuencia(MEMBRESIAS);
    assert.deepEqual(
      grupos.map((g) => [g.titulo, ids(g.membresias)]),
      [
        ['Mensuales', [2, 1, 5]],
        ['Anuales', [4, 3]],
      ],
    );
  });

  test('omite la sección vacía y trata la frecuencia ausente como mensual', () => {
    const grupos = agruparPorFrecuencia([{ id: 1, nombre: 'X', costo: 10 }]);
    assert.deepEqual(
      grupos.map((g) => g.frecuencia),
      ['mensual'],
    );
    assert.deepEqual(agruparPorFrecuencia([]), []);
  });
});
