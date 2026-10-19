const { pool } = require('../db');

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

const formatearGasto = (row) => ({
  id: row.id,
  monto: Number(row.monto),
  categoria_id: row.categoria_id,
  fecha: row.fecha,
  metodo_pago: row.metodo_pago,
  nota: row.nota,
});

const validarDatosGasto = async ({
  monto,
  categoria_id,
  fecha,
  metodo_pago,
  nota,
}) => {
  const montoNum =
    typeof monto === 'number'
      ? monto
      : typeof monto === 'string' && monto.trim() !== ''
        ? Number(monto)
        : NaN;

  if (!Number.isFinite(montoNum) || montoNum <= 0) {
    return {
      error: {
        code: 'MONTO_INVALIDO',
        message: 'El monto debe ser un número mayor a 0',
      },
    };
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

  const catId = Number(categoria_id);
  if (!Number.isInteger(catId) || catId <= 0) {
    return {
      error: {
        code: 'CATEGORIA_INEXISTENTE',
        message: 'La categoría seleccionada no existe',
      },
    };
  }

  const catResult = await pool.query(
    'SELECT id FROM categorias WHERE id = $1',
    [catId]
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
      monto: montoNum,
      categoria_id: catId,
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

    const { monto, categoria_id, fecha, metodo_pago, nota } = validacion.datos;

    const insertQuery = `
      INSERT INTO gastos (usuario_id, categoria_id, monto, fecha, metodo_pago, nota)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, monto, categoria_id, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, metodo_pago, nota
    `;
    const { rows } = await pool.query(insertQuery, [
      usuarioId,
      categoria_id,
      monto,
      fecha,
      metodo_pago,
      nota,
    ]);

    return res.status(201).json({ gasto: formatearGasto(rows[0]) });
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
      if (!Number.isInteger(catId) || catId <= 0) {
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
      SELECT id, monto, categoria_id, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, metodo_pago, nota
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

    if (!Number.isInteger(gastoId) || gastoId <= 0) {
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

    const { monto, categoria_id, fecha, metodo_pago, nota } = validacion.datos;

    const updateQuery = `
      UPDATE gastos
      SET monto = $3,
          categoria_id = $4,
          fecha = $5,
          metodo_pago = $6,
          nota = $7
      WHERE id = $1 AND usuario_id = $2
      RETURNING id, monto, categoria_id, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, metodo_pago, nota
    `;

    const { rows } = await pool.query(updateQuery, [
      gastoId,
      usuarioId,
      monto,
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

    return res.status(200).json({ gasto: formatearGasto(rows[0]) });
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

    if (!Number.isInteger(gastoId) || gastoId <= 0) {
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

