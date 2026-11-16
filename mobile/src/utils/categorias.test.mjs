import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import {
  colorCategoria,
  degradadoCategoria,
  esCategoriaPropia,
  fondoChipCategoria,
  ICONO_CATEGORIA_PROPIA,
  limpiarColoresCategorias,
  registrarColoresCategorias,
} from '../theme/categorias.js';
import {
  calcularCambioSeleccionPredefinida,
  combinarCategoriasConPredefinidas,
  extraerCategoriasPropias,
  iconoCategoria,
  idsSeleccionados,
  LONGITUD_MAX_CATEGORIA,
  MENSAJE_AVISO_PREDEFINIDA_GASTOS,
  MENSAJE_CATEGORIA_EN_USO,
  MENSAJE_MINIMO_UNA_ACTIVA,
  validarNombreCategoria,
} from './categorias.js';
import { mensajeError } from './errores.js';
import { armarDatosDona } from './reportes.js';

afterEach(() => {
  limpiarColoresCategorias();
});

describe('calcularCambioSeleccionPredefinida (HU-90)', () => {
  const predefinidasBase = [
    { id: 1, nombre: 'Comida', seleccionada: true },
    { id: 2, nombre: 'Transporte', seleccionada: true },
    { id: 3, nombre: 'Entretenimiento', seleccionada: false },
  ];

  test('apagar una predefinida cuando hay más de una activa devuelve aviso de conservación de gastos', () => {
    const cambio = calcularCambioSeleccionPredefinida(predefinidasBase, 2);
    assert.deepEqual(cambio, {
      permitido: true,
      encendida: false,
      seleccionIds: [1],
      error: null,
      aviso: MENSAJE_AVISO_PREDEFINIDA_GASTOS,
    });
  });

  test('impide apagar la última categoría predefinida activa con el mensaje requerido', () => {
    const soloUnaActiva = [
      { id: 1, nombre: 'Comida', seleccionada: true },
      { id: 2, nombre: 'Transporte', seleccionada: false },
    ];
    const cambio = calcularCambioSeleccionPredefinida(soloUnaActiva, 1);
    assert.deepEqual(cambio, {
      permitido: false,
      encendida: true,
      seleccionIds: [1],
      error: MENSAJE_MINIMO_UNA_ACTIVA,
      aviso: null,
    });
    assert.equal(cambio.error, 'Debes tener al menos una categoría');
  });

  test('encender una categoría inactiva la agrega a la selección sin aviso', () => {
    const cambio = calcularCambioSeleccionPredefinida(predefinidasBase, 3);
    assert.deepEqual(cambio, {
      permitido: true,
      encendida: true,
      seleccionIds: [1, 2, 3],
      error: null,
      aviso: null,
    });
  });
});

describe('validarNombreCategoria (HU-90)', () => {
  test('acepta nombres válidos de 1 a 40 caracteres y recorta espacios extremos', () => {
    const corto = validarNombreCategoria('A');
    assert.deepEqual(corto, { valido: true, nombre: 'A', error: null });

    const exacto40 = 'M'.repeat(LONGITUD_MAX_CATEGORIA);
    const limite = validarNombreCategoria(`  ${exacto40}  `);
    assert.deepEqual(limite, { valido: true, nombre: exacto40, error: null });
  });

  test('rechaza nombres vacíos o de solo espacios', () => {
    for (const valor of ['', '   ', null, undefined]) {
      const res = validarNombreCategoria(valor);
      assert.equal(res.valido, false);
      assert.ok(res.error);
    }
  });

  test('rechaza nombres con más de 40 caracteres', () => {
    const largo = 'X'.repeat(LONGITUD_MAX_CATEGORIA + 1);
    const res = validarNombreCategoria(largo);
    assert.equal(res.valido, false);
    assert.match(res.error, /40/);
  });

  test('rechaza nombres duplicados sin distinguir mayúsculas, salvo la misma categoría editada', () => {
    const existentes = [
      { id: 1, nombre: 'Comida' },
      { id: 10, nombre: 'Mascotas' },
    ];
    assert.equal(validarNombreCategoria('mascotas', existentes).valido, false);
    assert.equal(validarNombreCategoria('COMIDA', existentes).valido, false);
    assert.equal(validarNombreCategoria('Mascotas', existentes, 10).valido, true);
  });
});

