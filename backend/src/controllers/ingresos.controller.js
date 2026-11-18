const { pool } = require('../db');
const {
  FRECUENCIAS_INGRESO_VALIDAS,
  calcularSiguienteIngreso,
} = require('../jobs/ingresosRecurrentes');

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

const formatearIngreso = (row) => ({
  id: row.id,
  monto: Number(row.monto),
  fecha: row.fecha,
  descripcion: row.descripcion,
  fuente: row.fuente,
  frecuencia: row.frecuencia ?? null,
  proximo_ingreso: row.proximo_ingreso ?? null,
  recurrente: Boolean(row.recurrente),
});

const validarDatosIngreso = (body) => {
  const { monto, fecha, descripcion, fuente, frecuencia, proximo_ingreso } =
    body && typeof body === 'object' ? body : {};

  if (!esMontoValido(monto)) {
    return {
      error: {
        code: 'MONTO_INVALIDO',
        message: 'El monto debe ser un número mayor a 0 con hasta 2 decimales',
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

  if (
    descripcion !== undefined &&
    descripcion !== null &&
    (typeof descripcion !== 'string' || descripcion.length > 200)
  ) {
    return {
      error: {
        code: 'DESCRIPCION_INVALIDA',
        message: 'La descripción no puede exceder los 200 caracteres',
      },
    };
  }

  let fuenteFinal = null;
  if (fuente !== undefined && fuente !== null) {
    if (
      typeof fuente !== 'string' ||
      fuente.trim() === '' ||
      fuente.trim().length > 100
    ) {
      return {
        error: {
          code: 'FUENTE_INVALIDA',
          message: 'La fuente debe ser un texto válido de hasta 100 caracteres',
        },
      };
    }
    fuenteFinal = fuente.trim();
  }

  let frecuenciaFinal = null;
  let proximoIngresoFinal = null;

  if (frecuencia !== undefined && frecuencia !== null) {
    if (
      typeof frecuencia !== 'string' ||
      !FRECUENCIAS_INGRESO_VALIDAS.includes(frecuencia)
    ) {
      return {
        error: {
          code: 'FRECUENCIA_INVALIDA',
          message: "La frecuencia debe ser 'semanal', 'quincenal' o 'mensual'",
        },
      };
    }
    frecuenciaFinal = frecuencia;

    if (proximo_ingreso !== undefined && proximo_ingreso !== null) {
      if (!esFechaValida(proximo_ingreso)) {
        return {
          error: {
            code: 'FECHA_INVALIDA',
            message:
              'La fecha del próximo ingreso no es válida (formato esperado: YYYY-MM-DD)',
          },
        };
      }
      proximoIngresoFinal = proximo_ingreso;
    } else {
      proximoIngresoFinal = calcularSiguienteIngreso(fecha, frecuenciaFinal);
    }
  }

  return {
    datos: {
      monto,
      fecha,
      descripcion: descripcion ?? null,
      fuente: fuenteFinal,
      frecuencia: frecuenciaFinal,
      proximo_ingreso: proximoIngresoFinal,
    },
  };
};

// POST /ingresos
const crearIngreso = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const validacion = validarDatosIngreso(req.body);

    if (validacion.error) {
      return res.status(400).json({ error: validacion.error });
    }

    const {
      monto,
      fecha,
      descripcion,
      fuente,
      frecuencia,
      proximo_ingreso,
    } = validacion.datos;

    const insertQuery = `
      INSERT INTO ingresos (
        usuario_id,
        monto,
        fecha,
        descripcion,
        fuente,
        frecuencia,
        proximo_ingreso,
        recurrente
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
      RETURNING
        id,
        monto,
        TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
        descripcion,
        fuente,
        frecuencia,
        TO_CHAR(proximo_ingreso, 'YYYY-MM-DD') AS proximo_ingreso,
        recurrente
    `;

    const { rows } = await pool.query(insertQuery, [
      usuarioId,
      monto,
      fecha,
      descripcion,
      fuente,
      frecuencia,
      proximo_ingreso,
    ]);

    return res.status(201).json({ ingreso: formatearIngreso(rows[0]) });
  } catch (error) {
    console.error('Error al crear ingreso:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo registrar el ingreso',
      },
    });
  }
};

// GET /ingresos
const listarIngresos = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { mes } = req.query;

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

    const query = `
      SELECT
        id,
        monto,
        TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
        descripcion,
        fuente,
        frecuencia,
        TO_CHAR(proximo_ingreso, 'YYYY-MM-DD') AS proximo_ingreso,
        recurrente
      FROM ingresos
      WHERE ${condiciones.join(' AND ')}
      ORDER BY fecha DESC, id DESC
    `;

    const { rows } = await pool.query(query, valores);
    return res.status(200).json(rows.map(formatearIngreso));
  } catch (error) {
    console.error('Error al listar ingresos:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudieron obtener los ingresos',
      },
    });
  }
};

// PUT /ingresos/:id
const actualizarIngreso = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const ingresoId = Number(req.params.id);

    if (
      !Number.isInteger(ingresoId) ||
      ingresoId <= 0 ||
      ingresoId > 2147483647
    ) {
      return res.status(404).json({
        error: {
          code: 'INGRESO_NO_ENCONTRADO',
          message: 'Ingreso no encontrado',
        },
      });
    }

    const validacion = validarDatosIngreso(req.body);
    if (validacion.error) {
      return res.status(400).json({ error: validacion.error });
    }

    const {
      monto,
      fecha,
      descripcion,
      fuente,
      frecuencia,
      proximo_ingreso,
    } = validacion.datos;

    const updateQuery = `
      UPDATE ingresos
      SET monto = $3,
          fecha = $4,
          descripcion = $5,
          fuente = $6,
          frecuencia = $7,
          proximo_ingreso = $8
      WHERE id = $1 AND usuario_id = $2
      RETURNING
        id,
        monto,
        TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
        descripcion,
        fuente,
        frecuencia,
        TO_CHAR(proximo_ingreso, 'YYYY-MM-DD') AS proximo_ingreso,
        recurrente
    `;

    const { rows } = await pool.query(updateQuery, [
      ingresoId,
      usuarioId,
      monto,
      fecha,
      descripcion,
      fuente,
      frecuencia,
      proximo_ingreso,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'INGRESO_NO_ENCONTRADO',
          message: 'Ingreso no encontrado',
        },
      });
    }

    return res.status(200).json({ ingreso: formatearIngreso(rows[0]) });
  } catch (error) {
    console.error('Error al actualizar ingreso:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo actualizar el ingreso',
      },
    });
  }
};

// DELETE /ingresos/:id
const eliminarIngreso = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const ingresoId = Number(req.params.id);

    if (
      !Number.isInteger(ingresoId) ||
      ingresoId <= 0 ||
      ingresoId > 2147483647
    ) {
      return res.status(404).json({
        error: {
          code: 'INGRESO_NO_ENCONTRADO',
          message: 'Ingreso no encontrado',
        },
      });
    }

    const deleteQuery = `
      DELETE FROM ingresos
      WHERE id = $1 AND usuario_id = $2
      RETURNING id
    `;

    const { rows } = await pool.query(deleteQuery, [ingresoId, usuarioId]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'INGRESO_NO_ENCONTRADO',
          message: 'Ingreso no encontrado',
        },
      });
    }

    return res.status(200).json({ eliminado: true });
  } catch (error) {
    console.error('Error al eliminar ingreso:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo eliminar el ingreso',
      },
    });
  }
};

module.exports = {
  crearIngreso,
  listarIngresos,
  actualizarIngreso,
  eliminarIngreso,
};
