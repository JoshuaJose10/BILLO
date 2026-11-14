const { pool } = require('../db');
const { esCategoriaDisponibleParaUsuario } = require('./categorias.controller');

const esMesValido = (mesStr) => {
  return typeof mesStr === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(mesStr);
};

const esMontoValido = (monto) => {
  return (
    typeof monto === 'number' &&
    Number.isFinite(monto) &&
    monto >= 0.01 &&
    /^\d{1,10}(\.\d{1,2})?$/.test(String(monto))
  );
};

const formatearPresupuesto = (row) => ({
  id: row.id,
  categoria_id: row.categoria_id,
  mes: typeof row.mes === 'string' ? row.mes.trim() : row.mes,
  monto_limite: Number(row.monto_limite),
});

// Consulta compartida entre GET /presupuestos (HU-24) y el cálculo de alerta en gastos (HU-25)
const consultarEstadoPresupuestos = async (
  usuarioId,
  mes,
  categoriaId = null
) => {
  const query = `
    SELECT
      p.id,
      p.categoria_id,
      c.nombre AS categoria,
      TRIM(p.mes) AS mes,
      p.monto_limite,
      GREATEST(COALESCE(SUM(g.monto), 0), 0) AS gastado,
      GREATEST(ROUND((COALESCE(SUM(g.monto), 0) * 100.0) / p.monto_limite), 0) AS porcentaje,
      CASE
        WHEN COALESCE(SUM(g.monto), 0) > p.monto_limite THEN 'excedido'
        WHEN COALESCE(SUM(g.monto), 0) * 100 >= p.monto_limite * 80 THEN 'alerta'
        ELSE 'ok'
      END AS estado
    FROM presupuestos p
    INNER JOIN categorias c ON c.id = p.categoria_id
    LEFT JOIN gastos g
      ON g.usuario_id = p.usuario_id
      AND g.categoria_id = p.categoria_id
      AND TO_CHAR(g.fecha, 'YYYY-MM') = TRIM(p.mes)
    WHERE p.usuario_id = $1
      AND TRIM(p.mes) = $2
      AND ($3::int IS NULL OR p.categoria_id = $3)
    GROUP BY p.id, p.categoria_id, c.nombre, p.mes, p.monto_limite
    ORDER BY p.id ASC
  `;

  const { rows } = await pool.query(query, [usuarioId, mes, categoriaId]);

  return rows.map((row) => {
    const gastado = Math.max(0, Number(row.gastado) || 0);
    const porcentaje = Math.max(0, Number(row.porcentaje) || 0);
    return {
      id: row.id,
      categoria_id: row.categoria_id,
      categoria: row.categoria,
      mes: row.mes,
      monto_limite: Number(row.monto_limite),
      gastado,
      porcentaje,
      estado: row.estado,
    };
  });
};

// Calcula la alerta de presupuesto tras crear o actualizar un gasto; nunca lanza excepción para no impedir que el gasto se guarde
const calcularAlertaPresupuesto = async (usuarioId, categoriaId, fecha) => {
  try {
    const mes = typeof fecha === 'string' ? fecha.slice(0, 7) : '';
    if (!esMesValido(mes)) {
      return null;
    }

    const presupuestos = await consultarEstadoPresupuestos(
      usuarioId,
      mes,
      categoriaId
    );
    if (presupuestos.length === 0) {
      return null;
    }

    const { categoria_id, porcentaje, estado } = presupuestos[0];
    if (estado === 'alerta' || estado === 'excedido') {
      return {
        categoria_id,
        porcentaje,
        estado,
      };
    }

    return null;
  } catch (error) {
    console.error('Error al calcular alerta de presupuesto:', error.message);
    return null;
  }
};

// POST /presupuestos
const crearPresupuesto = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { categoria_id, mes, monto_limite } =
      req.body && typeof req.body === 'object' ? req.body : {};

    if (!esMontoValido(monto_limite)) {
      return res.status(400).json({
        error: {
          code: 'MONTO_INVALIDO',
          message: 'El monto límite debe ser un número mayor a 0',
        },
      });
    }

    if (!esMesValido(mes)) {
      return res.status(400).json({
        error: {
          code: 'MES_INVALIDO',
          message: 'El formato del mes debe ser YYYY-MM',
        },
      });
    }

    if (
      typeof categoria_id !== 'number' ||
      !Number.isInteger(categoria_id) ||
      categoria_id <= 0 ||
      categoria_id > 2147483647
    ) {
      return res.status(400).json({
        error: {
          code: 'CATEGORIA_INEXISTENTE',
          message: 'La categoría seleccionada no existe',
        },
      });
    }

    const catDisponible = await esCategoriaDisponibleParaUsuario(
      usuarioId,
      categoria_id
    );
    if (!catDisponible) {
      return res.status(400).json({
        error: {
          code: 'CATEGORIA_INEXISTENTE',
          message: 'La categoría seleccionada no existe',
        },
      });
    }

    const insertQuery = `
      INSERT INTO presupuestos (usuario_id, categoria_id, monto_limite, mes)
      VALUES ($1, $2, $3, $4)
      RETURNING id, categoria_id, TRIM(mes) AS mes, monto_limite
    `;

    const { rows } = await pool.query(insertQuery, [
      usuarioId,
      categoria_id,
      monto_limite,
      mes,
    ]);

    return res.status(201).json({
      presupuesto: formatearPresupuesto(rows[0]),
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: {
          code: 'PRESUPUESTO_DUPLICADO',
          message: 'Ya existe un presupuesto para esa categoría y mes',
        },
      });
    }
    console.error('Error al crear presupuesto:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo registrar el presupuesto',
      },
    });
  }
};

