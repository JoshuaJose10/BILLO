// Pruebas de los datos de ejemplo del modo exploración (HU-50): npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mesActual, sumarMeses } from '../utils/fechas.js';
import { calcularTotalMensual } from '../utils/membresias.js';

// ejemplo.js importa services/api.js, que lee la URL al importarse.
process.env.EXPO_PUBLIC_API_URL = 'http://192.168.1.100:3000';
const { crearDatosEjemplo, responderEjemplo } = await import('./ejemplo.js');
const { MODO_VISITANTE } = await import('../services/api.js');

// Un día a media quincena, el primero del mes (los gastos se recortan a hoy) y enero (el mes
// anterior es del año pasado).
const FECHAS = [new Date(2026, 10, 10), new Date(2026, 10, 1), new Date(2027, 0, 31)];

const pedir = (ruta, hoy, opciones) => responderEjemplo(ruta, opciones, hoy);
const sumar = (lista, campo) => Math.round(lista.reduce((s, x) => s + x[campo], 0) * 100) / 100;

for (const hoy of FECHAS) {
  const mes = mesActual(hoy);
  const anterior = sumarMeses(mes, -1);

  describe(`datos de ejemplo con hoy = ${mes}-${hoy.getDate()}`, () => {
    it('tiene unos 20 gastos del mes actual y el anterior en las 6 categorías', async () => {
      const categorias = await pedir('/categorias', hoy);
      const gastos = await pedir('/gastos', hoy);
      assert.equal(categorias.length, 6);
      assert.equal(gastos.length, 20);
      assert.deepEqual(
        new Set(gastos.map((g) => g.categoria_id)),
        new Set(categorias.map((c) => c.id)),
      );
      for (const g of gastos) {
        assert.ok(g.fecha.startsWith(`${mes}-`) || g.fecha.startsWith(`${anterior}-`), g.fecha);
        assert.ok(new Date(`${g.fecha}T00:00:00`) <= hoy, `gasto en el futuro: ${g.fecha}`);
        assert.equal(g.moneda, 'MXN');
      }
    });

    it('filtra por mes y categoría y ordena por fecha descendente', async () => {
      const delMes = await pedir(`/gastos?mes=${mes}`, hoy);
      const delAnterior = await pedir(`/gastos?mes=${anterior}`, hoy);
      assert.equal(delMes.length + delAnterior.length, 20);
      assert.ok(delMes.every((g) => g.fecha.startsWith(mes)));
      for (let i = 1; i < delMes.length; i++) {
        const [a, b] = [delMes[i - 1], delMes[i]];
        assert.ok(a.fecha > b.fecha || (a.fecha === b.fecha && a.id > b.id));
      }
      const comida = await pedir(`/gastos?mes=${mes}&categoria_id=1`, hoy);
      assert.ok(comida.length > 0 && comida.every((g) => g.categoria_id === 1));
    });

    it('tiene ingresos del mes, ninguno en el futuro, y el saldo queda en positivo', async () => {
      const ingresos = await pedir(`/ingresos?mes=${mes}`, hoy);
      const resumen = await pedir(`/reportes/resumen?mes=${mes}`, hoy);
      assert.equal(ingresos.length, 2);
      for (const i of ingresos) {
        assert.ok(i.fecha.startsWith(`${mes}-`), i.fecha);
        assert.ok(new Date(`${i.fecha}T00:00:00`) <= hoy, `ingreso en el futuro: ${i.fecha}`);
      }
      assert.ok(sumar(ingresos, 'monto') > resumen.gasto_variable);
      assert.equal((await pedir('/ingresos', hoy)).length, 4);
    });

    it('el resumen suma los gastos del mes y las suscripciones', async () => {
      for (const m of [mes, anterior]) {
        const gastos = await pedir(`/gastos?mes=${m}`, hoy);
        const membresias = await pedir('/membresias', hoy);
        const resumen = await pedir(`/reportes/resumen?mes=${m}`, hoy);
        assert.equal(resumen.mes, m);
        assert.equal(resumen.gasto_variable, sumar(gastos, 'monto'));
        assert.equal(resumen.gasto_fijo, calcularTotalMensual(membresias));
        assert.equal(
          resumen.total,
          Math.round((resumen.gasto_variable + resumen.gasto_fijo) * 100) / 100,
        );
      }
    });

    it('por categoría reparte el gasto variable y los porcentajes suman 100', async () => {
      const resumen = await pedir(`/reportes/resumen?mes=${mes}`, hoy);
      const gastos = await pedir(`/gastos?mes=${mes}`, hoy);
      const lista = await pedir(`/reportes/por-categoria?mes=${mes}`, hoy);
      assert.equal(lista.length, 6);
      assert.equal(sumar(lista, 'total'), resumen.gasto_variable);
      assert.equal(
        lista.reduce((s, c) => s + c.porcentaje, 0),
        100,
      );
      for (let i = 1; i < lista.length; i++) assert.ok(lista[i - 1].total >= lista[i].total);
      for (const c of lista) {
        const deLaCategoria = gastos.filter((g) => g.categoria_id === c.categoria_id);
        assert.equal(c.total, sumar(deLaCategoria, 'monto'));
      }
    });

    it('tiene un presupuesto ok, uno en alerta y uno excedido con lo gastado real', async () => {
      const presupuestos = await pedir(`/presupuestos?mes=${mes}`, hoy);
      const gastos = await pedir(`/gastos?mes=${mes}`, hoy);
      assert.deepEqual(presupuestos.map((p) => p.estado).sort(), ['alerta', 'excedido', 'ok']);
      for (const p of presupuestos) {
        const gastado = sumar(
          gastos.filter((g) => g.categoria_id === p.categoria_id),
          'monto',
        );
        assert.equal(p.gastado, gastado);
        assert.equal(p.porcentaje, Math.round((gastado * 100) / p.monto_limite));
        assert.equal(p.mes, mes);
        assert.ok(p.categoria);
      }
      assert.deepEqual(await pedir(`/presupuestos?mes=${anterior}`, hoy), []);
    });

    it('tiene 4 suscripciones con cobros próximos, de la más cercana a la más lejana', async () => {
      const membresias = await pedir('/membresias', hoy);
      assert.equal(membresias.length, 4);
      for (let i = 0; i < membresias.length; i++) {
        const m = membresias[i];
        assert.ok(m.dias_para_cobro >= 0 && m.dias_para_cobro <= 30);
        if (i > 0) assert.ok(membresias[i - 1].dias_para_cobro <= m.dias_para_cobro);
      }
      assert.ok(membresias.some((m) => m.dias_para_cobro <= 3));
      const catalogo = await pedir('/catalogo', hoy);
      assert.ok(membresias.every((m) => catalogo.some((s) => s.id === m.servicio_id)));
    });
  });
}

