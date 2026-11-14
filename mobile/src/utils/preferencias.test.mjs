import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  descripcionMonedaPreferida,
  esModoTemaValido,
  estadoNotificaciones,
  etiquetaModoTema,
  MODO_TEMA_DEFECTO,
  MODOS_TEMA,
  normalizarModoTema,
  normalizarMonedaPreferida,
  obtenerInfoAcercaDe,
  resolverEsOscuro,
  resolverMonedaInicialGasto,
} from './preferencias.js';

const appJson = JSON.parse(readFileSync(new URL('../../app.json', import.meta.url), 'utf8'));

describe('preferencias de tema (HU-87)', () => {
  it('define los tres modos: Automático, Claro y Oscuro', () => {
    assert.deepEqual(
      MODOS_TEMA.map((m) => m.valor),
      ['automatico', 'claro', 'oscuro'],
    );
    assert.equal(MODO_TEMA_DEFECTO, 'automatico');
  });

  it('valida y normaliza el modo de tema elegido', () => {
    assert.equal(esModoTemaValido('automatico'), true);
    assert.equal(esModoTemaValido('claro'), true);
    assert.equal(esModoTemaValido('oscuro'), true);
    assert.equal(esModoTemaValido('sepia'), false);
    assert.equal(esModoTemaValido(null), false);

    assert.equal(normalizarModoTema('claro'), 'claro');
    assert.equal(normalizarModoTema('oscuro'), 'oscuro');
    assert.equal(normalizarModoTema('invalido'), 'automatico');
    assert.equal(normalizarModoTema(undefined), 'automatico');
  });

  it('resuelve el tema activo: Claro y Oscuro fijan el modo; Automático sigue al sistema', () => {
    // Modo Claro fuerza esOscuro = false sin importar el sistema
    assert.equal(resolverEsOscuro('claro', 'dark'), false);
    assert.equal(resolverEsOscuro('claro', 'light'), false);
    assert.equal(resolverEsOscuro('claro', null), false);

    // Modo Oscuro fuerza esOscuro = true sin importar el sistema
    assert.equal(resolverEsOscuro('oscuro', 'light'), true);
    assert.equal(resolverEsOscuro('oscuro', 'dark'), true);
    assert.equal(resolverEsOscuro('oscuro', null), true);

    // Modo Automático sigue al sistema (y por defecto oscuro si el sistema no informa 'light')
    assert.equal(resolverEsOscuro('automatico', 'light'), false);
    assert.equal(resolverEsOscuro('automatico', 'dark'), true);
    assert.equal(resolverEsOscuro('automatico', null), true);
    assert.equal(resolverEsOscuro('automatico', undefined), true);

    // Valor desconocido cae en Automático
    assert.equal(resolverEsOscuro('desconocido', 'light'), false);
    assert.equal(resolverEsOscuro('desconocido', 'dark'), true);
  });

  it('devuelve la etiqueta legible del modo de tema', () => {
    assert.equal(etiquetaModoTema('automatico'), 'Automático');
    assert.equal(etiquetaModoTema('claro'), 'Claro');
    assert.equal(etiquetaModoTema('oscuro'), 'Oscuro');
    assert.equal(etiquetaModoTema(null), 'Automático');
  });
});

describe('preferencias de moneda por defecto (HU-87)', () => {
  it('normaliza la moneda preferida entre las soportadas por HU-56 y usa MXN por defecto', () => {
    assert.equal(normalizarMonedaPreferida('MXN'), 'MXN');
    assert.equal(normalizarMonedaPreferida('USD'), 'USD');
    assert.equal(normalizarMonedaPreferida('EUR'), 'EUR');
    assert.equal(normalizarMonedaPreferida('JPY'), 'JPY');
    assert.equal(normalizarMonedaPreferida('ARS'), 'MXN');
    assert.equal(normalizarMonedaPreferida('usd'), 'MXN');
    assert.equal(normalizarMonedaPreferida(null), 'MXN');
    assert.equal(normalizarMonedaPreferida(undefined), 'MXN');
  });

  it('describe la moneda preferida con código, nombre y etiqueta', () => {
    const usd = descripcionMonedaPreferida('USD');
    assert.equal(usd.codigo, 'USD');
    assert.equal(usd.nombre, 'Dólar estadounidense');
    assert.equal(usd.etiqueta, 'USD · Dólar estadounidense');

    const porDefecto = descripcionMonedaPreferida('INVALIDA');
    assert.equal(porDefecto.codigo, 'MXN');
    assert.equal(porDefecto.etiqueta, 'MXN · Peso mexicano');
  });

  it('resuelve la moneda inicial en Nuevo gasto usando la moneda preferida o la del gasto editado', () => {
    // Nuevo gasto sin gastoEditado toma la moneda preferida del teléfono
    assert.equal(resolverMonedaInicialGasto(null, 'USD'), 'USD');
    assert.equal(resolverMonedaInicialGasto(undefined, 'EUR'), 'EUR');
    assert.equal(resolverMonedaInicialGasto(null, null), 'MXN');

    // Al editar un gasto existente respeta la moneda del gasto
    assert.equal(resolverMonedaInicialGasto({ id: 1, moneda: 'MXN' }, 'USD'), 'MXN');
    assert.equal(resolverMonedaInicialGasto({ id: 2, moneda: 'EUR' }, 'USD'), 'EUR');
    assert.equal(resolverMonedaInicialGasto({ id: 3 }, 'USD'), 'MXN');
  });
});

describe('estado de notificaciones y Acerca de Billo (HU-87)', () => {
  it('traduce el permiso de notificaciones a estado activado o desactivado', () => {
    assert.deepEqual(estadoNotificaciones('granted'), {
      activadas: true,
      etiqueta: 'Activadas',
    });
    assert.deepEqual(estadoNotificaciones('denied'), {
      activadas: false,
      etiqueta: 'Desactivadas',
    });
    assert.deepEqual(estadoNotificaciones('undetermined'), {
      activadas: false,
      etiqueta: 'Desactivadas',
    });
    assert.deepEqual(estadoNotificaciones(null), {
      activadas: false,
      etiqueta: 'Desactivadas',
    });
  });

  it('obtiene la información de Acerca de Billo coincidiendo con la versión de app.json', () => {
    const info = obtenerInfoAcercaDe(appJson.expo.version);
    assert.equal(info.nombre, 'Billo');
    assert.equal(info.version, appJson.expo.version);
    assert.equal(info.version, '1.0.0');
    assert.equal(info.equipoNombre, 'Infinite Labs');
    assert.ok(Array.isArray(info.integrantes) && info.integrantes.length >= 5);
    assert.ok(info.enlaceAyuda.startsWith('https://'));

    const fallback = obtenerInfoAcercaDe('');
    assert.equal(fallback.version, '1.0.0');
  });
});