describe('colores e ícono de categorías propias (HU-89 / HU-90)', () => {
  test('las predefinidas conservan su ícono y color de diseño; las propias usan tag-outline y color del servidor', () => {
    assert.equal(esCategoriaPropia('Comida'), false);
    assert.equal(iconoCategoria('Comida'), 'silverware-fork-knife');
    assert.equal(iconoCategoria('Transporte'), 'car');

    registrarColoresCategorias([
      { id: 10, nombre: 'Mascotas', propia: true, es_predefinida: false, color: '#EF4444' },
    ]);

    assert.equal(esCategoriaPropia('Mascotas'), true);
    assert.equal(iconoCategoria('Mascotas'), ICONO_CATEGORIA_PROPIA);
    assert.equal(iconoCategoria('Mascotas'), 'tag-outline');
    assert.equal(colorCategoria('Mascotas', true), '#EF4444');
    assert.equal(colorCategoria('Mascotas', false), '#EF4444');
    assert.equal(degradadoCategoria('Mascotas', true)[1], '#EF4444');
    assert.ok(fondoChipCategoria('Mascotas').startsWith('#'));

    // En Reportes (armarDatosDona), Mascotas aparece con su color asignado por el servidor
    const dona = armarDatosDona([{ categoria_id: 10, categoria: 'Mascotas', total: 250 }], true);
    assert.equal(dona[0].color, '#EF4444');

    // Al renombrar Mascotas a Perros, conserva el color asignado por el servidor
    registrarColoresCategorias([
      { id: 10, nombre: 'Perros', propia: true, es_predefinida: false, color: '#EF4444' },
    ]);
    assert.equal(colorCategoria('Perros', true), '#EF4444');
    assert.equal(iconoCategoria('Perros'), 'tag-outline');
  });

  test('extraerCategoriasPropias y combinarCategoriasConPredefinidas', () => {
    const activas = [
      { id: 1, nombre: 'Comida', es_predefinida: true, propia: false },
      { id: 10, nombre: 'Mascotas', es_predefinida: false, propia: true, color: '#EF4444' },
    ];
    const predefinidas = [
      { id: 1, nombre: 'Comida', es_predefinida: true, seleccionada: true },
      { id: 2, nombre: 'Transporte', es_predefinida: true, seleccionada: false },
    ];

    const propias = extraerCategoriasPropias(activas);
    assert.equal(propias.length, 1);
    assert.equal(propias[0].nombre, 'Mascotas');

    const todas = combinarCategoriasConPredefinidas(activas, predefinidas);
    assert.equal(
      todas.some((c) => c.id === 2 && c.nombre === 'Transporte'),
      true,
    );
    assert.equal(
      todas.some((c) => c.id === 10 && c.nombre === 'Mascotas'),
      true,
    );
  });

  test('mensaje exacto de 409 CATEGORIA_EN_USO', () => {
    assert.equal(
      MENSAJE_CATEGORIA_EN_USO,
      'Esta categoría tiene gastos o presupuestos; no se puede borrar',
    );
    assert.equal(
      mensajeError('CATEGORIA_EN_USO'),
      'Esta categoría tiene gastos o presupuestos; no se puede borrar',
    );
  });
});

describe('idsSeleccionados (HU-89)', () => {
  test('devuelve los ids encendidos en orden: el body de «Omitir» con las predefinidas por defecto', () => {
    const lista = [
      { id: 1, nombre: 'Comida', seleccionada: true },
      { id: 2, nombre: 'Transporte', seleccionada: false },
      { id: 3, nombre: 'Salud', seleccionada: true },
    ];
    assert.deepEqual(idsSeleccionados(lista), [1, 3]);
  });

  test('tolera lista vacía, null y elementos nulos', () => {
    assert.deepEqual(idsSeleccionados(null), []);
    assert.deepEqual(idsSeleccionados([null, { id: 4 }]), []);
  });
});
