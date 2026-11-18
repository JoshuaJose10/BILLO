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
  NOMBRES_WIDGETS,
  TEXTO_SIN_DATOS,
  textoWidget,
} from './widgetResumen.js';

describe('crearDatoWidget', () => {
  it('toma mes y total del resumen', () => {
    assert.deepEqual(crearDatoWidget({ mes: '2026-11', total: 1250.5 }), {
      mes: '2026-11',
      total: 1250.5,
    });
  });

  it('acepta el mes de respaldo y el total como texto', () => {
    assert.deepEqual(crearDatoWidget({ total: '100' }, '2026-11'), { mes: '2026-11', total: 100 });
  });

  it('sin total o sin mes válido no hay dato', () => {
    assert.equal(crearDatoWidget(null, '2026-11'), null);
    assert.equal(crearDatoWidget({ total: 'x' }, '2026-11'), null);
    assert.equal(crearDatoWidget({ total: 5 }, 'noviembre'), null);
  });

  it('arma el dato completo para los 4 widgets a partir de resumen, gastos, ingresos y membresías', () => {
    const hoy = new Date(2026, 10, 10);
    const dato = crearDatoWidget(
      {
        resumen: { mes: '2026-11', gasto_variable: 1500, gasto_fijo: 299, total: 1799 },
        gastos: [
          { id: 1, categoria_id: 1, monto: 900 },
          { id: 2, categoria_id: 2, monto: 600 },
        ],
        ingresos: [
          { id: 1, monto: 5000 },
          { id: 2, monto: 1500 },
        ],
        membresias: [
          {
            id: 1,
            nombre: 'Netflix',
            costo: 299,
            frecuencia: 'mensual',
            fecha_cobro: '2026-11-12',
            dias_para_cobro: 2,
          },
        ],
        nombresCategoria: { 1: 'Comida', 2: 'Transporte' },
        hoy,
      },
      '2026-11',
    );

    assert.equal(dato.mes, '2026-11');
    assert.equal(dato.total, 1799);
    assert.equal(dato.gasto_variable, 1500);
    assert.equal(dato.gasto_fijo, 299);
    assert.equal(dato.ingresos, 6500);
    assert.equal(dato.gastos, 1799);
    assert.equal(dato.balance, 4701);
    assert.equal(dato.categorias.length, 2);
    assert.equal(dato.categorias[0].nombre, 'Comida');
    assert.equal(dato.proximo_cobro.nombre, 'Netflix');
    assert.equal(dato.proximo_cobro.costo, 299);

    // Persistencia y lectura desde JSON
    const recuperado = leerDatoGuardado(JSON.stringify(dato));
    assert.deepEqual(recuperado, dato);
  });
});

describe('leerDatoGuardado', () => {
  it('lee el JSON guardado', () => {
    assert.deepEqual(leerDatoGuardado('{"mes":"2026-11","total":99}'), {
      mes: '2026-11',
      total: 99,
    });
  });

  it('con texto vacío o dañado devuelve null', () => {
    assert.equal(leerDatoGuardado(null), null);
    assert.equal(leerDatoGuardado(''), null);
    assert.equal(leerDatoGuardado('{no es json'), null);
    assert.equal(leerDatoGuardado('{"mes":"2026-11"}'), null);
  });
});

describe('textoWidget (Resumen del mes)', () => {
  it('muestra el total del mes actual con formato', () => {
    const t = textoWidget({ mes: '2026-11', total: 1234.5 }, '2026-11');
    assert.equal(t.titulo, 'BILLO · NOVIEMBRE');
    assert.equal(t.monto, '$1,234.50');
  });

  it('sin dato (sesión cerrada, reinicio sin datos) muestra «Abre Billo»', () => {
    assert.deepEqual(textoWidget(null, '2026-11'), { titulo: 'BILLO', monto: null });
  });

  it('un dato de otro mes no se muestra', () => {
    assert.equal(textoWidget({ mes: '2026-10', total: 500 }, '2026-11').monto, null);
  });
});

