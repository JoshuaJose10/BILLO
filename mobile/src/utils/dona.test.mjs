import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { arcosDona, gradosDeLargo } from './dona.js';

// HU-81: arcos de la dona de Reportes.

const GEOMETRIA = { radio: 96, grosor: 16, separacion: 6 };
const CAP = gradosDeLargo(GEOMETRIA.grosor, GEOMETRIA.radio);
const SEP = gradosDeLargo(GEOMETRIA.separacion, GEOMETRIA.radio);
const cerca = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} ≠ ${b}`);

describe('arcosDona', () => {
  test('los huecos suman 360° y son contiguos', () => {
    const arcos = arcosDona([560, 422, 255, 120], GEOMETRIA);
    cerca(
      arcos.reduce((s, a) => s + (a.hasta - a.desde), 0),
      360,
      'suma',
    );
    cerca(arcos[0].desde, 0, 'empieza arriba');
    cerca(arcos.at(-1).hasta, 360, 'termina arriba');
    for (let i = 1; i < arcos.length; i += 1)
      cerca(arcos[i].desde, arcos[i - 1].hasta, 'contiguos');
  });

  test('proporcional a los montos cuando nadie llega al mínimo', () => {
    const arcos = arcosDona([300, 100], GEOMETRIA);
    cerca(arcos[0].hasta - arcos[0].desde, 270, 'mayor');
    cerca(arcos[1].hasta - arcos[1].desde, 90, 'menor');
  });

  test('entre tramos queda la separación (las puntas redondeadas ya descontadas)', () => {
    const arcos = arcosDona([560, 422, 255, 120], GEOMETRIA);
    for (let i = 0; i < arcos.length; i += 1) {
      const a = arcos[i];
      const b = arcos[(i + 1) % arcos.length];
      // fin visible de a (con su punta) e inicio visible de b (con la suya); después del último
      // tramo se da la vuelta: el primero empieza 360° más adelante.
      const finA = a.inicio + a.barrido + CAP / 2;
      const vuelta = i + 1 === arcos.length ? 360 : 0;
      const espacio = b.inicio - CAP / 2 + vuelta - finA;
      cerca(espacio, SEP, `separación entre ${i} y ${(i + 1) % arcos.length}`);
    }
  });

  test('un tramo muy pequeño es un punto que cabe en su hueco', () => {
    const arcos = arcosDona([5000, 3000, 1], GEOMETRIA);
    const chico = arcos[2];
    assert.equal(chico.punto, true);
    assert.equal(chico.barrido, 0);
    cerca(chico.hasta - chico.desde, CAP + SEP, 'hueco mínimo');
    cerca(
      arcos.reduce((s, a) => s + (a.hasta - a.desde), 0),
      360,
      'suma',
    );
    // los grandes no son puntos y conservan su proporción entre sí
    assert.equal(arcos[0].punto, false);
    cerca(
      (arcos[0].hasta - arcos[0].desde) / (arcos[1].hasta - arcos[1].desde),
      5000 / 3000,
      'proporción',
    );
  });

  test('una sola categoría: anillo completo sin hueco', () => {
    assert.deepEqual(arcosDona([123.45], GEOMETRIA), [
      { indice: 0, desde: 0, hasta: 360, inicio: 0, barrido: 360, punto: false, completo: true },
    ]);
  });

  test('ignora montos en cero y conserva el índice original', () => {
    const arcos = arcosDona([0, 50, 50], GEOMETRIA);
    assert.deepEqual(
      arcos.map((a) => a.indice),
      [1, 2],
    );
    assert.deepEqual(arcosDona([], GEOMETRIA), []);
    assert.deepEqual(arcosDona(null, GEOMETRIA), []);
  });

  test('si el mínimo no cabe para todos, reparte 360 / n', () => {
    const arcos = arcosDona(new Array(200).fill(1), GEOMETRIA);
    cerca(arcos[0].hasta - arcos[0].desde, 360 / 200, 'parejo');
    cerca(
      arcos.reduce((s, a) => s + (a.hasta - a.desde), 0),
      360,
      'suma',
    );
  });
});
