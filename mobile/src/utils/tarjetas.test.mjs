import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { prepararDatosGasto, prepararDatosMembresia } from './divisas.js';
import {
  calcularResumenTarjetaMes,
  colorTarjeta,
  etiquetaTarjeta,
  etiquetaTipoTarjeta,
  formatearUltimos4,
  nombreTarjetaPorId,
  resumenGeneralTarjetas,
  subtituloTarjeta,
  textoFechasTarjeta,
  validarTarjeta,
} from './tarjetas.js';

describe('utils/tarjetas', () => {
  it('formatea etiquetas, subtítulos y fechas de corte/pago de una tarjeta', () => {
    const credito = {
      id: 1,
      nombre: 'BBVA Azul',
      tipo: 'credito',
      ultimos4: '4821',
      dia_corte: 12,
      dia_pago: 2,
    };
    assert.equal(etiquetaTipoTarjeta('credito'), 'Crédito');
    assert.equal(etiquetaTipoTarjeta('debito'), 'Débito');
    assert.equal(formatearUltimos4('4821'), '·· 4821');
    assert.equal(etiquetaTarjeta(credito), 'BBVA Azul ·· 4821');
    assert.equal(subtituloTarjeta(credito), 'Crédito · ·· 4821');
    assert.equal(textoFechasTarjeta(credito), 'Corte día 12 · Pago día 2');
    assert.equal(colorTarjeta(credito), '#2563EB');

    const debito = {
      id: 2,
      nombre: 'Nu Débito',
      tipo: 'debito',
      ultimos4: '9034',
      dia_corte: null,
      dia_pago: null,
    };
    assert.equal(textoFechasTarjeta(debito), null);
    assert.equal(nombreTarjetaPorId([credito, debito], 2), 'Nu Débito ·· 9034');
    assert.equal(nombreTarjetaPorId([credito, debito], 99), null);
  });

  it('valida datos de tarjeta (nombre, tipo, últimos 4 y días de corte/pago opcionales)', () => {
    const okCredito = validarTarjeta({
      nombre: '  BBVA Azul  ',
      tipo: 'credito',
      ultimos4: '4821',
      diaCorteTexto: '12',
      diaPagoTexto: '2',
    });
    assert.equal(okCredito.valido, true);
    assert.deepEqual(okCredito.datos, {
      nombre: 'BBVA Azul',
      tipo: 'credito',
      ultimos4: '4821',
      dia_corte: 12,
      dia_pago: 2,
    });

    const okDebito = validarTarjeta({
      nombre: 'Santander',
      tipo: 'debito',
      ultimos4: '0091',
      diaCorteTexto: '',
      diaPagoTexto: '',
    });
    assert.equal(okDebito.valido, true);
    assert.equal(okDebito.datos.dia_corte, null);
    assert.equal(okDebito.datos.dia_pago, null);

    const invalida = validarTarjeta({
      nombre: '   ',
      tipo: 'otro',
      ultimos4: '12a',
      diaCorteTexto: '32',
      diaPagoTexto: '0',
    });
    assert.equal(invalida.valido, false);
    assert.ok(invalida.errores.nombre);
    assert.ok(invalida.errores.tipo);
    assert.ok(invalida.errores.ultimos4);
    assert.ok(invalida.errores.dia_corte);
    assert.ok(invalida.errores.dia_pago);
  });

  it('calcula el total mensual de una tarjeta sumando gastos del mes y membresías activas', () => {
    const gastos = [
      { id: 1, tarjeta_id: 1, monto: 320, fecha: '2026-10-05' },
      { id: 2, tarjeta_id: 1, monto: 180.5, fecha: '2026-10-12' },
      { id: 3, tarjeta_id: 1, monto: 999, fecha: '2026-09-25' },
      { id: 4, tarjeta_id: 2, monto: 400, fecha: '2026-10-10' },
    ];
    const membresias = [
      { id: 10, tarjeta_id: 1, costo: 299, frecuencia: 'mensual', estado: 'activa' },
      { id: 11, tarjeta_id: 1, costo: 1200, frecuencia: 'anual', estado: 'activa' },
      { id: 12, tarjeta_id: 1, costo: 500, frecuencia: 'mensual', estado: 'pausada' },
    ];

    const resumen = calcularResumenTarjetaMes(1, gastos, membresias, '2026-10');
    assert.deepEqual(resumen, {
      tarjeta_id: 1,
      mes: '2026-10',
      gasto_variable: 500.5,
      gasto_fijo: 399,
      total: 899.5,
    });

    const general = resumenGeneralTarjetas([
      { id: 1, tipo: 'credito', total_mes: resumen.total },
      { id: 2, tipo: 'debito', total_mes: 400 },
    ]);
    assert.deepEqual(general, {
      totalMes: 1299.5,
      cantidad: 2,
      credito: 1,
      debito: 1,
    });
  });

  it('prepararDatosGasto y prepararDatosMembresia incluyen tarjeta_id cuando corresponde', () => {
    const gastoConTarjeta = prepararDatosGasto({
      montoOriginal: 250,
      moneda: 'MXN',
      categoriaId: 1,
      fecha: '2026-10-15',
      metodoPago: 'tarjeta',
      tarjetaId: 3,
      nota: 'Cena',
    });
    assert.equal(gastoConTarjeta.tarjeta_id, 3);

    const gastoEfectivo = prepararDatosGasto({
      montoOriginal: 250,
      moneda: 'MXN',
      categoriaId: 1,
      fecha: '2026-10-15',
      metodoPago: 'efectivo',
      tarjetaId: 3,
      nota: 'Cena',
    });
    assert.equal(gastoEfectivo.tarjeta_id, null);

    const membresiaConTarjeta = prepararDatosMembresia({
      servicioId: 1,
      nombre: 'Netflix',
      costoOriginal: 299,
      moneda: 'MXN',
      frecuencia: 'mensual',
      fechaCobro: '2026-10-20',
      tarjetaId: 2,
    });
    assert.equal(membresiaConTarjeta.tarjeta_id, 2);
  });
});