describe('datosBalanceWidget (Balance del mes)', () => {
  it('calcula ingresos, gastos y balance positivo o negativo', () => {
    const pos = datosBalanceWidget(
      { mes: '2026-11', ingresos: 8000, gastos: 3000, balance: 5000 },
      '2026-11',
    );
    assert.equal(pos.vacio, false);
    assert.equal(pos.estado, 'positivo');
    assert.equal(pos.balance, '+$5,000.00');
    assert.equal(pos.ingresos, '+$8,000.00');
    assert.equal(pos.gastos, '-$3,000.00');

    const neg = datosBalanceWidget(
      { mes: '2026-11', ingresos: 1000, gastos: 2500, balance: -1500 },
      '2026-11',
    );
    assert.equal(neg.estado, 'negativo');
    assert.equal(neg.balance, '−$1,500.00');
  });

  it('sin sesión o con mes distinto devuelve estado vacío «Abre Billo»', () => {
    assert.equal(datosBalanceWidget(null, '2026-11').vacio, true);
    assert.equal(datosBalanceWidget(null, '2026-11').textoVacio, TEXTO_SIN_DATOS);
    assert.equal(datosBalanceWidget({ mes: '2026-10', total: 100 }, '2026-11').vacio, true);
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
    const dato = {
      mes: '2026-11',
      total: 1000,
      gasto_variable: 1000,
      categorias: [
        { nombre: 'Comida', total: 600 },
        { nombre: 'Transporte', total: 400 },
      ],
    };
    const oscuro = datosDonaWidget(dato, '2026-11', true);
    const claro = datosDonaWidget(dato, '2026-11', false);

    assert.equal(oscuro.vacio, false);
    assert.equal(oscuro.total, '$1,000.00');
    assert.equal(oscuro.segmentos.length, 2);
    assert.match(oscuro.svg, /^<svg /);
    assert.match(claro.svg, /^<svg /);
    assert.notEqual(oscuro.segmentos[1].color, claro.segmentos[1].color);

    const svgVacio = generarSvgDonaWidget([], { esOscuro: true });
    assert.match(svgVacio, /^<svg /);
  });

  it('sin datos devuelve estado vacío «Abre Billo»', () => {
    const vacio = datosDonaWidget(null, '2026-11', true);
    assert.equal(vacio.vacio, true);
    assert.equal(vacio.textoVacio, TEXTO_SIN_DATOS);
  });
});

describe('datosProximoCobroWidget (Próximo cobro)', () => {
  it('formatea servicio, monto y días restantes del próximo cobro', () => {
    const dato = {
      mes: '2026-11',
      total: 299,
      proximo_cobro: {
        id: 1,
        nombre: 'Netflix',
        costo: 299,
        frecuencia: 'mensual',
        fecha_cobro: '2026-11-15',
        dias_para_cobro: 3,
      },
    };
    const cobro = datosProximoCobroWidget(dato, '2026-11-12');
    assert.equal(cobro.vacio, false);
    assert.equal(cobro.servicio, 'Netflix');
    assert.equal(cobro.monto, '$299.00');
    assert.equal(cobro.dias, 3);
    assert.equal(cobro.cuando, 'En 3 días');
    assert.equal(cobro.urgente, true);
  });

  it('sin sesión o sin suscripciones activas muestra «Abre Billo»', () => {
    assert.equal(datosProximoCobroWidget(null).vacio, true);
    assert.equal(datosProximoCobroWidget(null).textoVacio, TEXTO_SIN_DATOS);
    assert.equal(
      datosProximoCobroWidget({ mes: '2026-11', total: 0, proximo_cobro: null }).vacio,
      true,
    );
  });
});

describe('destinoWidget', () => {
  it('dirige cada uno de los 4 widgets a su pantalla correspondiente', () => {
    assert.equal(NOMBRES_WIDGETS.length, 4);
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
