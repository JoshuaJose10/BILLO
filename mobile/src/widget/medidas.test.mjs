// Pruebas de widget/medidas.js con el runner de Node: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  categoriasQueCaben,
  esMediano,
  medidasMediano,
  medidasPequeno,
  textoRegistrarVoz,
} from './medidas.js';

const CATEGORIAS = ['Entretenimiento', 'Comida', 'Otros'];

describe('esMediano', () => {
  it('2×2 típicos (160 y 200 dp): pequeño; 4×2 típicos (320 y 380 dp): mediano', () => {
    assert.equal(esMediano(160), false);
    assert.equal(esMediano(200), false);
    assert.equal(esMediano(320), true);
    assert.equal(esMediano(380), true);
  });
});

describe('medidasPequeno', () => {
  it('a 160 y 200 dp los tres botones van solo con ícono', () => {
    for (const ancho of [160, 200]) {
      assert.equal(medidasPequeno({ ancho, alto: 180 }).textoBotones, false);
    }
  });
  it('con ancho de sobra, los textos completos', () => {
    assert.equal(medidasPequeno({ ancho: 340, alto: 180 }).textoBotones, true);
  });
  it('chip: completo, corto o nada según ancho y alto', () => {
    assert.equal(medidasPequeno({ ancho: 200, alto: 180, ingresos: '+$900' }).chip, 'completo');
    assert.equal(medidasPequeno({ ancho: 160, alto: 180, ingresos: '+$10,000.50' }).chip, 'corto');
    assert.equal(medidasPequeno({ ancho: 200, alto: 150, ingresos: '+$900' }).chip, null);
  });
});

describe('medidasMediano', () => {
  it('columnas 58/42 del ancho útil', () => {
    const { izquierda, derecha } = medidasMediano({ ancho: 380, alto: 180 });
    assert.equal(izquierda + derecha, 380 - 28 - 25);
    assert.ok(Math.abs(izquierda / (izquierda + derecha) - 0.58) < 0.01);
  });
  it('«Dictar gasto» completo solo si la columna alcanza; si no, «Voz»', () => {
    assert.equal(medidasMediano({ ancho: 380, alto: 180 }).dictarCompleto, false);
    assert.equal(medidasMediano({ ancho: 480, alto: 180 }).dictarCompleto, true);
  });
  // Columna derecha con cobro: 14 + 48 (Voz) + 6 + 36 (Gasto) + 6 + 36 (Ingreso) + 6 + 28 + 14.
  it('el cobro cabe completo desde 194 dp de alto', () => {
    assert.equal(medidasMediano({ ancho: 380, alto: 194, cobro: true }).cobro, true);
    assert.equal(medidasMediano({ ancho: 380, alto: 220, cobro: true }).cobro, true);
  });
  it('más bajo, el cobro se oculta (nunca cortado) y los botones se quedan', () => {
    assert.equal(medidasMediano({ ancho: 380, alto: 193, cobro: true }).cobro, false);
    assert.equal(medidasMediano({ ancho: 380, alto: 180, cobro: true }).cobro, false);
    assert.equal(medidasMediano({ ancho: 380, alto: 220, cobro: false }).cobro, false);
  });
  it('categorías: solo las que caben completas, menos antes que cortar', () => {
    assert.deepEqual(medidasMediano({ ancho: 320, alto: 180, categorias: CATEGORIAS }).categorias, [
      'Entretenimiento',
    ]);
    assert.deepEqual(medidasMediano({ ancho: 480, alto: 180, categorias: CATEGORIAS }).categorias, [
      'Entretenimiento',
      'Comida',
    ]);
    assert.equal(
      medidasMediano({ ancho: 560, alto: 180, categorias: CATEGORIAS }).categorias.length,
      3,
    );
  });
});

describe('categoriasQueCaben', () => {
  it('se detiene en la primera que no cabe y nunca pasa de 3', () => {
    assert.deepEqual(categoriasQueCaben(['Comida', 'Entretenimiento', 'Otros'], 120), ['Comida']);
    assert.deepEqual(categoriasQueCaben(['A', 'B', 'C', 'D'], 500), ['A', 'B', 'C']);
  });
});

describe('textoRegistrarVoz', () => {
  it('2×1 angosto: solo micrófono; ancho: con textos', () => {
    assert.equal(textoRegistrarVoz({ ancho: 150, lado: 56 }), false);
    assert.equal(textoRegistrarVoz({ ancho: 250, lado: 56 }), true);
  });
});
