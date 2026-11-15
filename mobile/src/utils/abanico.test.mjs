// Pruebas de utils/abanico.js con el runner de Node: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  accionBajoDedo,
  categoriasFrecuentes,
  posicionesAbanico,
  radioAbanico,
} from './abanico.js';

const arco = (ancho) => ({
  ancho,
  base: 600,
  radioMax: 140,
  margen: 64,
  anguloInicio: 200,
  anguloFin: 340,
});
const cerca = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≠ ${b}`);
// iPhone SE (1.ª gen.), mini / SE actual y Pro Max.
const ANCHOS = [320, 375, 430];

describe('radioAbanico', () => {
  it('usa el radio máximo si la pantalla alcanza y lo reduce si es angosta', () => {
    assert.equal(radioAbanico(arco(430)), 140);
    assert.ok(radioAbanico(arco(375)) < 140);
    assert.ok(radioAbanico(arco(320)) < radioAbanico(arco(375)));
  });
});

describe('posicionesAbanico', () => {
  it('de 1 a 6 acciones y en cualquier ancho: simétricas respecto al centro de la pantalla', () => {
    for (const ancho of ANCHOS) {
      for (let n = 1; n <= 6; n++) {
        const p = posicionesAbanico(n, arco(ancho));
        assert.equal(p.length, n);
        p.forEach((punto, i) => {
          cerca(punto.x + p[n - 1 - i].x, ancho);
          cerca(punto.y, p[n - 1 - i].y);
        });
      }
    }
  });

  it('ninguna se sale por los lados ni baja de la base', () => {
    for (const ancho of ANCHOS) {
      for (let n = 1; n <= 6; n++) {
        for (const { x, y } of posicionesAbanico(n, arco(ancho))) {
          assert.ok(x >= 64 - 1e-6 && x <= ancho - 64 + 1e-6, `x=${x} en ancho ${ancho}`);
          assert.ok(y <= 600 + 1e-6, `y=${y}`);
        }
      }
    }
  });

  it('las de los extremos quedan en la base y las demás suben de izquierda a derecha', () => {
    const p = posicionesAbanico(5, arco(375));
    cerca(p[0].y, 600);
    cerca(p[4].y, 600);
    assert.ok(p[0].x < p[1].x && p[1].x < p[2].x);
    assert.ok(p[2].y < p[1].y && p[1].y < p[0].y);
    cerca(p[2].x, 375 / 2);
  });

  it('con una acción queda arriba, en medio del arco; con cero, vacío', () => {
    const [unica] = posicionesAbanico(1, arco(430));
    cerca(unica.x, 215);
    cerca(unica.y, 600 - 140 * Math.sin((200 * Math.PI) / 180) - 140);
    assert.deepEqual(posicionesAbanico(0, arco(430)), []);
  });
});

describe('accionBajoDedo', () => {
  const posiciones = posicionesAbanico(3, arco(430));
  const [izquierda, medio, derecha] = posiciones;
  // El + real, abajo del arco y corrido del centro de la pantalla.
  const boton = { x: 190, y: 720 };

  it('devuelve la posición más cercana dentro de la tolerancia', () => {
    assert.equal(
      accionBajoDedo({ x: izquierda.x + 10, y: izquierda.y - 10 }, posiciones, 40, boton),
      0,
    );
    assert.equal(accionBajoDedo({ x: medio.x - 5, y: medio.y + 20 }, posiciones, 40, boton), 1);
    assert.equal(accionBajoDedo(derecha, posiciones, 40, boton), 2);
  });

  it('entre dos acciones elige la más cercana', () => {
    const entre = { x: (medio.x + derecha.x) / 2, y: (medio.y + derecha.y) / 2 };
    assert.equal(accionBajoDedo({ x: entre.x - 5, y: entre.y }, posiciones, 100, boton), 1);
    assert.equal(accionBajoDedo({ x: entre.x + 5, y: entre.y }, posiciones, 100, boton), 2);
  });

  it('null si el dedo está lejos de todas o sobre el botón (la X)', () => {
    assert.equal(accionBajoDedo({ x: 215, y: 620 }, posiciones, 40, boton), null);
    assert.equal(accionBajoDedo({ x: 195, y: 715 }, posiciones, 40, boton), null);
    // Sobre el botón no elige aunque una acción esté a tolerancia.
    assert.equal(accionBajoDedo({ x: 195, y: 715 }, posiciones, 400, boton), null);
    assert.equal(accionBajoDedo(medio, [], 40, boton), null);
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
