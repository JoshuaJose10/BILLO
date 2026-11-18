const { pool } = require('../db');
const { esMonedaValida } = require('./tipoCambio.controller');
const { esTarjetaDelUsuario } = require('./tarjetas.controller');

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

const esCostoValido = (costo) => {
  return (
    typeof costo === 'number' &&
    Number.isFinite(costo) &&
    costo >= 0.01 &&
    costo <= 9999999999.99 &&
    /^\d+(\.\d{1,2})?$/.test(String(costo))
  );
};

const esTipoCambioValido = (tc) =>
  typeof tc === 'number' &&
  Number.isFinite(tc) &&
  tc > 0 &&
  /^\d+(\.\d{1,6})?$/.test(String(tc));

const coincideConversion = (montoOriginal, tipoCambio, costoMxn) => {
  const esperado = montoOriginal * tipoCambio;
  return Math.abs(esperado - costoMxn) <= 0.01;
};

const formatearMembresia = (row) => ({
  id: row.id,
  servicio_id: row.servicio_id === null ? null : Number(row.servicio_id),
  tarjeta_id:
    row.tarjeta_id === null || row.tarjeta_id === undefined
      ? null
      : Number(row.tarjeta_id),
  nombre: row.nombre,
  costo: Number(row.costo),
  moneda: row.moneda || 'MXN',
  monto_original:
    row.monto_original === null || row.monto_original === undefined
      ? null
      : Number(row.monto_original),
  tipo_cambio:
    row.tipo_cambio === null || row.tipo_cambio === undefined
      ? null
      : Number(row.tipo_cambio),
  frecuencia: row.frecuencia,
  fecha_cobro: row.fecha_cobro,
  estado: row.estado || 'activa',
});

const formatearMembresiaConDias = (row) => ({
  id: row.id,
  servicio_id: row.servicio_id === null ? null : Number(row.servicio_id),
  tarjeta_id:
    row.tarjeta_id === null || row.tarjeta_id === undefined
      ? null
      : Number(row.tarjeta_id),
  nombre: row.nombre,
  costo: Number(row.costo),
  moneda: row.moneda || 'MXN',
  monto_original:
    row.monto_original === null || row.monto_original === undefined
      ? null
      : Number(row.monto_original),
  tipo_cambio:
    row.tipo_cambio === null || row.tipo_cambio === undefined
      ? null
      : Number(row.tipo_cambio),
  frecuencia: row.frecuencia,
  fecha_cobro: row.fecha_cobro,
  estado: row.estado || 'activa',
  dias_para_cobro: Number(row.dias_para_cobro),
});

const formatearPagoMembresia = (row) => ({
  id: row.id,
  membresia_id: Number(row.membresia_id),
  fecha: row.fecha,
  monto: Number(row.monto),
});

