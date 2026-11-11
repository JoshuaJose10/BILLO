// Pruebas de utils/widgetResumen.js con el runner de Node: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { crearDatoWidget, leerDatoGuardado, textoWidget } from './widgetResumen.js';

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

describe('textoWidget', () => {
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