// GET /presupuestos?mes=YYYY-MM
const listarPresupuestos = async (req, res) => {
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

    const resultado = await consultarEstadoPresupuestos(usuarioId, mes);
    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Error al listar presupuestos:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudieron obtener los presupuestos',
      },
    });
  }
};

// PUT /presupuestos/:id
const actualizarPresupuesto = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const presupuestoId = Number(req.params.id);

    if (
      !Number.isInteger(presupuestoId) ||
      presupuestoId <= 0 ||
      presupuestoId > 2147483647
    ) {
      return res.status(404).json({
        error: {
          code: 'PRESUPUESTO_NO_ENCONTRADO',
          message: 'Presupuesto no encontrado',
        },
      });
    }

    const { monto_limite } =
      req.body && typeof req.body === 'object' ? req.body : {};

    if (!esMontoValido(monto_limite)) {
      return res.status(400).json({
        error: {
          code: 'MONTO_INVALIDO',
          message: 'El monto límite debe ser un número mayor a 0',
        },
      });
    }

    const updateQuery = `
      UPDATE presupuestos
      SET monto_limite = $3
      WHERE id = $1 AND usuario_id = $2
      RETURNING id, categoria_id, TRIM(mes) AS mes, monto_limite
    `;

    const { rows } = await pool.query(updateQuery, [
      presupuestoId,
      usuarioId,
      monto_limite,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'PRESUPUESTO_NO_ENCONTRADO',
          message: 'Presupuesto no encontrado',
        },
      });
    }

    return res.status(200).json({
      presupuesto: formatearPresupuesto(rows[0]),
    });
  } catch (error) {
    console.error('Error al actualizar presupuesto:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo actualizar el presupuesto',
      },
    });
  }
};

// DELETE /presupuestos/:id
const eliminarPresupuesto = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const presupuestoId = Number(req.params.id);

    if (
      !Number.isInteger(presupuestoId) ||
      presupuestoId <= 0 ||
      presupuestoId > 2147483647
    ) {
      return res.status(404).json({
        error: {
          code: 'PRESUPUESTO_NO_ENCONTRADO',
          message: 'Presupuesto no encontrado',
        },
      });
    }

    const deleteQuery = `
      DELETE FROM presupuestos
      WHERE id = $1 AND usuario_id = $2
      RETURNING id
    `;

    const { rows } = await pool.query(deleteQuery, [presupuestoId, usuarioId]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'PRESUPUESTO_NO_ENCONTRADO',
          message: 'Presupuesto no encontrado',
        },
      });
    }

    return res.status(200).json({ eliminado: true });
  } catch (error) {
    console.error('Error al eliminar presupuesto:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo eliminar el presupuesto',
      },
    });
  }
};

// POST /presupuestos/copiar
const copiarPresupuestos = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { desde, hasta } =
      req.body && typeof req.body === 'object' ? req.body : {};

    if (!esMesValido(desde) || !esMesValido(hasta) || desde === hasta) {
      return res.status(400).json({
        error: {
          code: 'MES_INVALIDO',
          message:
            !esMesValido(desde) || !esMesValido(hasta)
              ? 'Los meses desde y hasta deben tener el formato YYYY-MM'
              : 'El mes origen y el mes destino deben ser distintos',
        },
      });
    }

    const origenResult = await pool.query(
      `SELECT id
       FROM presupuestos
       WHERE usuario_id = $1 AND TRIM(mes) = $2
       ORDER BY id ASC`,
      [usuarioId, desde]
    );

    if (origenResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'SIN_PRESUPUESTOS_ORIGEN',
          message: 'No hay presupuestos en el mes anterior para copiar',
        },
      });
    }

    const insertResult = await pool.query(
      `INSERT INTO presupuestos (usuario_id, categoria_id, monto_limite, mes)
       SELECT usuario_id, categoria_id, monto_limite, $3
       FROM presupuestos
       WHERE usuario_id = $1 AND TRIM(mes) = $2
       ORDER BY id ASC
       ON CONFLICT (usuario_id, categoria_id, mes) DO NOTHING
       RETURNING id, categoria_id, TRIM(mes) AS mes, monto_limite`,
      [usuarioId, desde, hasta]
    );

    const creados = insertResult.rows.map(formatearPresupuesto);
    const status = creados.length > 0 ? 201 : 200;

    return res.status(status).json({
      presupuestos: creados,
      copiados: creados.length,
    });
  } catch (error) {
    console.error('Error al copiar presupuestos:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudieron copiar los presupuestos',
      },
    });
  }
};

module.exports = {
  crearPresupuesto,
  listarPresupuestos,
  actualizarPresupuesto,
  eliminarPresupuesto,
  copiarPresupuestos,
  consultarEstadoPresupuestos,
  calcularAlertaPresupuesto,
};
