// Pruebas de utils/ingresos.js (HU-82): npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  etiquetaFrecuencia,
  ICONO_INGRESO,
  iconoFuente,
  normalizarFrecuencia,
  OPCIONES_FRECUENCIA,
  saldoDelMes,
  totalIngresos,
} from './ingresos.js';

describe('saldoDelMes', () => {
  it('es ingresos del mes − gastos del mes', () => {
    assert.equal(saldoDelMes([{ monto: 1000 }], 200), 800);
    assert.equal(saldoDelMes([{ monto: 0.1 }, { monto: 0.2 }], 0.1), 0.2);
  });

  it('puede quedar negativo si se gastó más de lo que entró', () => {
    assert.equal(saldoDelMes([{ monto: 100 }], 250.5), -150.5);
  });

  it('sin ingresos pero con gastos es negativo (no la invitación)', () => {
    assert.equal(saldoDelMes([], 200), -200);
    assert.equal(saldoDelMes(null, 200), -200);
  });

  it('sin ingresos ni gastos es null (TarjetaSaldo invita a registrarlos)', () => {
    assert.equal(saldoDelMes([], 0), null);
    assert.equal(saldoDelMes(null, undefined), null);
  });

  it('sin gastos es el total de ingresos', () => {
    assert.equal(saldoDelMes([{ monto: 500 }], undefined), 500);
  });
});

describe('totalIngresos', () => {
  it('suma los montos redondeados a centavos', () => {
    assert.equal(totalIngresos([{ monto: 0.1 }, { monto: 0.2 }]), 0.3);
    assert.equal(totalIngresos(null), 0);
  });
});

describe('iconoFuente', () => {
  it('da el ícono de cada fuente y uno genérico para las desconocidas', () => {
    assert.equal(iconoFuente('Beca'), 'school-outline');
    assert.equal(iconoFuente('Aguinaldo/Bono'), 'star-circle-outline');
    assert.equal(iconoFuente('Ventas'), 'storefront-outline');
    assert.equal(iconoFuente('Inversiones'), 'trending-up');
    assert.equal(iconoFuente('Renta'), 'home-city-outline');
    assert.equal(iconoFuente('Regalo'), 'gift-outline');
    assert.equal(iconoFuente('Reembolso'), 'cash-refund');
    assert.equal(iconoFuente(' Sueldo '), 'briefcase-outline');
    assert.equal(iconoFuente('Salario'), ICONO_INGRESO);
    assert.equal(iconoFuente(null), ICONO_INGRESO);
  });
});

describe('frecuencia de ingresos', () => {
  it('ofrece No, Semanal, Quincenal y Mensual (No = null)', () => {
    assert.deepEqual(
      OPCIONES_FRECUENCIA.map((o) => o.valor),
      [null, 'semanal', 'quincenal', 'mensual'],
    );
  });

  it('normaliza undefined, vacío, «no» y desconocidas a null', () => {
    for (const v of [undefined, null, '', '  ', 'no', 'No', 'anual', 5]) {
      assert.equal(normalizarFrecuencia(v), null);
    }
    assert.equal(normalizarFrecuencia('quincenal'), 'quincenal');
    assert.equal(normalizarFrecuencia(' Mensual '), 'mensual');
  });

  it('da la etiqueta legible de cada frecuencia', () => {
    assert.equal(etiquetaFrecuencia('semanal'), 'Semanal');
    assert.equal(etiquetaFrecuencia('mensual'), 'Mensual');
    assert.equal(etiquetaFrecuencia(null), 'No');
    assert.equal(etiquetaFrecuencia('xyz'), 'No');
  });
});
