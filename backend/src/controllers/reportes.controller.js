const { pool } = require('../db');
const { gastoFijoMensual } = require('../utils/membresias');

const esMesValido = (mesStr) => {
  return typeof mesStr === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(mesStr);
};

const redondear2 = (valor) => {
  const num = Number(valor) || 0;
  return Math.round((num + Math.sign(num || 1) * Number.EPSILON) * 100) / 100;
};

const desplazarMes = (mesStr, deltaMeses) => {
  const [anio, mes] = mesStr.split('-').map(Number);
  const totalMeses = anio * 12 + (mes - 1) + deltaMeses;
  const nuevoAnio = Math.floor(totalMeses / 12);
  const nuevoMes = ((totalMeses % 12) + 12) % 12 + 1;
  return `${String(nuevoAnio).padStart(4, '0')}-${String(nuevoMes).padStart(2, '0')}`;
};

// Reutiliza el cálculo de gasto fijo de membresías activas (las pausadas no cuentan).
const calcularGastoFijoActivas = async (usuarioId) => {
  const { rows } = await pool.query(
    `SELECT costo, frecuencia, personas
     FROM membresias
     WHERE usuario_id = $1
       AND estado = 'activa'`,
    [usuarioId]
  );

  return gastoFijoMensual(rows);
};

const calcularResumenMensual = async (usuarioId, mes) => {
  const [gastosResult, gastoFijo] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(monto), 0) AS total_variable
       FROM gastos
       WHERE usuario_id = $1
         AND TO_CHAR(fecha, 'YYYY-MM') = $2`,
      [usuarioId, mes]
    ),
    calcularGastoFijoActivas(usuarioId),
  ]);

  const gastoVariable = redondear2(gastosResult.rows[0].total_variable);
  const total = redondear2(gastoVariable + gastoFijo);

  return {
    mes,
    gasto_variable: gastoVariable,
    gasto_fijo: gastoFijo,
    total,
  };
};

// GET /reportes/resumen?mes=YYYY-MM
const obtenerResumenMensual = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { mes } = req.query;

    if (!esMesValido(mes)) {
      return res.status(400).json({
        error: {
          code: 'MES_INVALIDO',
          message: 'El formato del mes debe ser YYYY-MM',
        },
      });
    }

    const resumen = await calcularResumenMensual(usuarioId, mes);
    return res.status(200).json(resumen);
  } catch (error) {
    console.error('Error al obtener reporte resumen:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo obtener el reporte resumen',
      },
    });
  }
};

// GET /reportes/por-categoria?mes=YYYY-MM
const obtenerGastosPorCategoria = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { mes } = req.query;

    if (!esMesValido(mes)) {
      return res.status(400).json({
        error: {
          code: 'MES_INVALIDO',
          message: 'El formato del mes debe ser YYYY-MM',
        },
      });
    }

    const query = `
      SELECT
        c.id AS categoria_id,
        c.nombre AS categoria,
        SUM(g.monto) AS total
      FROM gastos g
      INNER JOIN categorias c ON c.id = g.categoria_id
      WHERE g.usuario_id = $1
        AND TO_CHAR(g.fecha, 'YYYY-MM') = $2
      GROUP BY c.id, c.nombre
      ORDER BY total DESC, c.id ASC
    `;

    const { rows } = await pool.query(query, [usuarioId, mes]);

    if (rows.length === 0) {
      return res.status(200).json([]);
    }

    const granTotal = rows.reduce((acc, row) => acc + Number(row.total), 0);

    const resultado = rows.map((row) => {
      const total = Number(row.total);
      const porcentaje =
        granTotal > 0 ? Math.round((total * 100) / granTotal) : 0;
      return {
        categoria_id: row.categoria_id,
        categoria: row.categoria,
        total,
        porcentaje,
      };
    });

    if (resultado.length > 0 && granTotal > 0) {
      const sumaPorcentajes = resultado.reduce(
        (acc, item) => acc + item.porcentaje,
        0
      );
      resultado[0].porcentaje += 100 - sumaPorcentajes;
    }

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Error al obtener reporte por categoría:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo obtener el reporte por categoría',
      },
    });
  }
};

// GET /reportes/ingresos?mes=YYYY-MM
const obtenerReporteIngresos = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { mes } = req.query;

    if (!esMesValido(mes)) {
      return res.status(400).json({
        error: {
          code: 'MES_INVALIDO',
          message: 'El formato del mes debe ser YYYY-MM',
        },
      });
    }

    const mesAnterior = desplazarMes(mes, -1);

    const [fuentesResult, anteriorResult] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE(NULLIF(TRIM(fuente), ''), 'Sin fuente') AS fuente,
           SUM(monto) AS total
         FROM ingresos
         WHERE usuario_id = $1
           AND TO_CHAR(fecha, 'YYYY-MM') = $2
         GROUP BY COALESCE(NULLIF(TRIM(fuente), ''), 'Sin fuente')
         ORDER BY total DESC, fuente ASC`,
        [usuarioId, mes]
      ),
      pool.query(
        `SELECT COALESCE(SUM(monto), 0) AS total_anterior
         FROM ingresos
         WHERE usuario_id = $1
           AND TO_CHAR(fecha, 'YYYY-MM') = $2`,
        [usuarioId, mesAnterior]
      ),
    ]);

    const granTotal = fuentesResult.rows.reduce(
      (acc, row) => acc + Number(row.total),
      0
    );
    const total = redondear2(granTotal);

    const porcentajesExactos = fuentesResult.rows.map((row) =>
      granTotal > 0 ? (Number(row.total) * 100) / granTotal : 0
    );
    const porFuente = fuentesResult.rows.map((row, indice) => {
      const montoFuente = redondear2(row.total);
      return {
        fuente: row.fuente,
        total: montoFuente,
        porcentaje: Math.floor(porcentajesExactos[indice]),
      };
    });

    if (porFuente.length > 0 && granTotal > 0) {
      const sumaPorcentajes = porFuente.reduce(
        (acc, item) => acc + item.porcentaje,
        0
      );
      // Restos mayores: repartir los puntos restantes sin concentrar el ajuste en una fuente.
      // El índice desempata según el orden del reporte, sin cambiar el orden de la respuesta.
      const prioridades = porcentajesExactos
        .map((porcentaje, indice) => ({
          indice,
          resto: porcentaje - Math.floor(porcentaje),
        }))
        .sort((a, b) => b.resto - a.resto || a.indice - b.indice);
      for (const { indice } of prioridades.slice(0, 100 - sumaPorcentajes)) {
        porFuente[indice].porcentaje += 1;
      }
    }

    const totalMesAnterior = redondear2(anteriorResult.rows[0].total_anterior);
    const variacion = redondear2(total - totalMesAnterior);
    const variacionPorcentaje =
      totalMesAnterior > 0
        ? redondear2(((total - totalMesAnterior) * 100) / totalMesAnterior)
        : 0;

    return res.status(200).json({
      mes,
      total,
      por_fuente: porFuente,
      mes_anterior: mesAnterior,
      total_mes_anterior: totalMesAnterior,
      variacion,
      variacion_porcentaje: variacionPorcentaje,
    });
  } catch (error) {
    console.error('Error al obtener reporte de ingresos:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo obtener el reporte de ingresos',
      },
    });
  }
};

