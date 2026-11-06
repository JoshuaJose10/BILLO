// Pruebas de utils/reportes.js con el runner de Node: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { colorCategoria } from '../theme/categorias.js';
import {
  armarDatosDona,
  descripcionDona,
  esMesSinDatos,
  formatearPorcentaje,
  normalizarPorCategoria,
  normalizarResumen,
} from './reportes.js';

const categoria = (categoria_id, nombre, total) => ({ categoria_id, categoria: nombre, total });
const sumaPorcentajes = (datos) =>
  Math.round(datos.reduce((suma, d) => suma + d.porcentaje, 0) * 10) / 10;

describe('normalizarResumen', () => {
  it('convierte los montos que llegan como texto', () => {
    assert.deepEqual(
      normalizarResumen({
        mes: '2026-10',
        gasto_variable: '2480.50',
        gasto_fijo: '428',
        total: '2908.50',
      }),
      { mes: '2026-10', gasto_variable: 2480.5, gasto_fijo: 428, total: 2908.5 },
    );
  });

  it('sin respuesta o con valores inválidos da ceros con el mes pedido', () => {
    assert.deepEqual(normalizarResumen(null, '2026-11'), {
      mes: '2026-11',
      gasto_variable: 0,
      gasto_fijo: 0,
      total: 0,
    });
    assert.equal(normalizarResumen({ gasto_variable: 'abc' }).gasto_variable, 0);
  });
});

describe('normalizarPorCategoria', () => {
  it('convierte total y porcentaje', () => {
    assert.deepEqual(
      normalizarPorCategoria([
        { categoria_id: 3, categoria: 'Comida', total: '1260.50', porcentaje: '51' },
      ]),
      [{ categoria_id: 3, categoria: 'Comida', total: 1260.5, porcentaje: 51 }],
    );
  });

  it('tolera null', () => {
    assert.deepEqual(normalizarPorCategoria(null), []);
  });
});

describe('armarDatosDona', () => {
  it('arma valor, color, etiqueta y porcentaje en el orden de la API (CP-RF8-01)', () => {
    const datos = armarDatosDona(
      [
        categoria(1, 'Comida', 600),
        categoria(2, 'Transporte', 300),
        categoria(3, 'Entretenimiento', 100),
      ],
      true,
    );
    assert.deepEqual(
      datos.map((d) => [d.id, d.value, d.etiqueta, d.porcentaje]),
      [
        [1, 600, 'Comida', 60],
        [2, 300, 'Transporte', 30],
        [3, 100, 'Entretenimiento', 10],
      ],
    );
    assert.equal(datos[0].color, colorCategoria('Comida', true));
  });

  it('usa el color del tema activo', () => {
    const lista = [categoria(2, 'Transporte', 10)];
    assert.equal(armarDatosDona(lista, true)[0].color, colorCategoria('Transporte', true));
    assert.equal(armarDatosDona(lista, false)[0].color, colorCategoria('Transporte', false));
    assert.notEqual(armarDatosDona(lista, true)[0].color, armarDatosDona(lista, false)[0].color);
  });

  it('da un color distinto a cada categoría del seed en ambos temas', () => {
    const lista = ['Comida', 'Transporte', 'Entretenimiento', 'Servicios', 'Salud', 'Otros'].map(
      (nombre, i) => categoria(i + 1, nombre, 10),
    );
    for (const esOscuro of [true, false]) {
      const colores = armarDatosDona(lista, esOscuro).map((d) => d.color);
      assert.equal(new Set(colores).size, lista.length);
    }
  });

  it('mes vacío: sin rebanadas', () => {
    assert.deepEqual(armarDatosDona([], true), []);
    assert.deepEqual(armarDatosDona(null, true), []);
  });

  it('una sola categoría es el 100%', () => {
    const datos = armarDatosDona([categoria(1, 'Comida', 42.5)], true);
    assert.equal(datos.length, 1);
    assert.equal(datos[0].porcentaje, 100);
  });

  it('los porcentajes suman 100 aunque no sean exactos', () => {
    const tercios = armarDatosDona(
      [categoria(1, 'Comida', 100), categoria(2, 'Salud', 100), categoria(3, 'Otros', 100)],
      true,
    );
    assert.deepEqual(
      tercios.map((d) => d.porcentaje),
      [33.4, 33.3, 33.3],
    );

    const dispares = armarDatosDona(
      [
        categoria(1, 'Comida', 1234.56),
        categoria(2, 'Transporte', 789.01),
        categoria(3, 'Salud', 45.67),
        categoria(4, 'Servicios', 12.34),
        categoria(5, 'Otros', 0.99),
      ],
      true,
    );
    assert.equal(sumaPorcentajes(dispares), 100);
  });

  it('conserva una categoría pequeña que la API redondearía a 0', () => {
    const datos = armarDatosDona([categoria(1, 'Comida', 996), categoria(2, 'Salud', 4)], true);
    assert.deepEqual(
      datos.map((d) => d.porcentaje),
      [99.6, 0.4],
    );
  });

  it('una categoría mínima no queda en 0 y la suma sigue en 100', () => {
    const datos = armarDatosDona(
      [categoria(1, 'Comida', 100000), categoria(2, 'Salud', 0.01)],
      true,
    );
    assert.equal(datos[1].porcentaje, 0.1);
    assert.equal(sumaPorcentajes(datos), 100);
  });

  it('categoría desconocida: usa el color de Otros', () => {
    const [dato] = armarDatosDona([categoria(9, 'Mascotas', 50)], true);
    assert.equal(dato.color, colorCategoria('Otros', true));
    assert.equal(dato.etiqueta, 'Mascotas');
  });

  it('ignora categorías sin monto', () => {
    const datos = armarDatosDona([categoria(1, 'Comida', 50), categoria(2, 'Salud', 0)], true);
    assert.equal(datos.length, 1);
    assert.equal(datos[0].porcentaje, 100);
  });
});

describe('esMesSinDatos', () => {
  const ceros = { gasto_variable: 0, gasto_fijo: 0, total: 0 };

  it('total en 0 y sin categorías', () => {
    assert.equal(esMesSinDatos(ceros, []), true);
    assert.equal(esMesSinDatos(null, null), true);
  });

  it('con membresías y sin gastos no es un mes vacío', () => {
    assert.equal(esMesSinDatos({ ...ceros, gasto_fijo: 300, total: 300 }, []), false);
  });

  it('con gastos no es un mes vacío', () => {
    const resumen = { ...ceros, gasto_variable: 50, total: 50 };
    assert.equal(esMesSinDatos(resumen, [categoria(1, 'Comida', 50)]), false);
  });
});

describe('formatearPorcentaje', () => {
  it('muestra un decimal solo si hace falta', () => {
    assert.equal(formatearPorcentaje(33.3), '33.3 %');
    assert.equal(formatearPorcentaje(0.4), '0.4 %');
    assert.equal(formatearPorcentaje(60), '60 %');
    assert.equal(formatearPorcentaje(100), '100 %');
  });

  it('redondea a un decimal y tolera valores inválidos', () => {
    assert.equal(formatearPorcentaje(33.333), '33.3 %');
    assert.equal(formatearPorcentaje('12.5'), '12.5 %');
    assert.equal(formatearPorcentaje(undefined), '0 %');
  });
});

describe('descripcionDona', () => {
  it('resume categoría y porcentaje en texto', () => {
    const datos = armarDatosDona([categoria(1, 'Comida', 75), categoria(2, 'Salud', 25)], true);
    assert.equal(descripcionDona(datos), 'Gráfica de gasto por categoría: Comida 75 %, Salud 25 %');
  });
});
