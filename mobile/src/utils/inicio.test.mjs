// Pruebas de utils/inicio.js con el runner de Node: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cargarDatosInicio, movimientosRecientes } from './inicio.js';

describe('movimientosRecientes', () => {
  const gasto = (id, fecha) => ({ id, fecha, monto: 10 });
  const ingreso = (id, fecha) => ({ id, fecha, monto: 100 });

  it('mezcla gastos e ingresos por fecha y se queda con los 5 más recientes', () => {
    const gastos = [1, 2, 3, 4, 5].map((d) => gasto(d, `2026-11-0${d}`));
    const ingresos = [ingreso(1, '2026-11-04'), ingreso(2, '2026-11-01')];
    assert.deepEqual(
      movimientosRecientes(gastos, ingresos).map((m) => `${m.tipo}-${m.fecha.slice(-2)}`),
      ['gasto-05', 'ingreso-04', 'gasto-04', 'gasto-03', 'gasto-02'],
    );
  });

  it('con pocos movimientos devuelve todos; sin ninguno, vacío', () => {
    assert.equal(movimientosRecientes([gasto(1, '2026-11-01')], []).length, 1);
    assert.deepEqual(movimientosRecientes([], []), []);
  });
});

// Servicios falsos que cuentan las llamadas y responden cuando se les indica.
function serviciosFalsos({ fallar = [] } = {}) {
  const llamadas = [];
  const pendientes = [];
  const servicio = (nombre, valor) => (arg) => {
    llamadas.push({ nombre, arg });
    return new Promise((resolve, reject) => {
      pendientes.push(() =>
        fallar.includes(nombre) ? reject({ code: 'ERROR_SERVIDOR' }) : resolve(valor),
      );
    });
  };
  return {
    llamadas,
    responder: () => pendientes.forEach((r) => r()),
    servicios: {
      obtenerResumen: servicio('resumen', { gasto_variable: 120, gasto_fijo: 0, total: 120 }),
      listarGastos: servicio('gastos', [{ id: 1, monto: 120, categoria_id: 1 }]),
      listarIngresos: servicio('ingresos', [{ id: 3, monto: 1000, fecha: '2026-11-01' }]),
      listarPresupuestos: servicio('presupuestos', [{ id: 5, estado: 'alerta' }]),
      listarMembresias: (...args) =>
        servicio('membresias', [{ id: 9, dias_para_cobro: 2 }])(...args),
    },
  };
}

describe('cargarDatosInicio', () => {
  it('hace exactamente 5 peticiones del mes, todas antes de que responda alguna', async () => {
    const f = serviciosFalsos();
    const carga = cargarDatosInicio(f.servicios, '2026-11');
    assert.deepEqual(f.llamadas, [
      { nombre: 'presupuestos', arg: '2026-11' },
      { nombre: 'membresias', arg: undefined },
      { nombre: 'resumen', arg: '2026-11' },
      { nombre: 'gastos', arg: { mes: '2026-11' } },
      { nombre: 'ingresos', arg: { mes: '2026-11' } },
    ]);
    f.responder();
    const datos = await carga;
    assert.equal(f.llamadas.length, 5);
    assert.equal(datos.ingresos.length, 1);
    assert.equal(datos.resumen.gasto_variable, 120);
    assert.equal(datos.gastos.length, 1);
    assert.equal(datos.presupuestos.length, 1);
    assert.equal(datos.membresias.length, 1);
  });

  it('si fallan las membresías sigue con null', async () => {
    const f = serviciosFalsos({ fallar: ['membresias'] });
    const carga = cargarDatosInicio(f.servicios, '2026-11');
    f.responder();
    const datos = await carga;
    assert.equal(datos.membresias, null);
    assert.equal(datos.gastos.length, 1);
  });

  it('sin servicio de membresías devuelve null', async () => {
    const f = serviciosFalsos();
    const { listarMembresias, ...sin } = f.servicios;
    const carga = cargarDatosInicio(sin, '2026-11');
    f.responder();
    assert.equal((await carga).membresias, null);
  });

  it('si fallan los presupuestos sigue con null', async () => {
    const f = serviciosFalsos({ fallar: ['presupuestos'] });
    const carga = cargarDatosInicio(f.servicios, '2026-11');
    f.responder();
    assert.equal((await carga).presupuestos, null);
  });

  it('si falla el resumen, los gastos o los ingresos lanza el error', async () => {
    for (const nombre of ['resumen', 'gastos', 'ingresos']) {
      const f = serviciosFalsos({ fallar: [nombre] });
      const carga = cargarDatosInicio(f.servicios, '2026-11');
      f.responder();
      await assert.rejects(carga, { code: 'ERROR_SERVIDOR' });
    }
  });
});