// GET /reportes/balance?mes=YYYY-MM
const obtenerBalanceMensual = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { mes } = req.query;

    if (!esMesValido(mes)) {
      return res.status(400).json({
        error: {
          code: 'MES_INVALIDO',
          message: 'El formato del mes debe ser YYYY-MM',
        },
      });
    }

    const mesesSerie = [-5, -4, -3, -2, -1, 0].map((delta) =>
      desplazarMes(mes, delta)
    );

    const [resumenActual, ingresosSerieRes, gastosSerieRes] = await Promise.all([
      calcularResumenMensual(usuarioId, mes),
      pool.query(
        `SELECT
           TO_CHAR(fecha, 'YYYY-MM') AS mes,
           COALESCE(SUM(monto), 0) AS total
         FROM ingresos
         WHERE usuario_id = $1
           AND TO_CHAR(fecha, 'YYYY-MM') = ANY($2::text[])
         GROUP BY TO_CHAR(fecha, 'YYYY-MM')`,
        [usuarioId, mesesSerie]
      ),
      pool.query(
        `SELECT
           TO_CHAR(fecha, 'YYYY-MM') AS mes,
           COALESCE(SUM(monto), 0) AS total
         FROM gastos
         WHERE usuario_id = $1
           AND TO_CHAR(fecha, 'YYYY-MM') = ANY($2::text[])
         GROUP BY TO_CHAR(fecha, 'YYYY-MM')`,
        [usuarioId, mesesSerie]
      ),
    ]);

    const ingresosPorMes = new Map(
      ingresosSerieRes.rows.map((r) => [r.mes, Number(r.total)])
    );
    const gastosPorMes = new Map(
      gastosSerieRes.rows.map((r) => [r.mes, Number(r.total)])
    );

    const gastoFijo = resumenActual.gasto_fijo;

    const serie = mesesSerie.map((m) => {
      const ingresosMes = redondear2(ingresosPorMes.get(m) || 0);
      const gastoVariableMes = redondear2(gastosPorMes.get(m) || 0);
      const gastosTotalMes = redondear2(gastoVariableMes + gastoFijo);
      const balanceMes = redondear2(ingresosMes - gastosTotalMes);

      return {
        mes: m,
        ingresos: ingresosMes,
        gasto_variable: gastoVariableMes,
        gasto_fijo: gastoFijo,
        gastos: gastosTotalMes,
        balance: balanceMes,
      };
    });

    const actual = serie[serie.length - 1];

    return res.status(200).json({
      mes,
      ingresos: actual.ingresos,
      gasto_variable: resumenActual.gasto_variable,
      gasto_fijo: resumenActual.gasto_fijo,
      gastos: resumenActual.total,
      balance: redondear2(actual.ingresos - resumenActual.total),
      serie,
    });
  } catch (error) {
    console.error('Error al obtener reporte de balance:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo obtener el reporte de balance',
      },
    });
  }
};

module.exports = {
  calcularResumenMensual,
  obtenerGastosPorCategoria,
  obtenerResumenMensual,
  obtenerReporteIngresos,
  obtenerBalanceMensual,
};
