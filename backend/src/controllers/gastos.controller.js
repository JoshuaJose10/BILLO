const { pool } = require('../db');
const { calcularAlertaPresupuesto } = require('./presupuestos.controller');
const { esMonedaValida } = require('./tipoCambio.controller');

const METODOS_PAGO_VALIDOS = ['efectivo', 'tarjeta', 'transferencia', 'otro'];

const esFechaValida = (fechaStr) => {
  if (typeof fechaStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    return false;
  }
  const [anio, mes, dia] = fechaStr.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
};

const esMesValido = (mesStr) => {
  return typeof mesStr === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(mesStr);
};

const esMontoValido = (monto) => {
  return (
    typeof monto === 'number' &&
    Number.isFinite(monto) &&
    monto >= 0.01 &&
    monto <= 9999999999.99 &&
    /^\d{1,10}(\.\d{1,2})?$/.test(String(monto))
  );
};

const esTipoCambioValido = (tipoCambio) => {
  return (
    typeof tipoCambio === 'number' &&
    Number.isFinite(tipoCambio) &&
    tipoCambio > 0 &&
    tipoCambio <= 999999.999999 &&
    /^\d{1,6}(\.\d{1,6})?$/.test(String(tipoCambio))
  );
};

const coincideConversion = (montoOriginal, tipoCambio, monto) => {
  return Math.abs(montoOriginal * tipoCambio - monto) <= 0.005 + 1e-9;
};

const formatearGasto = (row) => ({
  id: row.id,
  monto: Number(row.monto),
  moneda: row.moneda,
  monto_original:
    row.monto_original === null || row.monto_original === undefined
      ? null
      : Number(row.monto_original),
  tipo_cambio:
    row.tipo_cambio === null || row.tipo_cambio === undefined
      ? null
      : Number(row.tipo_cambio),
  categoria_id: row.categoria_id,
  fecha: row.fecha,
  metodo_pago: row.metodo_pago,
  nota: row.nota,
});

const validarDatosGasto = async (body) => {
  const {
    monto,
    moneda,
    monto_original,
    tipo_cambio,
    categoria_id,
    fecha,
    metodo_pago,
    nota,
  } = body && typeof body === 'object' ? body : {};

  if (!esMontoValido(monto)) {
    return {
      error: {
        code: 'MONTO_INVALIDO',
        message: 'El monto debe ser un número mayor a 0',
      },
    };
  }

  let monedaFinal = 'MXN';
  if (moneda !== undefined && moneda !== null) {
    if (!esMonedaValida(moneda)) {
      return {
        error: {
          code: 'MONEDA_INVALIDA',
          message: 'La moneda debe ser un código válido de 3 letras',
        },
      };
    }
    monedaFinal = moneda;
  }

  let montoOriginalFinal = null;
  let tipoCambioFinal = null;

  if (monedaFinal === 'MXN') {
    const tieneMontoOriginal =
      monto_original !== undefined && monto_original !== null;
    const tieneTipoCambio = tipo_cambio !== undefined && tipo_cambio !== null;

    if (tieneMontoOriginal || tieneTipoCambio) {
      if (
        !esMontoValido(monto_original) ||
        !esTipoCambioValido(tipo_cambio) ||
        tipo_cambio !== 1 ||
        monto_original !== monto
      ) {
        return {
          error: {
            code: 'MONTO_INVALIDO',
            message:
              'Para gastos en MXN, monto_original debe coincidir con monto y tipo_cambio debe ser 1',
          },
        };
      }
      montoOriginalFinal = monto_original;
      tipoCambioFinal = tipo_cambio;
    }
  } else {
    if (
      !esMontoValido(monto_original) ||
      !esTipoCambioValido(tipo_cambio) ||
      !coincideConversion(monto_original, tipo_cambio, monto)
    ) {
      return {
        error: {
          code: 'MONTO_INVALIDO',
          message:
            'El monto original multiplicado por el tipo de cambio debe coincidir con el monto en MXN',
        },
      };
    }
    montoOriginalFinal = monto_original;
    tipoCambioFinal = tipo_cambio;
  }

  if (!esFechaValida(fecha)) {
    return {
      error: {
        code: 'FECHA_INVALIDA',
        message: 'La fecha no es válida (formato esperado: YYYY-MM-DD)',
      },
    };
  }

  if (!metodo_pago || !METODOS_PAGO_VALIDOS.includes(metodo_pago)) {
    return {
      error: {
        code: 'METODO_PAGO_INVALIDO',
        message:
          'El método de pago debe ser efectivo, tarjeta, transferencia u otro',
      },
    };
  }

  if (
    nota !== undefined &&
    nota !== null &&
    (typeof nota !== 'string' || nota.length > 200)
  ) {
    return {
      error: {
        code: 'NOTA_INVALIDA',
        message: 'La nota no puede exceder los 200 caracteres',
      },
    };
  }

  if (
    typeof categoria_id !== 'number' ||
    !Number.isInteger(categoria_id) ||
    categoria_id <= 0 ||
    categoria_id > 2147483647
  ) {
    return {
      error: {
        code: 'CATEGORIA_INEXISTENTE',
        message: 'La categoría seleccionada no existe',
      },
    };
  }

  const catResult = await pool.query(
    'SELECT id FROM categorias WHERE id = $1',
    [categoria_id]
  );
  if (catResult.rows.length === 0) {
    return {
      error: {
        code: 'CATEGORIA_INEXISTENTE',
        message: 'La categoría seleccionada no existe',
      },
    };
  }

  return {
    datos: {
      monto,
      moneda: monedaFinal,
      monto_original: montoOriginalFinal,
      tipo_cambio: tipoCambioFinal,
      categoria_id,
      fecha,
      metodo_pago,
      nota: nota ?? null,
    },
  };
};

