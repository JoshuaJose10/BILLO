import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { coloresServicio } from '../theme/servicios.js';

import {
  ajustarAlSiguienteCiclo,
  avanzarFechaCobro,
  calcularDiasParaCobro,
  calcularTotalAnual,
  calcularTotalEsteMes,
  calcularTotalMensual,
  detectarServicioRepetido,
  diasParaCobroCiclo,
  esCobroProximo,
  estiloServicio,
  fechaCobroCiclo,
  obtenerMarcaServicio,
  resumenPagosMembresia,
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

    test('ignora las membresías pausadas (Aceptación HU-75)', () => {
      const membresias = [
        { nombre: 'Netflix', costo: 199, frecuencia: 'mensual', estado: 'pausada' },
        { nombre: 'Spotify', costo: 129, frecuencia: 'mensual', estado: 'activa' },
      ];
      // Solo suma Spotify ($129), Netflix ($199) pausada no cuenta
      assert.equal(calcularTotalMensual(membresias), 129);
    });

    test('reactivar devuelve el costo al total mensual (QA HU-75)', () => {
      const pausada = [{ nombre: 'Netflix', costo: 199, frecuencia: 'mensual', estado: 'pausada' }];
      assert.equal(calcularTotalMensual(pausada), 0);

      const reactivada = [
        { nombre: 'Netflix', costo: 199, frecuencia: 'mensual', estado: 'activa' },
      ];
      assert.equal(calcularTotalMensual(reactivada), 199);
    });
  });

  describe('membresías pausadas', () => {
    const lista = [
      { costo: 100, frecuencia: 'mensual', estado: 'activa' },
      { costo: 50, frecuencia: 'mensual', estado: 'pausada' },
    ];
    test('no cuentan en el total anual ni en el de este mes', () => {
      assert.equal(calcularTotalAnual(lista), 1200);
      assert.equal(calcularTotalEsteMes(lista, '2026-11-12'), 100);
    });
  });

  describe('calcularTotalAnual (HU-71)', () => {
    test('devuelve 0 con lista vacía o nula', () => {
      assert.equal(calcularTotalAnual([]), 0);
      assert.equal(calcularTotalAnual(null), 0);
      assert.equal(calcularTotalAnual(undefined), 0);
    });

    test('calcula correctamente Netflix $199 mensual e iCloud $1,200 anual (criterio de aceptación: $3,588)', () => {
      const membresias = [
        { nombre: 'Netflix', costo: 199, frecuencia: 'mensual' },
        { nombre: 'iCloud', costo: 1200, frecuencia: 'anual' },
      ];
      // 199 * 12 = 2388; 2388 + 1200 = 3588
      assert.equal(calcularTotalAnual(membresias), 3588);
    });

    test('multiplica las mensuales por 12 cuando solo hay mensuales', () => {
      const membresias = [
        { costo: 100, frecuencia: 'mensual' },
        { costo: 200, frecuencia: 'mensual' },
      ];
      assert.equal(calcularTotalAnual(membresias), 3600);
    });

    test('suma el costo tal cual cuando solo hay anuales', () => {
      const membresias = [
        { costo: 1200, frecuencia: 'anual' },
        { costo: 600, frecuencia: 'anual' },
      ];
      assert.equal(calcularTotalAnual(membresias), 1800);
    });

    test('redondea a 2 decimales con centavos', () => {
      const membresias = [
        { costo: 99.99, frecuencia: 'mensual' },
        { costo: 1250.5, frecuencia: 'anual' },
      ];
      // 99.99 * 12 = 1199.88; 1199.88 + 1250.5 = 2450.38
      assert.equal(calcularTotalAnual(membresias), 2450.38);
    });
  });

  describe('calcularTotalEsteMes (HU-71)', () => {
    const mesFijo = '2026-11-15';

    test('devuelve 0 con lista vacía o nula', () => {
      assert.equal(calcularTotalEsteMes([], mesFijo), 0);
      assert.equal(calcularTotalEsteMes(null, mesFijo), 0);
      assert.equal(calcularTotalEsteMes(undefined, mesFijo), 0);
    });

    test('calcula correctamente Netflix $199 e iCloud $1,200 cobrando este mes (criterio de aceptación: $1,399)', () => {
      const membresias = [
        { nombre: 'Netflix', costo: 199, frecuencia: 'mensual', fecha_cobro: '2026-11-20' },
        { nombre: 'iCloud', costo: 1200, frecuencia: 'anual', fecha_cobro: '2026-11-25' },
      ];
      // 199 + 1200 = 1399
      assert.equal(calcularTotalEsteMes(membresias, mesFijo), 1399);
    });

    test('al mover iCloud a otro mes, "este mes" baja a $199 (criterio de QA)', () => {
      const membresias = [
        { nombre: 'Netflix', costo: 199, frecuencia: 'mensual', fecha_cobro: '2026-11-20' },
        { nombre: 'iCloud', costo: 1200, frecuencia: 'anual', fecha_cobro: '2026-12-10' }, // cobro en diciembre
      ];
      // iCloud no cobra en noviembre, solo Netflix: 199
      assert.equal(calcularTotalEsteMes(membresias, mesFijo), 199);
    });

    test('incluye el cobro anual de este mes aunque su día ya haya pasado', () => {
      const membresias = [
        { nombre: 'Netflix', costo: 199, frecuencia: 'mensual', fecha_cobro: '2026-11-20' },
        { nombre: 'iCloud', costo: 1200, frecuencia: 'anual', fecha_cobro: '2026-11-05' },
      ];

      for (const referencia of ['2026-11-01', '2026-11-05', '2026-11-12', '2026-11-30']) {
        assert.equal(calcularTotalEsteMes(membresias, referencia), 1399, referencia);
      }
    });

    test('conserva el cobro del mes después de normalizar al siguiente ciclo', () => {
      const referencia = '2026-11-12';
      const membresias = [
        { nombre: 'Netflix', costo: 199, frecuencia: 'mensual', fecha_cobro: '2026-11-20' },
        { nombre: 'iCloud', costo: 1200, frecuencia: 'anual', fecha_cobro: '2026-11-05' },
      ].map((m) => ajustarAlSiguienteCiclo(m, referencia));

      assert.equal(membresias[1].fecha_cobro, '2027-11-05');
      assert.equal(membresias[1].fecha_cobro_original, '2026-11-05');
      assert.equal(calcularTotalEsteMes(membresias, referencia), 1399);
      assert.equal(calcularTotalAnual(membresias), 3588);
      assert.equal(calcularTotalMensual(membresias), 299);
    });

    test('incluye una anual de años anteriores cuyo cobro de este mes ya pasó', () => {
      const referencia = '2026-11-12';
      const membresias = [
        { nombre: 'iCloud', costo: 1200, frecuencia: 'anual', fecha_cobro: '2025-11-05' },
      ].map((m) => ajustarAlSiguienteCiclo(m, referencia));

      assert.equal(calcularTotalEsteMes(membresias, referencia), 1200);
    });

    test('no anticipa un cobro anual que comienza el mismo mes del año siguiente', () => {
      const referencia = '2026-11-12';
      const membresias = [
        { nombre: 'iCloud', costo: 1200, frecuencia: 'anual', fecha_cobro: '2027-11-05' },
      ].map((m) => ajustarAlSiguienteCiclo(m, referencia));

      assert.equal(calcularTotalEsteMes(membresias, referencia), 0);
    });

    test('una referencia de mes completo incluye los mismos cobros que una fecha del mes', () => {
      const membresias = [
        { nombre: 'iCloud', costo: 1200, frecuencia: 'anual', fecha_cobro: '2026-11-05' },
      ];

      assert.equal(calcularTotalEsteMes(membresias, '2026-11'), 1200);
      assert.equal(calcularTotalEsteMes(membresias, mesFijo), 1200);
    });

    test('anual con cobro del año anterior que al avanzar de ciclo cae en este mes se incluye', () => {
      const membresias = [
        { nombre: 'Disney+', costo: 1500, frecuencia: 'anual', fecha_cobro: '2025-11-15' },
      ];
      assert.equal(calcularTotalEsteMes(membresias, mesFijo), 1500);
    });

    test('anual con cobro del mes pasado no se incluye este mes', () => {
      const membresias = [
        { nombre: 'Spotify Anual', costo: 1200, frecuencia: 'anual', fecha_cobro: '2026-10-15' },
      ];
      // Ya cobró en octubre, el siguiente es octubre 2027
      assert.equal(calcularTotalEsteMes(membresias, mesFijo), 0);
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

  describe('detectarServicioRepetido (HU-74)', () => {
    test('devuelve repetido: false con lista vacía, nula o sin datos', () => {
      assert.deepEqual(detectarServicioRepetido({ nombre: 'Spotify' }, []), { repetido: false });
      assert.deepEqual(detectarServicioRepetido({ nombre: 'Spotify' }, null), { repetido: false });
      assert.deepEqual(detectarServicioRepetido(null, [{ id: 1, nombre: 'Spotify' }]), {
        repetido: false,
      });
      assert.deepEqual(detectarServicioRepetido({}, [{ id: 1, nombre: 'Spotify' }]), {
        repetido: false,
      });
    });

    test('detecta Spotify repetido con el mismo nombre exacto (Aceptación HU-74)', () => {
      const existentes = [{ id: 1, nombre: 'Spotify', costo: 129 }];
      const res = detectarServicioRepetido({ nombre: 'Spotify' }, existentes);
      assert.equal(res.repetido, true);
      assert.equal(res.nombreServicio, 'Spotify');
    });

    test('detecta Spotify repetido entre planes de la misma familia (Spotify Individual y Spotify Familiar)', () => {
      const existentes = [{ id: 1, nombre: 'Spotify Individual', costo: 139, servicio_id: 1 }];
      const res = detectarServicioRepetido(
        { nombre: 'Spotify Familiar', costo: 239, servicio_id: 3 },
        existentes,
      );
      assert.equal(res.repetido, true);
      assert.equal(res.nombreServicio, 'Spotify');
    });

    test('detecta coincidencia por mismo servicio_id aunque el nombre varíe', () => {
      const existentes = [{ id: 1, nombre: 'Mi Spotify', servicio_id: 5 }];
      const res = detectarServicioRepetido(
        { nombre: 'Música en streaming', servicio_id: 5 },
        existentes,
      );
      assert.equal(res.repetido, true);
    });

    test('no aparece con servicios distintos (Netflix después de Spotify: QA HU-74)', () => {
      const existentes = [{ id: 1, nombre: 'Spotify', costo: 129 }];
      const res = detectarServicioRepetido({ nombre: 'Netflix', costo: 199 }, existentes);
      assert.equal(res.repetido, false);
    });

    test('editar una membresía existente sin cambiar el nombre no dispara el aviso (QA HU-74)', () => {
      const existentes = [
        { id: 1, nombre: 'Spotify', costo: 129 },
        { id: 2, nombre: 'Netflix', costo: 219 },
      ];
      // Editando la membresía 1 ("Spotify")
      const res = detectarServicioRepetido({ nombre: 'Spotify', costo: 139 }, existentes, 1);
      assert.equal(res.repetido, false);
    });

    test('editar una membresía cambiándola al nombre de otra existente sí dispara el aviso', () => {
      const existentes = [
        { id: 1, nombre: 'Spotify', costo: 129 },
        { id: 2, nombre: 'Disney+', costo: 249 },
      ];
      // Editando la membresía 2, intentando cambiarla a Spotify
      const res = detectarServicioRepetido({ nombre: 'Spotify Premium' }, existentes, 2);
      assert.equal(res.repetido, true);
      assert.equal(res.nombreServicio, 'Spotify');
    });

    test('detecta repetido en servicios personalizados no predefinidos por coincidencia de nombre', () => {
      const existentes = [{ id: 10, nombre: 'Gimnasio Smart Fit' }];
      const res = detectarServicioRepetido({ nombre: 'gimnasio smart fit' }, existentes);
      assert.equal(res.repetido, true);
      assert.equal(res.nombreServicio, 'Gimnasio Smart Fit');
    });
  });

  describe('obtenerMarcaServicio', () => {
    test('obtiene la marca de servicios conocidos', () => {
      assert.equal(obtenerMarcaServicio('Spotify Duo'), 'Spotify');
      assert.equal(obtenerMarcaServicio('Netflix Premium'), 'Netflix');
      assert.equal(obtenerMarcaServicio('Disney+ Estándar'), 'Disney+');
      assert.equal(obtenerMarcaServicio('YouTube Premium Individual'), 'YouTube');
      assert.equal(obtenerMarcaServicio('Apple Music Familiar'), 'Apple Music');
      assert.equal(obtenerMarcaServicio('Xbox Game Pass Ultimate'), 'Xbox Game Pass');
    });

    test('devuelve cadena vacía para nombres no reconocidos o vacíos', () => {
      assert.equal(obtenerMarcaServicio('Internet Telmex'), '');
      assert.equal(obtenerMarcaServicio(''), '');
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

  describe('resumenPagosMembresia', () => {
    test('devuelve totales en cero cuando la lista está vacía o no es un arreglo', () => {
      assert.deepEqual(resumenPagosMembresia(), {
        totalPagado: 0,
        cantidad: 0,
        recientes: [],
      });
      assert.deepEqual(resumenPagosMembresia(null), {
        totalPagado: 0,
        cantidad: 0,
        recientes: [],
      });
    });

    test('suma el total pagado y conserva el orden de hasta limite entradas', () => {
      const pagos = [
        { id: 3, fecha: '2026-11-12', monto: 199.33 },
        { id: 2, fecha: '2026-10-12', monto: 199.33 },
        { id: 1, fecha: '2026-09-12', monto: 199.34 },
      ];
      const resumen = resumenPagosMembresia(pagos, 2);
      assert.equal(resumen.cantidad, 3);
      assert.equal(resumen.totalPagado, 598);
      assert.deepEqual(resumen.recientes, pagos.slice(0, 2));
    });

    test('redondea decimales con precisión de 2 dígitos e ignora montos inválidos', () => {
      const pagos = [
        { id: 1, fecha: '2026-11-01', monto: 10.1 },
        { id: 2, fecha: '2026-11-02', monto: '20.2' },
        { id: 3, fecha: '2026-11-03', monto: 'invalido' },
      ];
      const resumen = resumenPagosMembresia(pagos);
      assert.equal(resumen.cantidad, 3);
      assert.equal(resumen.totalPagado, 30.3);
      assert.equal(resumen.recientes.length, 3);
    });
  });
});