const validarDatosMembresia = async (body, { usuarioId } = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      error: {
        code: 'NOMBRE_INVALIDO',
        message: 'Los datos de la membresía son inválidos',
      },
    };
  }

  const {
    servicio_id,
    tarjeta_id,
    frecuencia,
    fecha_cobro,
    estado,
    moneda,
    monto_original,
    tipo_cambio,
  } = body;
  let { nombre, costo } = body;

  let servicioIdFinal = null;
  let servicioCatalogo = null;

  if (servicio_id !== undefined && servicio_id !== null) {
    if (
      typeof servicio_id !== 'number' ||
      !Number.isInteger(servicio_id) ||
      servicio_id <= 0 ||
      servicio_id > 2147483647
    ) {
      return {
        error: {
          code: 'SERVICIO_INEXISTENTE',
          message: 'El servicio seleccionado no existe',
        },
      };
    }

    const sResult = await pool.query(
      'SELECT id, nombre, costo_sugerido FROM catalogo_servicios WHERE id = $1',
      [servicio_id]
    );

    if (sResult.rows.length === 0) {
      return {
        error: {
          code: 'SERVICIO_INEXISTENTE',
          message: 'El servicio seleccionado no existe',
        },
      };
    }

    servicioIdFinal = servicio_id;
    servicioCatalogo = sResult.rows[0];
  }

  if (nombre === undefined || nombre === null) {
    if (servicioCatalogo) {
      nombre = servicioCatalogo.nombre;
    } else {
      return {
        error: {
          code: 'NOMBRE_INVALIDO',
          message: 'El nombre de la membresía es obligatorio',
        },
      };
    }
  } else {
    if (
      typeof nombre !== 'string' ||
      nombre.trim().length === 0 ||
      nombre.trim().length > 255
    ) {
      return {
        error: {
          code: 'NOMBRE_INVALIDO',
          message: 'El nombre de la membresía debe ser un texto válido',
        },
      };
    }
    nombre = nombre.trim();
  }

  if (costo === undefined || costo === null) {
    if (servicioCatalogo) {
      costo = Number(servicioCatalogo.costo_sugerido);
    } else {
      return {
        error: {
          code: 'COSTO_INVALIDO',
          message:
            'El costo debe ser un número mayor a 0 con máximo 2 decimales',
        },
      };
    }
  } else {
    if (!esCostoValido(costo)) {
      return {
        error: {
          code: 'COSTO_INVALIDO',
          message:
            'El costo debe ser un número mayor a 0 con máximo 2 decimales',
        },
      };
    }
    costo = Number(costo);
  }

  if (
    typeof frecuencia !== 'string' ||
    !['mensual', 'anual'].includes(frecuencia)
  ) {
    return {
      error: {
        code: 'FRECUENCIA_INVALIDA',
        message: "La frecuencia debe ser 'mensual' o 'anual'",
      },
    };
  }

  if (!esFechaValida(fecha_cobro)) {
    return {
      error: {
        code: 'FECHA_INVALIDA',
        message: 'La fecha de cobro no es válida (formato esperado: YYYY-MM-DD)',
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
        !esCostoValido(monto_original) ||
        !esTipoCambioValido(tipo_cambio) ||
        tipo_cambio !== 1 ||
        monto_original !== costo
      ) {
        return {
          error: {
            code: 'MONTO_INVALIDO',
            message:
              'Para suscripciones en MXN, monto_original debe coincidir con costo y tipo_cambio debe ser 1',
          },
        };
      }
      montoOriginalFinal = monto_original;
      tipoCambioFinal = tipo_cambio;
    }
  } else {
    if (
      !esCostoValido(monto_original) ||
      !esTipoCambioValido(tipo_cambio) ||
      !coincideConversion(monto_original, tipo_cambio, costo)
    ) {
      return {
        error: {
          code: 'MONTO_INVALIDO',
          message:
            'El monto original multiplicado por el tipo de cambio debe coincidir con el costo en MXN',
        },
      };
    }
    montoOriginalFinal = monto_original;
    tipoCambioFinal = tipo_cambio;
  }

  let estadoFinal = 'activa';
  if (estado !== undefined && estado !== null) {
    if (typeof estado !== 'string' || !['activa', 'pausada'].includes(estado)) {
      return {
        error: {
          code: 'ESTADO_INVALIDO',
          message: "El estado debe ser 'activa' o 'pausada'",
        },
      };
    }
    estadoFinal = estado;
  }

  let tarjetaIdFinal = null;
  if (tarjeta_id !== undefined && tarjeta_id !== null) {
    const tarjetaValida = await esTarjetaDelUsuario(usuarioId, tarjeta_id);
    if (!tarjetaValida) {
      return {
        error: {
          code: 'TARJETA_INVALIDA',
          message: 'La tarjeta seleccionada no existe o no te pertenece',
        },
      };
    }
    tarjetaIdFinal = tarjeta_id;
  }

  return {
    datos: {
      servicio_id: servicioIdFinal,
      tarjeta_id: tarjetaIdFinal,
      nombre,
      costo,
      moneda: monedaFinal,
      monto_original: montoOriginalFinal,
      tipo_cambio: tipoCambioFinal,
      frecuencia,
      fecha_cobro,
      estado: estadoFinal,
    },
  };
};

