// Pruebas de utils/abanico.js con el runner de Node: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { accionBajoDedo, categoriasFrecuentes, posicionesAbanico } from './abanico.js';

// `+ 0` convierte -0 en 0 para comparar.
const redondear = (p) => ({ x: Math.round(p.x) + 0, y: Math.round(p.y) + 0 });

describe('posicionesAbanico', () => {
  it('reparte los puntos de izquierda a derecha por encima del centro', () => {
    assert.deepEqual(posicionesAbanico(3, 100, 180, 0).map(redondear), [
      { x: -100, y: 0 },
      { x: 0, y: -100 },
      { x: 100, y: 0 },
    ]);
  });

  it('con un punto lo deja en medio del arco; con cero, vacío', () => {
    assert.deepEqual(posicionesAbanico(1, 100, 160, 20).map(redondear), [{ x: 0, y: -100 }]);
    assert.deepEqual(posicionesAbanico(0, 100, 160, 20), []);
  });

  it('todos quedan sobre el radio pedido', () => {
    for (const p of posicionesAbanico(6, 140, 160, 20)) {
      assert.equal(Math.round(Math.hypot(p.x, p.y)), 140);
    }
  });
});

describe('accionBajoDedo', () => {
  const posiciones = posicionesAbanico(3, 100, 180, 0);

  it('devuelve la posición más cercana dentro de la tolerancia', () => {
    assert.equal(accionBajoDedo({ x: -95, y: -10 }, posiciones, 40), 0);
    assert.equal(accionBajoDedo({ x: 5, y: -120 }, posiciones, 40), 1);
  });

  it('entre dos acciones elige la más cercana', () => {
    assert.equal(accionBajoDedo({ x: 60, y: -65 }, posiciones, 80), 1);
    assert.equal(accionBajoDedo({ x: 70, y: -55 }, posiciones, 80), 2);
  });

  it('null si el dedo está lejos de todas o sobre el centro (la X)', () => {
    assert.equal(accionBajoDedo({ x: -50, y: -50 }, posiciones, 30), null);
    assert.equal(accionBajoDedo({ x: 5, y: -5 }, posiciones, 30), null);
    assert.equal(accionBajoDedo({ x: 0, y: -100 }, [], 30), null);
  });
});

describe('categoriasFrecuentes', () => {
  const hoy = new Date(2026, 10, 13); // 13 de noviembre de 2026
  const cat = (id, nombre) => ({ id, nombre });
  const activas = [
    cat(1, 'Comida'),
    cat(2, 'Transporte'),
    cat(3, 'Entretenimiento'),
    cat(4, 'Servicios'),
    cat(5, 'Salud'),
    cat(6, 'Otros'),
  ];
  let siguiente = 1;
  const gasto = (categoria_id, fecha) => ({ id: siguiente++, categoria_id, fecha });
  const nombres = (lista) => lista.map((c) => c.nombre);

  it('ordena por cantidad de gastos del mes actual y el anterior', () => {
    const gastos = [
      gasto(5, '2026-11-02'),
      gasto(5, '2026-10-20'),
      gasto(5, '2026-11-10'),
      gasto(2, '2026-11-01'),
      gasto(2, '2026-11-03'),
      gasto(6, '2026-10-01'),
    ];
    assert.deepEqual(nombres(categoriasFrecuentes(gastos, activas, 5, hoy)), [
      'Salud',
      'Transporte',
      'Otros',
      'Comida',
      'Entretenimiento',
    ]);
  });

  it('a la par gana la usada más recientemente (fecha y luego id)', () => {
    const gastos = [gasto(1, '2026-11-01'), gasto(3, '2026-11-05'), gasto(4, '2026-11-05')];
    assert.deepEqual(nombres(categoriasFrecuentes(gastos, activas, 3, hoy)), [
      'Servicios',
      'Entretenimiento',
      'Comida',
    ]);
  });

  it('no cuenta gastos de otros meses ni de categorías inactivas', () => {
    const gastos = [
      gasto(6, '2026-09-30'),
      gasto(6, '2026-09-29'),
      gasto(99, '2026-11-01'),
      gasto(4, '2026-11-01'),
    ];
    assert.deepEqual(nombres(categoriasFrecuentes(gastos, activas, 2, hoy)), [
      'Servicios',
      'Comida',
    ]);
  });

  it('usuario nuevo: las primeras de su lista; con pocas categorías, todas', () => {
    assert.deepEqual(nombres(categoriasFrecuentes([], activas, 5, hoy)), [
      'Comida',
      'Transporte',
      'Entretenimiento',
      'Servicios',
      'Salud',
    ]);
    assert.deepEqual(nombres(categoriasFrecuentes(undefined, activas.slice(0, 2), 5, hoy)), [
      'Comida',
      'Transporte',
    ]);
    assert.deepEqual(categoriasFrecuentes([], [], 5, hoy), []);
  });

  it('en enero cuenta diciembre del año anterior', () => {
    const gastos = [gasto(6, '2026-12-31'), gasto(5, '2027-01-02'), gasto(5, '2027-01-03')];
    assert.deepEqual(nombres(categoriasFrecuentes(gastos, activas, 2, new Date(2027, 0, 5))), [
      'Salud',
      'Otros',
    ]);
  });
});