// POST /gastos
const crearGasto = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const validacion = await validarDatosGasto(req.body);

    if (validacion.error) {
      return res.status(400).json({ error: validacion.error });
    }

    const {
      monto,
      moneda,
      monto_original,
      tipo_cambio,
      categoria_id,
      fecha,
      metodo_pago,
      nota,
    } = validacion.datos;

    const insertQuery = `
      INSERT INTO gastos (usuario_id, categoria_id, monto, moneda, monto_original, tipo_cambio, fecha, metodo_pago, nota)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, monto, moneda, monto_original, tipo_cambio, categoria_id, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, metodo_pago, nota
    `;
    const { rows } = await pool.query(insertQuery, [
      usuarioId,
      categoria_id,
      monto,
      moneda,
      monto_original,
      tipo_cambio,
      fecha,
      metodo_pago,
      nota,
    ]);

    const gasto = formatearGasto(rows[0]);
    const alerta = await calcularAlertaPresupuesto(
      usuarioId,
      gasto.categoria_id,
      gasto.fecha
    );

    const respuesta = { gasto };
    if (alerta) {
      respuesta.alerta = alerta;
    }

    return res.status(201).json(respuesta);
  } catch (error) {
    console.error('Error al crear gasto:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo registrar el gasto',
      },
    });
  }
};

// GET /gastos
const listarGastos = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { mes, categoria_id } = req.query;

    const condiciones = ['usuario_id = $1'];
    const valores = [usuarioId];

    if (mes !== undefined) {
      if (!esMesValido(mes)) {
        return res.status(400).json({
          error: {
            code: 'MES_INVALIDO',
            message: 'El formato del mes debe ser YYYY-MM',
          },
        });
      }
      valores.push(mes);
      condiciones.push(`TO_CHAR(fecha, 'YYYY-MM') = $${valores.length}`);
    }

    if (categoria_id !== undefined) {
      const catId = Number(categoria_id);
      if (!Number.isInteger(catId) || catId <= 0 || catId > 2147483647) {
        return res.status(400).json({
          error: {
            code: 'CATEGORIA_INEXISTENTE',
            message: 'El identificador de categoría no es válido',
          },
        });
      }
      valores.push(catId);
      condiciones.push(`categoria_id = $${valores.length}`);
    }

    const query = `
      SELECT id, monto, moneda, monto_original, tipo_cambio, categoria_id, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, metodo_pago, nota
      FROM gastos
      WHERE ${condiciones.join(' AND ')}
      ORDER BY fecha DESC, id DESC
    `;

    const { rows } = await pool.query(query, valores);
    return res.status(200).json(rows.map(formatearGasto));
  } catch (error) {
    console.error('Error al listar gastos:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudieron obtener los gastos',
      },
    });
  }
};

// PUT /gastos/:id
const actualizarGasto = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const gastoId = Number(req.params.id);

    if (!Number.isInteger(gastoId) || gastoId <= 0 || gastoId > 2147483647) {
      return res.status(404).json({
        error: {
          code: 'GASTO_NO_ENCONTRADO',
          message: 'Gasto no encontrado',
        },
      });
    }

    const validacion = await validarDatosGasto(req.body);
    if (validacion.error) {
      return res.status(400).json({ error: validacion.error });
    }

    const {
      monto,
      moneda,
      monto_original,
      tipo_cambio,
      categoria_id,
      fecha,
      metodo_pago,
      nota,
    } = validacion.datos;

    const updateQuery = `
      UPDATE gastos
      SET monto = $3,
          moneda = $4,
          monto_original = $5,
          tipo_cambio = $6,
          categoria_id = $7,
          fecha = $8,
          metodo_pago = $9,
          nota = $10
      WHERE id = $1 AND usuario_id = $2
      RETURNING id, monto, moneda, monto_original, tipo_cambio, categoria_id, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, metodo_pago, nota
    `;

    const { rows } = await pool.query(updateQuery, [
      gastoId,
      usuarioId,
      monto,
      moneda,
      monto_original,
      tipo_cambio,
      categoria_id,
      fecha,
      metodo_pago,
      nota,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'GASTO_NO_ENCONTRADO',
          message: 'Gasto no encontrado',
        },
      });
    }

    const gasto = formatearGasto(rows[0]);
    const alerta = await calcularAlertaPresupuesto(
      usuarioId,
      gasto.categoria_id,
      gasto.fecha
    );

    const respuesta = { gasto };
    if (alerta) {
      respuesta.alerta = alerta;
    }

    return res.status(200).json(respuesta);
  } catch (error) {
    console.error('Error al actualizar gasto:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo actualizar el gasto',
      },
    });
  }
};

// DELETE /gastos/:id
const eliminarGasto = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const gastoId = Number(req.params.id);

    if (!Number.isInteger(gastoId) || gastoId <= 0 || gastoId > 2147483647) {
      return res.status(404).json({
        error: {
          code: 'GASTO_NO_ENCONTRADO',
          message: 'Gasto no encontrado',
        },
      });
    }

    const deleteQuery = `
      DELETE FROM gastos
      WHERE id = $1 AND usuario_id = $2
      RETURNING id
    `;

    const { rows } = await pool.query(deleteQuery, [gastoId, usuarioId]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'GASTO_NO_ENCONTRADO',
          message: 'Gasto no encontrado',
        },
      });
    }

    return res.status(200).json({ eliminado: true });
  } catch (error) {
    console.error('Error al eliminar gasto:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo eliminar el gasto',
      },
    });
  }
};

module.exports = {
  crearGasto,
  listarGastos,
  actualizarGasto,
  eliminarGasto,
};