// Historial al registrar una suscripción ya pagada (HU-95): un pago por ciclo desde
// fecha_ultimo_pago hasta hoy (inclusive), los 24 más recientes. Cada fecha es inicio + n ciclos
// con el INTERVAL de PostgreSQL (31 ene → 28 feb → 31 mar), igual que el próximo cobro de la app.
const insertarPagosDesde = (client, membresiaId, costo, frecuencia, fechaUltimoPago) => {
  const anual = frecuencia === 'anual';
  return client.query(
    `INSERT INTO pagos_membresia (membresia_id, fecha, monto)
     SELECT $1, fecha, $2
     FROM (
       SELECT ($3::date + n * $4::interval)::date AS fecha
       FROM generate_series(0, (EXTRACT(YEAR FROM age(CURRENT_DATE, $3::date))::int + 1) * $5) AS n
     ) AS ciclos
     WHERE fecha <= CURRENT_DATE
     ORDER BY fecha DESC
     LIMIT 24`,
    [membresiaId, costo, fechaUltimoPago, anual ? '1 year' : '1 month', anual ? 1 : 12]
  );
};

// POST /membresias
const crearMembresia = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const validacion = await validarDatosMembresia(req.body, { usuarioId });

    if (validacion.error) {
      return res.status(400).json({ error: validacion.error });
    }

    const fechaUltimoPago = req.body.fecha_ultimo_pago;
    if (fechaUltimoPago !== undefined && fechaUltimoPago !== null) {
      const valida =
        esFechaValida(fechaUltimoPago) &&
        (await pool.query('SELECT $1::date <= CURRENT_DATE AS ok', [fechaUltimoPago])).rows[0].ok;
      if (!valida) {
        return res.status(400).json({
          error: {
            code: 'FECHA_INVALIDA',
            message: 'La fecha del último pago no es válida (YYYY-MM-DD, hoy o antes)',
          },
        });
      }
    }

    const {
      servicio_id,
      tarjeta_id,
      nombre,
      costo,
      moneda,
      monto_original,
      tipo_cambio,
      frecuencia,
      fecha_cobro,
      estado,
    } = validacion.datos;

    const insertQuery = `
      INSERT INTO membresias (usuario_id, servicio_id, tarjeta_id, nombre, costo, moneda, monto_original, tipo_cambio, frecuencia, fecha_cobro, estado)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, servicio_id, tarjeta_id, nombre, costo, moneda, monto_original, tipo_cambio, frecuencia, TO_CHAR(fecha_cobro, 'YYYY-MM-DD') AS fecha_cobro, estado
    `;

    const client = await pool.connect();
    let rows;
    try {
      await client.query('BEGIN');
      ({ rows } = await client.query(insertQuery, [
        usuarioId,
        servicio_id,
        tarjeta_id,
        nombre,
        costo,
        moneda,
        monto_original,
        tipo_cambio,
        frecuencia,
        fecha_cobro,
        estado,
      ]));
      if (fechaUltimoPago) {
        await insertarPagosDesde(client, rows[0].id, rows[0].costo, frecuencia, fechaUltimoPago);
      }
      await client.query('COMMIT');
    } catch (txError) {
      await client.query('ROLLBACK').catch(() => {});
      throw txError;
    } finally {
      client.release();
    }

    return res
      .status(201)
      .json({ membresia: formatearMembresia(rows[0]) });
  } catch (error) {
    console.error('Error al crear membresía:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo registrar la membresía',
      },
    });
  }
};

// GET /membresias
const listarMembresias = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const query = `
      SELECT 
        id,
        servicio_id,
        tarjeta_id,
        nombre,
        costo,
        moneda,
        monto_original,
        tipo_cambio,
        frecuencia,
        TO_CHAR(fecha_cobro, 'YYYY-MM-DD') AS fecha_cobro,
        estado,
        (fecha_cobro - CURRENT_DATE)::integer AS dias_para_cobro
      FROM membresias
      WHERE usuario_id = $1
      ORDER BY fecha_cobro ASC, id ASC
    `;

    const { rows } = await pool.query(query, [usuarioId]);
    return res.status(200).json(rows.map(formatearMembresiaConDias));
  } catch (error) {
    console.error('Error al listar membresías:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudieron obtener las membresías',
      },
    });
  }
};

