// Pruebas de utils/inicio.js con el runner de Node: npm test
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cargarDatosInicio } from './inicio.js';

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
      listarPresupuestos: servicio('presupuestos', [{ id: 5, estado: 'alerta' }]),
    },
  };
}

describe('cargarDatosInicio', () => {
  it('hace exactamente 3 peticiones del mes, todas antes de que responda alguna', async () => {
    const f = serviciosFalsos();
    const carga = cargarDatosInicio(f.servicios, '2026-11');
    assert.deepEqual(f.llamadas, [
      { nombre: 'presupuestos', arg: '2026-11' },
      { nombre: 'resumen', arg: '2026-11' },
      { nombre: 'gastos', arg: { mes: '2026-11' } },
    ]);
    f.responder();
    const datos = await carga;
    assert.equal(f.llamadas.length, 3);
    assert.equal(datos.resumen.gasto_variable, 120);
    assert.equal(datos.gastos.length, 1);
    assert.equal(datos.presupuestos.length, 1);
  });

  it('si fallan los presupuestos sigue con null', async () => {
    const f = serviciosFalsos({ fallar: ['presupuestos'] });
    const carga = cargarDatosInicio(f.servicios, '2026-11');
    f.responder();
    assert.equal((await carga).presupuestos, null);
  });

  it('si falla el resumen o los gastos lanza el error', async () => {
    for (const nombre of ['resumen', 'gastos']) {
      const f = serviciosFalsos({ fallar: [nombre] });
      const carga = cargarDatosInicio(f.servicios, '2026-11');
      f.responder();
      await assert.rejects(carga, { code: 'ERROR_SERVIDOR' });
    }
  });
});
