// Pruebas de utils/ingresos.js (HU-82): npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ICONO_INGRESO, iconoFuente, saldoDelMes, totalIngresos } from './ingresos.js';

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
    assert.equal(iconoFuente(' Sueldo '), 'briefcase-outline');
    assert.equal(iconoFuente('Salario'), ICONO_INGRESO);
    assert.equal(iconoFuente(null), ICONO_INGRESO);
  });
});