// PUT /membresias/:id
const actualizarMembresia = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const membresiaId = Number(req.params.id);

    if (
      !Number.isInteger(membresiaId) ||
      membresiaId <= 0 ||
      membresiaId > 2147483647
    ) {
      return res.status(404).json({
        error: {
          code: 'MEMBRESIA_NO_ENCONTRADA',
          message: 'Membresía no encontrada',
        },
      });
    }

    const validacion = await validarDatosMembresia(req.body, { usuarioId });
    if (validacion.error) {
      return res.status(400).json({ error: validacion.error });
    }

    const {
      servicio_id,
      tarjeta_id,
      nombre,
      costo,
      moneda,
      monto_original,
      tipo_cambio,
      frecuencia,
      fecha_cobro,
      estado,
    } = validacion.datos;

    const updateQuery = `
      UPDATE membresias
      SET servicio_id = $3,
          tarjeta_id = $4,
          nombre = $5,
          costo = $6,
          moneda = $7,
          monto_original = $8,
          tipo_cambio = $9,
          frecuencia = $10,
          fecha_cobro = $11,
          estado = $12
      WHERE id = $1 AND usuario_id = $2
      RETURNING id, servicio_id, tarjeta_id, nombre, costo, moneda, monto_original, tipo_cambio, frecuencia, TO_CHAR(fecha_cobro, 'YYYY-MM-DD') AS fecha_cobro, estado
    `;

    const { rows } = await pool.query(updateQuery, [
      membresiaId,
      usuarioId,
      servicio_id,
      tarjeta_id,
      nombre,
      costo,
      moneda,
      monto_original,
      tipo_cambio,
      frecuencia,
      fecha_cobro,
      estado,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'MEMBRESIA_NO_ENCONTRADA',
          message: 'Membresía no encontrada',
        },
      });
    }

    return res
      .status(200)
      .json({ membresia: formatearMembresia(rows[0]) });
  } catch (error) {
    console.error('Error al actualizar membresía:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo actualizar la membresía',
      },
    });
  }
};

// POST /membresias/:id/pausar
const pausarMembresia = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const membresiaId = Number(req.params.id);

    if (
      !Number.isInteger(membresiaId) ||
      membresiaId <= 0 ||
      membresiaId > 2147483647
    ) {
      return res.status(404).json({
        error: {
          code: 'MEMBRESIA_NO_ENCONTRADA',
          message: 'Membresía no encontrada',
        },
      });
    }

    const query = `
      UPDATE membresias
      SET estado = 'pausada'
      WHERE id = $1 AND usuario_id = $2
      RETURNING id, servicio_id, tarjeta_id, nombre, costo, moneda, monto_original, tipo_cambio, frecuencia, TO_CHAR(fecha_cobro, 'YYYY-MM-DD') AS fecha_cobro, estado
    `;
    const { rows } = await pool.query(query, [membresiaId, usuarioId]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'MEMBRESIA_NO_ENCONTRADA',
          message: 'Membresía no encontrada',
        },
      });
    }

    return res.status(200).json({ membresia: formatearMembresia(rows[0]) });
  } catch (error) {
    console.error('Error al pausar membresía:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo pausar la membresía',
      },
    });
  }
};

// POST /membresias/:id/reactivar
const reactivarMembresia = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const membresiaId = Number(req.params.id);

    if (
      !Number.isInteger(membresiaId) ||
      membresiaId <= 0 ||
      membresiaId > 2147483647
    ) {
      return res.status(404).json({
        error: {
          code: 'MEMBRESIA_NO_ENCONTRADA',
          message: 'Membresía no encontrada',
        },
      });
    }

    const query = `
      UPDATE membresias
      SET estado = 'activa'
      WHERE id = $1 AND usuario_id = $2
      RETURNING id, servicio_id, tarjeta_id, nombre, costo, moneda, monto_original, tipo_cambio, frecuencia, TO_CHAR(fecha_cobro, 'YYYY-MM-DD') AS fecha_cobro, estado
    `;
    const { rows } = await pool.query(query, [membresiaId, usuarioId]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'MEMBRESIA_NO_ENCONTRADA',
          message: 'Membresía no encontrada',
        },
      });
    }

    return res.status(200).json({ membresia: formatearMembresia(rows[0]) });
  } catch (error) {
    console.error('Error al reactivar membresía:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo reactivar la membresía',
      },
    });
  }
};

