import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { coloresServicio } from '../theme/servicios.js';

import {
  ajustarAlSiguienteCiclo,
  avanzarFechaCobro,
  calcularDiasParaCobro,
  calcularTotalMensual,
  diasParaCobroCiclo,
  esCobroProximo,
  estiloServicio,
  fechaCobroCiclo,
  textoCobro,
  validarMembresia,
} from './membresias.js';

describe('utils/membresias', () => {
  describe('calcularTotalMensual', () => {
    test('devuelve 0 con lista vacía o nula', () => {
      assert.equal(calcularTotalMensual([]), 0);
      assert.equal(calcularTotalMensual(null), 0);
      assert.equal(calcularTotalMensual(undefined), 0);
    });

    test('suma membresías mensuales exactas', () => {
      const membresias = [
        { costo: 199, frecuencia: 'mensual' },
        { costo: 129, frecuencia: 'mensual' },
      ];
      assert.equal(calcularTotalMensual(membresias), 328);
    });

    test('divide las anuales entre 12 y suma con las mensuales', () => {
      const membresias = [
        { costo: 500, frecuencia: 'mensual' },
        { costo: 1200, frecuencia: 'anual' }, // aporta 100
      ];
      assert.equal(calcularTotalMensual(membresias), 600);
    });

    test('redondea a 2 decimales', () => {
      const membresias = [
        { costo: 100, frecuencia: 'anual' }, // 8.333333...
      ];
      assert.equal(calcularTotalMensual(membresias), 8.33);
    });
  });

  describe('esCobroProximo', () => {
    test('es true para 0, 1, 2, 3 días', () => {
      assert.equal(esCobroProximo(0), true);
      assert.equal(esCobroProximo(1), true);
      assert.equal(esCobroProximo(2), true);
      assert.equal(esCobroProximo(3), true);
    });

    test('es false para 4 o más días y para negativos', () => {
      assert.equal(esCobroProximo(4), false);
      assert.equal(esCobroProximo(10), false);
      assert.equal(esCobroProximo(-1), false);
      assert.equal(esCobroProximo(null), false);
      assert.equal(esCobroProximo(undefined), false);
    });
  });

  describe('textoCobro', () => {
    test('muestra texto según los días', () => {
      assert.match(textoCobro(0, '2026-11-03'), /Cobra hoy/);
      assert.match(textoCobro(1, '2026-11-04'), /Cobra mañana/);
      assert.match(textoCobro(3, '2026-11-06'), /Cobra en 3 días/);
      assert.match(textoCobro(-2, '2026-11-01'), /Venció hace 2 días/);
    });
  });

  describe('estiloServicio', () => {
    test('asigna color e icono específico a servicios conocidos', () => {
      assert.equal(estiloServicio('Netflix').color, coloresServicio.netflix);
      assert.equal(estiloServicio('Spotify Individual').color, coloresServicio.spotify);
      assert.equal(estiloServicio('YouTube Premium').color, coloresServicio.youtube);
      assert.equal(estiloServicio('Paramount+ Estándar').color, coloresServicio.paramount);
      assert.equal(estiloServicio('Crunchyroll Mega Fan').color, coloresServicio.crunchyroll);
      assert.equal(estiloServicio('Duolingo Super Mensual').color, coloresServicio.duolingo);
      assert.equal(estiloServicio('Microsoft 365 Personal').color, coloresServicio.microsoft);
    });

    test('usa valores por defecto para nombres desconocidos', () => {
      const def = estiloServicio('Gimnasio Municipal');
      assert.equal(def.color, coloresServicio.defecto);
      assert.equal(def.icono, 'calendar-sync');
    });
  });

  describe('validarMembresia', () => {
    test('valida correctamente datos válidos', () => {
      const res = validarMembresia({
        nombre: 'Netflix',
        costoTexto: '199',
        fechaCobro: '2026-11-15',
      });
      assert.equal(res.valido, true);
      assert.equal(res.costo, 199);
      assert.deepEqual(res.errores, {});
    });

    test('falla con nombre vacío (CP-RF5-03)', () => {
      const res = validarMembresia({
        nombre: '   ',
        costoTexto: '199',
        fechaCobro: '2026-11-15',
      });
      assert.equal(res.valido, false);
      assert.equal(res.errores.nombre, 'El nombre es obligatorio');
    });

    test('falla con costo "abc" o no numérico (CP-RF5-04)', () => {
      const res = validarMembresia({
        nombre: 'Spotify',
        costoTexto: 'abc',
        fechaCobro: '2026-11-15',
      });
      assert.equal(res.valido, false);
      assert.equal(res.errores.costo, 'Ingresa un costo válido mayor a $0');
    });

    test('falla con costo 0 o negativo', () => {
      const res0 = validarMembresia({
        nombre: 'Spotify',
        costoTexto: '0',
        fechaCobro: '2026-11-15',
      });
      assert.equal(res0.valido, false);

      const resNeg = validarMembresia({
        nombre: 'Spotify',
        costoTexto: '-50',
        fechaCobro: '2026-11-15',
      });
      assert.equal(resNeg.valido, false);
    });

    test('falla con más de 2 decimales', () => {
      const res = validarMembresia({
        nombre: 'Spotify',
        costoTexto: '199.999',
        fechaCobro: '2026-11-15',
      });
      assert.equal(res.valido, false);
      assert.equal(res.errores.costo, 'El costo puede tener hasta 2 decimales');
    });
  });

  describe('avanzarFechaCobro (HU-51 / BUG-01)', () => {
    const hoyFijo = '2026-11-08';

    test('mensual con cobro hace 30 días avanza al ciclo futuro', () => {
      // 30 días antes de 2026-11-08 fue 2026-10-09
      const proximo = avanzarFechaCobro('2026-10-09', 'mensual', hoyFijo);
      assert.equal(proximo, '2026-11-09');
    });

    test('mensual con cobro en la fecha de hoy no avanza (cobra hoy)', () => {
      const proximo = avanzarFechaCobro(hoyFijo, 'mensual', hoyFijo);
      assert.equal(proximo, hoyFijo);
    });

    test('mensual con fecha futura no se modifica', () => {
      const proximo = avanzarFechaCobro('2026-11-20', 'mensual', hoyFijo);
      assert.equal(proximo, '2026-11-20');
    });

    test('mensual con cobro de hace 3 meses avanza múltiples ciclos', () => {
      const proximo = avanzarFechaCobro('2026-08-15', 'mensual', hoyFijo);
      assert.equal(proximo, '2026-11-15');
    });

    test('mensual que ya pasó en el mes actual avanza al mes siguiente', () => {
      const proximo = avanzarFechaCobro('2026-10-05', 'mensual', hoyFijo);
      assert.equal(proximo, '2026-12-05');
    });

    test('mensual en fin de mes (día 31) ajusta según días del mes', () => {
      // Enero 31 -> Febrero (28 días en 2026) -> Marzo 31
      const enFeb = avanzarFechaCobro('2026-01-31', 'mensual', '2026-02-15');
      assert.equal(enFeb, '2026-02-28');

      const enMar = avanzarFechaCobro('2026-01-31', 'mensual', '2026-03-01');
      assert.equal(enMar, '2026-03-31');
    });

    test('anual con cobro hace 1 año avanza al ciclo futuro', () => {
      const proximo = avanzarFechaCobro('2025-10-15', 'anual', hoyFijo);
      assert.equal(proximo, '2027-10-15');
    });

    test('anual que cobra más tarde en el año en curso avanza al año actual', () => {
      const proximo = avanzarFechaCobro('2025-12-01', 'anual', hoyFijo);
      assert.equal(proximo, '2026-12-01');
    });

    test('anual con cobro futuro no se modifica', () => {
      const proximo = avanzarFechaCobro('2027-05-10', 'anual', hoyFijo);
      assert.equal(proximo, '2027-05-10');
    });

    test('tolera entradas inválidas devolviendo la entrada original', () => {
      assert.equal(avanzarFechaCobro(null), null);
      assert.equal(avanzarFechaCobro(''), '');
      assert.equal(avanzarFechaCobro('invalida'), 'invalida');
    });
  });

  describe('calcularDiasParaCobro', () => {
    const hoyFijo = '2026-11-08';

    test('devuelve 0 si la fecha es hoy', () => {
      assert.equal(calcularDiasParaCobro('2026-11-08', hoyFijo), 0);
    });

    test('devuelve 1 si la fecha es mañana', () => {
      assert.equal(calcularDiasParaCobro('2026-11-09', hoyFijo), 1);
    });

    test('devuelve 30 si la fecha es en 30 días', () => {
      assert.equal(calcularDiasParaCobro('2026-12-08', hoyFijo), 30);
    });

    test('devuelve undefined con formato inválido', () => {
      assert.equal(calcularDiasParaCobro(null), undefined);
      assert.equal(calcularDiasParaCobro(''), undefined);
    });
  });

  describe('ajustarAlSiguienteCiclo y calcularTotalMensual (Aceptación HU-51)', () => {
    const hoyFijo = '2026-11-08';

    test('una membresía mensual con cobro hace 30 días muestra su próximo cobro futuro y dias_para_cobro >= 0', () => {
      const membresiaOriginal = {
        id: 1,
        nombre: 'Spotify',
        costo: 129,
        frecuencia: 'mensual',
        fecha_cobro: '2026-10-09', // 30 días atrás
        dias_para_cobro: -30,
      };

      const ajustada = ajustarAlSiguienteCiclo(membresiaOriginal, hoyFijo);

      assert.equal(ajustada.fecha_cobro, '2026-11-09');
      assert.equal(ajustada.dias_para_cobro, 1);
      assert.equal(ajustada.fecha_cobro_original, '2026-10-09');
    });

    test('el total mensual no cambia al avanzar de ciclo', () => {
      const listaOriginal = [
        { id: 1, nombre: 'Spotify', costo: 129, frecuencia: 'mensual', fecha_cobro: '2026-10-09' },
        { id: 2, nombre: 'Disney+', costo: 1200, frecuencia: 'anual', fecha_cobro: '2025-10-08' },
        { id: 3, nombre: 'Netflix', costo: 219, frecuencia: 'mensual', fecha_cobro: '2026-11-20' },
      ];

      const totalAntes = calcularTotalMensual(listaOriginal);
      const listaAjustada = listaOriginal.map((m) => ajustarAlSiguienteCiclo(m, hoyFijo));
      const totalDespues = calcularTotalMensual(listaAjustada);

      assert.equal(totalAntes, 129 + 100 + 219);
      assert.equal(totalDespues, totalAntes);
      assert.equal(totalDespues, 448);
    });
  });

  describe('alineación de fecha mostrada con el ciclo que se paga (HU-66 / interacción con HU-51)', () => {
    const hoyFijo = '2026-11-12';

    test('fecha persistida del 15/octubre muestra 15/octubre antes del pago y avanza visiblemente a 15/noviembre tras el pago', () => {
      // 1. Estado persistido en BD: cobro vencido el 15 de octubre
      const persistidaOctubre = {
        id: 10,
        nombre: 'Netflix',
        costo: 219,
        frecuencia: 'mensual',
        fecha_cobro: '2026-10-15',
        dias_para_cobro: -28,
      };

      // 2. HU-51 adelanta visualmente la membresía al ciclo vigente
      const ajustadaHU51 = ajustarAlSiguienteCiclo(persistidaOctubre, hoyFijo);
      assert.equal(ajustadaHU51.fecha_cobro, '2026-11-15');
      assert.equal(ajustadaHU51.fecha_cobro_original, '2026-10-15');

      // 3. Antes de pagar: la fecha mostrada se alinea con el ciclo que se paga (15/octubre, no 15/noviembre)
      const fechaAntes = fechaCobroCiclo(ajustadaHU51);
      const diasAntes = diasParaCobroCiclo(ajustadaHU51, hoyFijo);
      assert.equal(fechaAntes, '2026-10-15');
      assert.equal(diasAntes, -28);
      assert.equal(textoCobro(diasAntes, fechaAntes), 'Venció hace 28 días (15 oct)');

      // 4. Se marca como pagada (POST /membresias/:id/pagada): el backend avanza la fecha de BD a 2026-11-15
      const respuestaBackendTrasPago = {
        id: 10,
        nombre: 'Netflix',
        costo: 219,
        frecuencia: 'mensual',
        fecha_cobro: '2026-11-15',
        dias_para_cobro: 3,
      };
      const ajustadaTrasPago = ajustarAlSiguienteCiclo(respuestaBackendTrasPago, hoyFijo);

      // 5. Tras el pago: la fecha mostrada avanza visiblemente al siguiente ciclo (15/noviembre)
      const fechaDespues = fechaCobroCiclo(ajustadaTrasPago);
      const diasDespues = diasParaCobroCiclo(ajustadaTrasPago, hoyFijo);
      assert.equal(fechaDespues, '2026-11-15');
      assert.equal(diasDespues, 3);
      assert.equal(textoCobro(diasDespues, fechaDespues), 'Cobra en 3 días (15 nov)');

      // 6. Comprobación crucial: no deja la misma fecha visible antes y después del pago
      assert.notEqual(fechaAntes, fechaDespues);
      assert.equal(fechaAntes, '2026-10-15');
      assert.equal(fechaDespues, '2026-11-15');
    });

    test('suscripción al corriente (fecha futura) muestra su ciclo vigente y avanza al siguiente ciclo tras el pago', () => {
      const persistidaNoviembre = {
        id: 11,
        nombre: 'Spotify',
        costo: 129,
        frecuencia: 'mensual',
        fecha_cobro: '2026-11-20',
        dias_para_cobro: 8,
      };
      const ajustada = ajustarAlSiguienteCiclo(persistidaNoviembre, hoyFijo);
      assert.equal(fechaCobroCiclo(ajustada), '2026-11-20');
      assert.equal(diasParaCobroCiclo(ajustada, hoyFijo), 8);

      // Tras pagar ciclo 20/nov, backend avanza a 20/dic
      const trasPago = ajustarAlSiguienteCiclo(
        { ...persistidaNoviembre, fecha_cobro: '2026-12-20', dias_para_cobro: 38 },
        hoyFijo,
      );
      assert.equal(fechaCobroCiclo(trasPago), '2026-12-20');
      assert.notEqual(fechaCobroCiclo(ajustada), fechaCobroCiclo(trasPago));
    });

    test('tolera objetos nulos o indefinidos devolviendo valores seguros', () => {
      assert.equal(fechaCobroCiclo(null), '');
      assert.equal(fechaCobroCiclo(undefined), '');
      assert.equal(diasParaCobroCiclo(null), undefined);
      assert.equal(diasParaCobroCiclo(undefined), undefined);
    });
  });
});
