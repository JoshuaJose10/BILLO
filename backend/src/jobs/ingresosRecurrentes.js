const { diasEnMes, obtenerFechaHoy } = require('./avisoCobros');

const INTERVALO_DIARIO_MS = 24 * 60 * 60 * 1000;
const FRECUENCIAS_INGRESO_VALIDAS = ['semanal', 'quincenal', 'mensual'];

/**
 * Calcula la siguiente fecha de ingreso según la frecuencia ('semanal', 'quincenal', 'mensual').
 * En 'mensual' ajusta el fin de mes (31 -> 28, 29 o 30 según el mes destino).
 */
const calcularSiguienteIngreso = (fechaStr, frecuencia) => {
  if (
    typeof fechaStr !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fechaStr) ||
    !FRECUENCIAS_INGRESO_VALIDAS.includes(frecuencia)
  ) {
    return null;
  }

  const [anio, mes, dia] = fechaStr.split('-').map(Number);

  if (frecuencia === 'semanal') {
    return new Date(Date.UTC(anio, mes - 1, dia + 7))
      .toISOString()
      .slice(0, 10);
  }

  if (frecuencia === 'quincenal') {
    return new Date(Date.UTC(anio, mes - 1, dia + 15))
      .toISOString()
      .slice(0, 10);
  }

  // mensual
  let nuevoAnio = anio;
  let nuevoMes = mes + 1;
  if (nuevoMes > 12) {
    nuevoMes = 1;
    nuevoAnio += 1;
  }
  const maxDias = diasEnMes(nuevoAnio, nuevoMes);
  const diaAjustado = Math.min(dia, maxDias);
  return `${String(nuevoAnio).padStart(4, '0')}-${String(nuevoMes).padStart(2, '0')}-${String(diaAjustado).padStart(2, '0')}`;
};

/**
 * Proceso diario que genera los ingresos recurrentes cuyo proximo_ingreso <= hoy.
 * - Inserta a lo sumo un ingreso por (ingreso_origen_id, fecha) gracias al índice único parcial y ON CONFLICT DO NOTHING.
 * - Avanza proximo_ingreso de la plantilla al siguiente periodo futuro (> hoy).
 * - Los ingresos generados quedan con recurrente = true y frecuencia = null.
 */
const procesarIngresosRecurrentes = async ({
  fechaReferencia,
  pool: customPool,
  logger = console,
} = {}) => {
  const pool = customPool || require('../db').pool;
  const hoyStr = obtenerFechaHoy(fechaReferencia);
  const resumen = {
    fecha: hoyStr,
    revisados: 0,
    generados: 0,
    omitidosPorDuplicado: 0,
    errores: 0,
  };

  try {
    const { rows: programados } = await pool.query(
      `SELECT
         id,
         usuario_id,
         monto,
         descripcion,
         fuente,
         frecuencia,
         TO_CHAR(proximo_ingreso, 'YYYY-MM-DD') AS proximo_ingreso
       FROM ingresos
       WHERE frecuencia IS NOT NULL
         AND proximo_ingreso IS NOT NULL
         AND proximo_ingreso <= $1
       ORDER BY id ASC`,
      [hoyStr]
    );

    for (const origen of programados) {
      resumen.revisados++;
      try {
        let fechaPendiente = origen.proximo_ingreso;
        let iteraciones = 0;
        const maxIteraciones = 500;

        while (
          fechaPendiente &&
          fechaPendiente <= hoyStr &&
          iteraciones < maxIteraciones
        ) {
          iteraciones++;
          const insertRes = await pool.query(
            `INSERT INTO ingresos (
               usuario_id,
               monto,
               fecha,
               descripcion,
               fuente,
               frecuencia,
               proximo_ingreso,
               recurrente,
               ingreso_origen_id
             )
             VALUES ($1, $2, $3, $4, $5, NULL, NULL, TRUE, $6)
             ON CONFLICT (ingreso_origen_id, fecha)
               WHERE ingreso_origen_id IS NOT NULL
               DO NOTHING
             RETURNING id`,
            [
              origen.usuario_id,
              origen.monto,
              fechaPendiente,
              origen.descripcion,
              origen.fuente,
              origen.id,
            ]
          );

          if (insertRes.rowCount > 0) {
            resumen.generados++;
          } else {
            resumen.omitidosPorDuplicado++;
          }

          fechaPendiente = calcularSiguienteIngreso(
            fechaPendiente,
            origen.frecuencia
          );
        }

        if (fechaPendiente) {
          await pool.query(
            'UPDATE ingresos SET proximo_ingreso = $1 WHERE id = $2',
            [fechaPendiente, origen.id]
          );
        }
      } catch (errItem) {
        resumen.errores++;
        logger.error(
          `[ingresos-recurrentes] Error al procesar ingreso ${origen.id}: ${errItem.message}`
        );
      }
    }
  } catch (errGlobal) {
    resumen.errores++;
    logger.error(
      `[ingresos-recurrentes] Error general en el proceso diario: ${errGlobal.message}`
    );
  }

  return resumen;
};

const iniciarCronIngresosRecurrentes = ({
  intervaloMs = INTERVALO_DIARIO_MS,
  ejecutarAlIniciar = true,
  ...opciones
} = {}) => {
  if (ejecutarAlIniciar) {
    procesarIngresosRecurrentes(opciones).catch(() => {});
  }

  const timer = setInterval(() => {
    procesarIngresosRecurrentes(opciones).catch(() => {});
  }, intervaloMs);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return {
    detener: () => clearInterval(timer),
  };
};

if (require.main === module) {
  require('dotenv').config({ quiet: true });
  procesarIngresosRecurrentes()
    .then((resumen) => {
      console.log(
        `OK Ingresos recurrentes (${resumen.fecha}): revisados=${resumen.revisados}, generados=${resumen.generados}, errores=${resumen.errores}`
      );
      return require('../db').pool.end();
    })
    .catch((err) => {
      console.error('Error al ejecutar ingresos recurrentes:', err.message);
      process.exitCode = 1;
    });
}

module.exports = {
  FRECUENCIAS_INGRESO_VALIDAS,
  calcularSiguienteIngreso,
  procesarIngresosRecurrentes,
  iniciarCronIngresosRecurrentes,
};
