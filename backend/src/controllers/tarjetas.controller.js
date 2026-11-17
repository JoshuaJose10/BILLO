const { pool } = require('../db');

const TIPOS_TARJETA_VALIDOS = ['credito', 'debito'];
const MAX_LONGITUD_NOMBRE = 100;
const MAX_INT32 = 2147483647;

const esMesValido = (mesStr) => {
  return typeof mesStr === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(mesStr);
};

const esDiaValido = (dia) => {
  return (
    typeof dia === 'number' &&
    Number.isInteger(dia) &&
    dia >= 1 &&
    dia <= 31
  );
};

const parsearIdPositivo = (valor) => {
  const num = Number(valor);
  if (!Number.isInteger(num) || num <= 0 || num > MAX_INT32) {
    return null;
  }
  return num;
};

const formatearTarjeta = (row) => ({
  id: row.id,
  nombre: row.nombre,
  tipo: row.tipo,
  ultimos4:
    typeof row.ultimos4 === 'string' ? row.ultimos4.trim() : row.ultimos4,
  dia_corte:
    row.dia_corte === null || row.dia_corte === undefined
      ? null
      : Number(row.dia_corte),
  dia_pago:
    row.dia_pago === null || row.dia_pago === undefined
      ? null
      : Number(row.dia_pago),
  creada_en:
    row.creada_en instanceof Date
      ? row.creada_en.toISOString()
      : row.creada_en,
});

const esTarjetaDelUsuario = async (usuarioId, tarjetaId) => {
  if (
    typeof tarjetaId !== 'number' ||
    !Number.isInteger(tarjetaId) ||
    tarjetaId <= 0 ||
    tarjetaId > MAX_INT32
  ) {
    return null;
  }

  const { rows } = await pool.query(
    `SELECT id, nombre, tipo, ultimos4, dia_corte, dia_pago, creada_en
     FROM tarjetas
     WHERE id = $1 AND usuario_id = $2`,
    [tarjetaId, usuarioId]
  );

  return rows[0] || null;
};

const validarDatosTarjeta = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      error: {
        code: 'TARJETA_INVALIDA',
        message: 'Los datos de la tarjeta son inválidos',
      },
    };
  }

  const { nombre, tipo, ultimos4, dia_corte, dia_pago } = body;

  if (
    typeof nombre !== 'string' ||
    nombre.trim().length === 0 ||
    nombre.trim().length > MAX_LONGITUD_NOMBRE
  ) {
    return {
      error: {
        code: 'TARJETA_INVALIDA',
        message: `El nombre de la tarjeta es obligatorio y debe tener hasta ${MAX_LONGITUD_NOMBRE} caracteres`,
      },
    };
  }

  if (typeof tipo !== 'string' || !TIPOS_TARJETA_VALIDOS.includes(tipo)) {
    return {
      error: {
        code: 'TARJETA_INVALIDA',
        message: "El tipo de tarjeta debe ser 'credito' o 'debito'",
      },
    };
  }

  if (typeof ultimos4 !== 'string' || !/^\d{4}$/.test(ultimos4)) {
    return {
      error: {
        code: 'ULTIMOS4_INVALIDOS',
        message: 'Los últimos 4 dígitos deben ser exactamente 4 números',
      },
    };
  }

  let diaCorteFinal = null;
  if (dia_corte !== undefined && dia_corte !== null) {
    if (!esDiaValido(dia_corte)) {
      return {
        error: {
          code: 'TARJETA_INVALIDA',
          message: 'El día de corte debe ser un número entero entre 1 y 31',
        },
      };
    }
    diaCorteFinal = dia_corte;
  }

  let diaPagoFinal = null;
  if (dia_pago !== undefined && dia_pago !== null) {
    if (!esDiaValido(dia_pago)) {
      return {
        error: {
          code: 'TARJETA_INVALIDA',
          message: 'El día de pago debe ser un número entero entre 1 y 31',
        },
      };
    }
    diaPagoFinal = dia_pago;
  }

  return {
    datos: {
      nombre: nombre.trim(),
      tipo,
      ultimos4,
      dia_corte: diaCorteFinal,
      dia_pago: diaPagoFinal,
    },
  };
};

// POST /tarjetas
const crearTarjeta = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const validacion = validarDatosTarjeta(req.body);

    if (validacion.error) {
      return res.status(400).json({ error: validacion.error });
    }

    const { nombre, tipo, ultimos4, dia_corte, dia_pago } = validacion.datos;

    const { rows } = await pool.query(
      `INSERT INTO tarjetas (usuario_id, nombre, tipo, ultimos4, dia_corte, dia_pago)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, tipo, ultimos4, dia_corte, dia_pago, creada_en`,
      [usuarioId, nombre, tipo, ultimos4, dia_corte, dia_pago]
    );

    return res.status(201).json({ tarjeta: formatearTarjeta(rows[0]) });
  } catch (error) {
    console.error('Error al crear tarjeta:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo registrar la tarjeta',
      },
    });
  }
};

