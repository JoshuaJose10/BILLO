// Costo compartido en planes Duo/Familiar (HU-76): todo total de lo que pagas usa costoPropio.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cobrosDeLaSemana } from './cobrosSemana.js';
import {
  calcularTotalAnual,
  calcularTotalEsteMes,
  calcularTotalMensual,
  cobrosSuscripcionesEnMes,
  costoPropio,
  detalleCostoCompartido,
  textoCostoCompartido,
  tramosSuscripciones,
} from './membresias.js';
import { crearDatoWidget } from './widgetResumen.js';

const spotify = { id: 1, nombre: 'Spotify', costo: 129, personas: 2, frecuencia: 'mensual' };
const familiar = { id: 2, nombre: 'Familiar', costo: 99, personas: 3, frecuencia: 'anual' };

describe('costoPropio (HU-76)', () => {
  it('divide entre personas a 2 decimales; sin personas o con 1, el costo completo', () => {
    assert.equal(costoPropio(spotify), 64.5);
    assert.equal(costoPropio(familiar), 33);
    assert.equal(costoPropio({ costo: 100, personas: 3 }), 33.33);
    assert.equal(costoPropio({ costo: 199 }), 199);
    assert.equal(costoPropio({ costo: 199, personas: 1 }), 199);
    assert.equal(costoPropio({ costo: 0.01, personas: 3 }), 0.01);
    assert.equal(costoPropio({ costo: 0, personas: 2 }), 0);
    assert.equal(costoPropio(null), 0);
  });

  it('«Pagas $64.50 de $129» solo si personas > 1', () => {
    assert.equal(textoCostoCompartido(spotify), 'Pagas $64.50 de $129');
    assert.equal(textoCostoCompartido({ costo: 129, personas: 1 }), null);
    assert.equal(textoCostoCompartido({ costo: 129 }), null);
  });

  it('fila: «de $239 · entre 5» solo si personas > 1', () => {
    assert.equal(detalleCostoCompartido({ costo: 239, personas: 5 }), 'de $239 · entre 5');
    assert.equal(costoPropio({ costo: 239, personas: 5 }), 47.8);
    assert.equal(detalleCostoCompartido({ costo: 239, personas: 1 }), null);
    assert.equal(detalleCostoCompartido({ costo: 239 }), null);
  });

  it('Cartera: mensual, al año y este mes suman tu parte', () => {
    assert.equal(calcularTotalMensual([spotify, familiar]), 67.25);
    assert.equal(calcularTotalAnual([spotify, familiar]), 64.5 * 12 + 33);
    assert.equal(calcularTotalEsteMes([spotify], '2026-11-18'), 64.5);
    assert.deepEqual(
      tramosSuscripciones([spotify, { ...spotify, id: 3, nombre: 'Netflix', personas: 1 }]).map(
        (t) => t.nombre,
      ),
      ['Netflix', 'Spotify'],
    );
  });

  it('Movimientos, Inicio y widget usan tu parte (divisa también)', () => {
    const conFecha = {
      ...spotify,
      fecha_cobro: '2026-12-05',
      dias_para_cobro: 2,
      estado: 'activa',
    };
    const [cobro] = cobrosSuscripcionesEnMes([conFecha], '2026-11', '2026-11-18');
    assert.equal(cobro.monto, 64.5);
    const usd = { ...conFecha, moneda: 'USD', monto_original: 10, costo: 186.32 };
    assert.equal(cobrosSuscripcionesEnMes([usd], '2026-11', '2026-11-18')[0].monto_original, 5);
    assert.equal(cobrosDeLaSemana([conFecha]).total, 64.5);
    const dato = crearDatoWidget({ membresias: [conFecha] }, '2026-11', '2026-11-18');
    assert.equal(dato.cobros[0].costo, 64.5);
    assert.equal(dato.cobro.monto, 64.5);
  });

  it('con personas = 1 todo queda igual que antes', () => {
    const netflix = { costo: 199, frecuencia: 'mensual' };
    assert.equal(
      calcularTotalMensual([netflix]),
      calcularTotalMensual([{ ...netflix, personas: 1 }]),
    );
    assert.equal(calcularTotalMensual([netflix]), 199);
  });
});
