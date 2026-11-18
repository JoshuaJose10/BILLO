// Pruebas de utils/widgetResumen.js con el runner de Node: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  agruparCategoriasWidget,
  crearDatoWidget,
  datosBalanceWidget,
  datosDonaWidget,
  datosProximoCobroWidget,
  destinoWidget,
  generarSvgDonaWidget,
  leerDatoGuardado,
  MAX_SEGMENTOS_DONA_WIDGET,
  OCULTO,
  TEXTO_SIN_DATOS_CORTO,
  vistaWidget,
} from './widgetResumen.js';

const MES = '2026-11';
const datosInicio = {
  resumen: { gasto_variable: 400, gasto_fijo: 219, total: 619 },
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

describe('datosBalanceWidget (Balance del mes)', () => {
  const dato = crearDatoWidget(datosInicio, MES);
  it('calcula ingresos, gastos y balance positivo o negativo', () => {
    const pos = datosBalanceWidget(dato, MES);
    assert.equal(pos.vacio, false);
    assert.equal(pos.estado, 'positivo');
    assert.equal(pos.ingresos, '+$1,000.50');
    assert.equal(pos.gastos, '-$619');
    assert.equal(pos.balance, '+$381.50');

    const neg = datosBalanceWidget({ ...dato, ingresos: 200, gastos: 619 }, MES);
    assert.equal(neg.estado, 'negativo');
    assert.equal(neg.balance, '−$419.00');
  });

  it('sin sesión o con mes distinto devuelve estado vacío «Abre Billo»', () => {
    assert.equal(datosBalanceWidget(null, MES).vacio, true);
    assert.equal(datosBalanceWidget(null, MES).textoVacio, TEXTO_SIN_DATOS_CORTO);
    assert.equal(datosBalanceWidget(dato, '2026-12').vacio, true);
  });
});

describe('agruparCategoriasWidget y datosDonaWidget (Dona por categoría)', () => {
  it('limita a máximo 5 segmentos agrupando el resto en «Otras» y suma 100%', () => {
    const seisCategorias = [
      { nombre: 'Servicios', total: 500 },
      { nombre: 'Comida', total: 400 },
      { nombre: 'Transporte', total: 300 },
      { nombre: 'Entretenimiento', total: 200 },
      { nombre: 'Salud', total: 100 },
      { nombre: 'Hogar', total: 50 },
    ];
    const segs = agruparCategoriasWidget(seisCategorias);
    assert.equal(segs.length, MAX_SEGMENTOS_DONA_WIDGET);
    assert.equal(segs[4].nombre, 'Otras');
    assert.equal(segs[4].total, 150);
    assert.equal(
      segs.reduce((acc, s) => acc + s.porcentaje, 0),
      100,
    );
  });

  it('genera el SVG de la dona y el total al centro en claro y oscuro', () => {
    const dato = crearDatoWidget(datosInicio, MES);
    const oscuro = datosDonaWidget(dato, MES, true);
    const claro = datosDonaWidget(dato, MES, false);

    assert.equal(oscuro.vacio, false);
    assert.equal(oscuro.total, '$400.00');
    assert.equal(oscuro.segmentos.length, 4);
    assert.match(oscuro.svg, /^<svg /);
    assert.match(claro.svg, /^<svg /);
    assert.notEqual(oscuro.segmentos[1].color, claro.segmentos[1].color);

    const svgVacio = generarSvgDonaWidget([], { esOscuro: true });
    assert.match(svgVacio, /^<svg /);
  });

  it('sin datos devuelve estado vacío «Abre Billo»', () => {
    const vacio = datosDonaWidget(null, MES, true);
    assert.equal(vacio.vacio, true);
    assert.equal(vacio.textoVacio, TEXTO_SIN_DATOS_CORTO);
  });
});

describe('datosProximoCobroWidget (Próximo cobro)', () => {
  it('formatea servicio, monto y días restantes del próximo cobro', () => {
    const dato = crearDatoWidget(datosInicio, MES);
    const cobro = datosProximoCobroWidget(dato);
    assert.equal(cobro.vacio, false);
    assert.equal(cobro.servicio, 'Spotify');
    assert.equal(cobro.monto, '$129.00');
    assert.equal(cobro.dias, 3);
    assert.equal(cobro.cuando, 'En 3 días');
    assert.equal(cobro.urgente, true);
  });

  it('sin sesión o sin suscripciones activas muestra «Abre Billo»', () => {
    assert.equal(datosProximoCobroWidget(null).vacio, true);
    assert.equal(datosProximoCobroWidget(null).textoVacio, TEXTO_SIN_DATOS_CORTO);
    assert.equal(datosProximoCobroWidget(crearDatoWidget({}, MES)).vacio, true);
  });
});

describe('destinoWidget', () => {
  it('dirige cada widget a su pantalla correspondiente', () => {
    assert.deepEqual(destinoWidget('ResumenMes'), { screen: 'Inicio', params: undefined });
    assert.deepEqual(destinoWidget('billo://inicio'), { screen: 'Inicio', params: undefined });
    assert.deepEqual(destinoWidget('BalanceMes'), {
      screen: 'Reportes',
      params: { vista: 'balance' },
    });
    assert.deepEqual(destinoWidget('billo://balance'), {
      screen: 'Reportes',
      params: { vista: 'balance' },
    });
    assert.deepEqual(destinoWidget('DonaCategorias'), {
      screen: 'Reportes',
      params: { vista: 'gastos' },
    });
    assert.deepEqual(destinoWidget('billo://dona'), {
      screen: 'Reportes',
      params: { vista: 'gastos' },
    });
    assert.deepEqual(destinoWidget('ProximoCobro'), {
      screen: 'Cartera',
      params: { seccion: 'suscripciones' },
    });
    assert.deepEqual(destinoWidget('billo://cobro'), {
      screen: 'Cartera',
      params: { seccion: 'suscripciones' },
    });
    assert.equal(destinoWidget('desconocido'), null);
  });
});