// GET /tarjetas
const listarTarjetas = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { rows } = await pool.query(
      `SELECT id, nombre, tipo, ultimos4, dia_corte, dia_pago, creada_en
       FROM tarjetas
       WHERE usuario_id = $1
       ORDER BY id ASC`,
      [usuarioId]
    );

    return res.status(200).json(rows.map(formatearTarjeta));
  } catch (error) {
    console.error('Error al listar tarjetas:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudieron obtener las tarjetas',
      },
    });
  }
};

// PUT /tarjetas/:id
const actualizarTarjeta = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const tarjetaId = parsearIdPositivo(req.params.id);

    if (!tarjetaId) {
      return res.status(404).json({
        error: {
          code: 'TARJETA_NO_ENCONTRADA',
          message: 'Tarjeta no encontrada',
        },
      });
    }

    const validacion = validarDatosTarjeta(req.body);
    if (validacion.error) {
      return res.status(400).json({ error: validacion.error });
    }

    const { nombre, tipo, ultimos4, dia_corte, dia_pago } = validacion.datos;

    const { rows } = await pool.query(
      `UPDATE tarjetas
       SET nombre = $3,
           tipo = $4,
           ultimos4 = $5,
           dia_corte = $6,
           dia_pago = $7
       WHERE id = $1 AND usuario_id = $2
       RETURNING id, nombre, tipo, ultimos4, dia_corte, dia_pago, creada_en`,
      [tarjetaId, usuarioId, nombre, tipo, ultimos4, dia_corte, dia_pago]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'TARJETA_NO_ENCONTRADA',
          message: 'Tarjeta no encontrada',
        },
      });
    }

    return res.status(200).json({ tarjeta: formatearTarjeta(rows[0]) });
  } catch (error) {
    console.error('Error al actualizar tarjeta:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo actualizar la tarjeta',
      },
    });
  }
};

// DELETE /tarjetas/:id
const eliminarTarjeta = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const tarjetaId = parsearIdPositivo(req.params.id);

    if (!tarjetaId) {
      return res.status(404).json({
        error: {
          code: 'TARJETA_NO_ENCONTRADA',
          message: 'Tarjeta no encontrada',
        },
      });
    }

    const { rows } = await pool.query(
      `DELETE FROM tarjetas
       WHERE id = $1 AND usuario_id = $2
       RETURNING id`,
      [tarjetaId, usuarioId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'TARJETA_NO_ENCONTRADA',
          message: 'Tarjeta no encontrada',
        },
      });
    }

    return res.status(200).json({ eliminado: true });
  } catch (error) {
    console.error('Error al eliminar tarjeta:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo eliminar la tarjeta',
      },
    });
  }
};

// GET /tarjetas/:id/resumen?mes=YYYY-MM
const obtenerResumenTarjeta = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const tarjetaId = parsearIdPositivo(req.params.id);

    if (!tarjetaId) {
      return res.status(404).json({
        error: {
          code: 'TARJETA_NO_ENCONTRADA',
          message: 'Tarjeta no encontrada',
        },
      });
    }

    const { mes } = req.query;
    if (!esMesValido(mes)) {
      return res.status(400).json({
        error: {
          code: 'MES_INVALIDO',
          message: 'El formato del mes debe ser YYYY-MM',
        },
      });
    }

    const tarjeta = await esTarjetaDelUsuario(usuarioId, tarjetaId);
    if (!tarjeta) {
      return res.status(404).json({
        error: {
          code: 'TARJETA_NO_ENCONTRADA',
          message: 'Tarjeta no encontrada',
        },
      });
    }

    const [gastosResult, membresiasResult] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(monto), 0) AS total_variable
         FROM gastos
         WHERE usuario_id = $1
           AND tarjeta_id = $2
           AND TO_CHAR(fecha, 'YYYY-MM') = $3`,
        [usuarioId, tarjetaId, mes]
      ),
      pool.query(
        `SELECT costo, frecuencia
         FROM membresias
         WHERE usuario_id = $1
           AND tarjeta_id = $2
           AND estado = 'activa'`,
        [usuarioId, tarjetaId]
      ),
    ]);

    const sumaVariable = Number(gastosResult.rows[0].total_variable);
    const gastoVariable =
      Math.round((sumaVariable + Number.EPSILON) * 100) / 100;

    const sumaFijo = membresiasResult.rows.reduce((acc, row) => {
      const costo = Number(row.costo);
      const mensual = row.frecuencia === 'anual' ? costo / 12 : costo;
      return acc + mensual;
    }, 0);
    const gastoFijo = Math.round((sumaFijo + Number.EPSILON) * 100) / 100;

    const total =
      Math.round((gastoVariable + gastoFijo + Number.EPSILON) * 100) / 100;

    return res.status(200).json({
      tarjeta_id: tarjetaId,
      mes,
      gasto_variable: gastoVariable,
      gasto_fijo: gastoFijo,
      total,
    });
  } catch (error) {
    console.error('Error al obtener resumen de tarjeta:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo obtener el resumen de la tarjeta',
      },
    });
  }
};

module.exports = {
  esTarjetaDelUsuario,
  crearTarjeta,
  listarTarjetas,
  actualizarTarjeta,
  eliminarTarjeta,
  obtenerResumenTarjeta,
};
