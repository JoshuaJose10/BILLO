// Pruebas de utils/widgetResumen.js con el runner de Node: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { crearDatoWidget, leerDatoGuardado, OCULTO, vistaWidget } from './widgetResumen.js';

const MES = '2026-11';
const datosInicio = {
  resumen: { gasto_variable: 400 },
  gastos: [
    { categoria_id: 1, monto: 250 },
    { categoria_id: 2, monto: 100 },
    { categoria_id: 3, monto: 30 },
    { categoria_id: 4, monto: 20 },
  ],
  ingresos: [{ monto: 1000.5 }],
  membresias: [
    { id: 1, nombre: 'Netflix', costo: 219, dias_para_cobro: 9 },
    { id: 2, nombre: 'Spotify', costo: 129, dias_para_cobro: 3 },
  ],
  categorias: [
    { id: 1, nombre: 'Comida' },
    { id: 2, nombre: 'Transporte' },
    { id: 3, nombre: 'Servicios' },
    { id: 4, nombre: 'Salud' },
  ],
};

describe('crearDatoWidget', () => {
  const dato = crearDatoWidget(datosInicio, MES);
  it('saldo e ingresos como TarjetaSaldo', () => {
    assert.equal(dato.saldo, 600.5);
    assert.equal(dato.ingresos, 1000.5);
  });
  it('las 3 categorías de más gasto, con color por tema', () => {
    assert.deepEqual(
      dato.categorias.map((c) => c.nombre),
      ['Comida', 'Transporte', 'Servicios'],
    );
    assert.match(dato.categorias[0].claro, /^#/);
    assert.match(dato.categorias[0].oscuro, /^#/);
  });
  it('el próximo cobro', () => {
    assert.deepEqual(dato.cobro, { nombre: 'Spotify', dias: 3, monto: 129 });
  });
  it('sin movimientos ni membresías: saldo null y sin cobro', () => {
    const vacio = crearDatoWidget({}, MES);
    assert.equal(vacio.saldo, null);
    assert.equal(vacio.cobro, null);
    assert.deepEqual(vacio.categorias, []);
  });
  it('mes inválido: sin dato', () => {
    assert.equal(crearDatoWidget(datosInicio, 'noviembre'), null);
  });
});

describe('leerDatoGuardado', () => {
  it('lee lo que guarda crearDatoWidget', () => {
    const dato = crearDatoWidget(datosInicio, MES);
    assert.deepEqual(leerDatoGuardado(JSON.stringify(dato)), dato);
  });
  it('JSON dañado o de la versión anterior ({ mes, total }): sin dato', () => {
    assert.equal(leerDatoGuardado('{no es json'), null);
    assert.equal(leerDatoGuardado('{"mes":"2026-11","total":99}'), null);
    assert.equal(leerDatoGuardado(null), null);
  });
});

describe('vistaWidget', () => {
  const dato = crearDatoWidget(datosInicio, MES);
  it('saldo con centavos aparte, chip de ingresos y cobro', () => {
    const vista = vistaWidget(dato, MES, false);
    assert.deepEqual(vista.saldo, { entero: '$600', centavos: '.50' });
    assert.equal(vista.ingresos, '+$1,000.50');
    assert.deepEqual(vista.cobro, { texto: 'Spotify en 3 días', monto: '$129 MXN' });
  });
  it('saldo negativo con «−»', () => {
    const vista = vistaWidget({ ...dato, saldo: -20 }, MES, false);
    assert.equal(vista.saldo.entero, '−$20');
  });
  it('oculto: «••••» y sin ingresos', () => {
    const vista = vistaWidget(dato, MES, true);
    assert.deepEqual(vista.saldo, { entero: OCULTO, centavos: '' });
    assert.equal(vista.ingresos, null);
  });
  it('sin dato o de otro mes: null', () => {
    assert.equal(vistaWidget(null, MES, false), null);
    assert.equal(vistaWidget(dato, '2026-12', false), null);
  });
});