describe('responderEjemplo', () => {
  it('rechaza toda escritura con MODO_VISITANTE y no cambia los datos', async () => {
    const hoy = FECHAS[0];
    const antes = await pedir('/gastos', hoy);
    const escrituras = [
      ['/gastos', 'POST'],
      ['/gastos/1', 'PUT'],
      ['/gastos/1', 'DELETE'],
      ['/presupuestos', 'POST'],
      ['/presupuestos/1', 'PUT'],
      ['/presupuestos/1', 'DELETE'],
      ['/membresias', 'POST'],
      ['/membresias/1', 'PUT'],
      ['/membresias/1', 'DELETE'],
      ['/notificaciones/token', 'POST'],
      ['/notificaciones/token', 'DELETE'],
    ];
    for (const [ruta, method] of escrituras) {
      await assert.rejects(pedir(ruta, hoy, { method, body: {} }), { code: MODO_VISITANTE });
    }
    assert.deepEqual(await pedir('/gastos', hoy), antes);
  });

  it('devuelve copias: modificar una respuesta no altera las siguientes', async () => {
    const hoy = FECHAS[0];
    const gastos = await pedir('/gastos', hoy);
    gastos[0].monto = 999999;
    gastos.push({ id: 99 });
    const categorias = await pedir('/categorias', hoy);
    categorias[0].nombre = 'Cambiada';
    assert.equal((await pedir('/gastos', hoy)).length, 20);
    assert.notEqual((await pedir('/gastos', hoy))[0].monto, 999999);
    assert.equal((await pedir('/categorias', hoy))[0].nombre, 'Comida');
    assert.deepEqual(crearDatosEjemplo(hoy), crearDatosEjemplo(hoy));
  });

  it('una ruta sin datos de ejemplo responde RUTA_NO_ENCONTRADA', async () => {
    await assert.rejects(pedir('/auth/perfil', FECHAS[0]), { code: 'RUTA_NO_ENCONTRADA' });
  });
});