// DELETE /membresias/:id
const eliminarMembresia = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const membresiaId = Number(req.params.id);

    if (
      !Number.isInteger(membresiaId) ||
      membresiaId <= 0 ||
      membresiaId > 2147483647
    ) {
      return res.status(404).json({
        error: {
          code: 'MEMBRESIA_NO_ENCONTRADA',
          message: 'Membresía no encontrada',
        },
      });
    }

    const deleteQuery = `
      DELETE FROM membresias
      WHERE id = $1 AND usuario_id = $2
      RETURNING id
    `;

    const { rows } = await pool.query(deleteQuery, [membresiaId, usuarioId]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'MEMBRESIA_NO_ENCONTRADA',
          message: 'Membresía no encontrada',
        },
      });
    }

    return res.status(200).json({ eliminado: true });
  } catch (error) {
    console.error('Error al eliminar membresía:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo eliminar la membresía',
      },
    });
  }
};

// POST /membresias/:id/pagada (HU-66 + historial de pagos)
const marcarMembresiaPagada = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const membresiaId = Number(req.params.id);

    if (
      !Number.isInteger(membresiaId) ||
      membresiaId <= 0 ||
      membresiaId > 2147483647
    ) {
      return res.status(404).json({
        error: {
          code: 'MEMBRESIA_NO_ENCONTRADA',
          message: 'Membresía no encontrada',
        },
      });
    }

    const updateQuery = `
      UPDATE membresias
      SET fecha_cobro = CASE
        WHEN frecuencia = 'anual' THEN (fecha_cobro + INTERVAL '1 year')::date
        ELSE (fecha_cobro + INTERVAL '1 month')::date
      END
      WHERE id = $1 AND usuario_id = $2
      RETURNING
        id,
        servicio_id,
        tarjeta_id,
        nombre,
        costo,
        moneda,
        monto_original,
        tipo_cambio,
        estado,
        frecuencia,
        TO_CHAR(fecha_cobro, 'YYYY-MM-DD') AS fecha_cobro,
        (fecha_cobro - CURRENT_DATE)::integer AS dias_para_cobro
    `;

    const client = await pool.connect();
    let membresiaActualizada;
    let pagoRegistrado;
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(updateQuery, [membresiaId, usuarioId]);

      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error: {
            code: 'MEMBRESIA_NO_ENCONTRADA',
            message: 'Membresía no encontrada',
          },
        });
      }

      membresiaActualizada = rows[0];

      const pagoRes = await client.query(
        `INSERT INTO pagos_membresia (membresia_id, fecha, monto)
         VALUES ($1, CURRENT_DATE, $2)
         RETURNING id, membresia_id, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, monto`,
        [membresiaId, membresiaActualizada.costo]
      );
      pagoRegistrado = pagoRes.rows[0];
      await client.query('COMMIT');
    } catch (txError) {
      await client.query('ROLLBACK').catch(() => {});
      throw txError;
    } finally {
      client.release();
    }

    return res.status(200).json({
      membresia: formatearMembresiaConDias(membresiaActualizada),
      pago: formatearPagoMembresia(pagoRegistrado),
    });
  } catch (error) {
    console.error('Error al marcar membresía como pagada:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo marcar la membresía como pagada',
      },
    });
  }
};

// GET /membresias/:id/pagos
const listarPagosMembresia = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const membresiaId = Number(req.params.id);

    if (
      !Number.isInteger(membresiaId) ||
      membresiaId <= 0 ||
      membresiaId > 2147483647
    ) {
      return res.status(404).json({
        error: {
          code: 'MEMBRESIA_NO_ENCONTRADA',
          message: 'Membresía no encontrada',
        },
      });
    }

    const memRes = await pool.query(
      'SELECT id FROM membresias WHERE id = $1 AND usuario_id = $2',
      [membresiaId, usuarioId]
    );

    if (memRes.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'MEMBRESIA_NO_ENCONTRADA',
          message: 'Membresía no encontrada',
        },
      });
    }

    const { rows } = await pool.query(
      `SELECT
        id,
        membresia_id,
        TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
        monto
       FROM pagos_membresia
       WHERE membresia_id = $1
       ORDER BY fecha DESC, id DESC`,
      [membresiaId]
    );

    return res.status(200).json(rows.map(formatearPagoMembresia));
  } catch (error) {
    console.error('Error al listar pagos de membresía:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo obtener el historial de pagos',
      },
    });
  }
};

module.exports = {
  crearMembresia,
  listarMembresias,
  actualizarMembresia,
  eliminarMembresia,
  pausarMembresia,
  reactivarMembresia,
  marcarMembresiaPagada,
  listarPagosMembresia,
};

