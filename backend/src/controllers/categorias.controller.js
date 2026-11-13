const { pool } = require('../db');

const TIPOS_VALIDOS = ['gasto', 'membresia'];
const MAX_CATEGORIAS_PROPIAS = 30;
const MAX_LONGITUD_NOMBRE = 40;
const MAX_INT32 = 2147483647;

const PALETA_COLORES_CATEGORIAS = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#84CC16',
  '#10B981',
  '#14B8A6',
  '#06B6D4',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#F43F5E',
];

const parsearIdPositivo = (valor) => {
  const num = Number(valor);
  if (!Number.isInteger(num) || num <= 0 || num > MAX_INT32) {
    return null;
  }
  return num;
};

const validarNombreCategoria = (nombre) => {
  if (typeof nombre !== 'string') {
    return null;
  }
  const limpio = nombre.trim();
  if (limpio.length === 0 || limpio.length > MAX_LONGITUD_NOMBRE) {
    return null;
  }
  return limpio;
};

const formatearCategoria = (fila) => {
  const propia = fila.usuario_id !== null && fila.usuario_id !== undefined;
  return {
    id: fila.id,
    nombre: fila.nombre,
    tipo: fila.tipo,
    es_predefinida: Boolean(fila.es_predefinida),
    propia,
    color: fila.color ?? null,
  };
};

const esCategoriaDisponibleParaUsuario = async (
  usuarioId,
  categoriaId,
  client = pool
) => {
  if (
    typeof categoriaId !== 'number' ||
    !Number.isInteger(categoriaId) ||
    categoriaId <= 0 ||
    categoriaId > MAX_INT32
  ) {
    return null;
  }

  const { rows } = await client.query(
    `SELECT c.id, c.nombre, c.tipo, c.es_predefinida, c.usuario_id, c.color
     FROM categorias c
     WHERE c.id = $1
       AND (
         c.usuario_id = $2
         OR (
           c.es_predefinida = TRUE
           AND c.usuario_id IS NULL
           AND EXISTS (
             SELECT 1
             FROM usuario_categorias uc
             WHERE uc.usuario_id = $2 AND uc.categoria_id = c.id
           )
         )
       )`,
    [categoriaId, usuarioId]
  );

  return rows[0] || null;
};

const consultarCategoriasDisponibles = async (
  usuarioId,
  tipo = null,
  client = pool
) => {
  const condiciones = [
    `(
      c.usuario_id = $1
      OR (
        c.es_predefinida = TRUE
        AND c.usuario_id IS NULL
        AND EXISTS (
          SELECT 1
          FROM usuario_categorias uc
          WHERE uc.usuario_id = $1 AND uc.categoria_id = c.id
        )
      )
    )`,
  ];
  const valores = [usuarioId];

  if (tipo !== null) {
    valores.push(tipo);
    condiciones.push(`c.tipo = $${valores.length}`);
  }

  const { rows } = await client.query(
    `SELECT c.id, c.nombre, c.tipo, c.es_predefinida, c.usuario_id, c.color
     FROM categorias c
     WHERE ${condiciones.join(' AND ')}
     ORDER BY c.id ASC`,
    valores
  );

  return rows.map(formatearCategoria);
};

// GET /categorias
const listarCategorias = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { tipo } = req.query;

    if (tipo !== undefined) {
      if (typeof tipo !== 'string' || !TIPOS_VALIDOS.includes(tipo)) {
        return res.status(400).json({
          error: {
            code: 'TIPO_INVALIDO',
            message: 'El tipo de categoría debe ser gasto o membresia',
          },
        });
      }

      const categorias = await consultarCategoriasDisponibles(usuarioId, tipo);
      return res.status(200).json(categorias);
    }

    const categorias = await consultarCategoriasDisponibles(usuarioId);
    return res.status(200).json(categorias);
  } catch (err) {
    console.error('Error al listar categorías:', err.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudieron obtener las categorías',
      },
    });
  }
};

// GET /categorias/predefinidas
const listarCategoriasPredefinidas = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { rows } = await pool.query(
      `SELECT
         c.id,
         c.nombre,
         c.tipo,
         c.es_predefinida,
         c.color,
         (uc.categoria_id IS NOT NULL) AS seleccionada
       FROM categorias c
       LEFT JOIN usuario_categorias uc
         ON uc.categoria_id = c.id AND uc.usuario_id = $1
       WHERE c.es_predefinida = TRUE AND c.usuario_id IS NULL
       ORDER BY c.id ASC`,
      [usuarioId]
    );

    const categorias = rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      tipo: row.tipo,
      es_predefinida: Boolean(row.es_predefinida),
      propia: false,
      color: row.color ?? null,
      seleccionada: Boolean(row.seleccionada),
    }));

    return res.status(200).json({ categorias });
  } catch (err) {
    console.error('Error al listar categorías predefinidas:', err.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudieron obtener las categorías predefinidas',
      },
    });
  }
};

// PUT /categorias/seleccion
const actualizarSeleccionCategorias = async (req, res) => {
  const usuarioId = req.usuario.id;
  const { categoria_ids } =
    req.body && typeof req.body === 'object' ? req.body : {};

  if (!Array.isArray(categoria_ids) || categoria_ids.length === 0) {
    return res.status(400).json({
      error: {
        code: 'SELECCION_VACIA',
        message: 'Debes seleccionar al menos una categoría predefinida',
      },
    });
  }

  for (const id of categoria_ids) {
    if (
      typeof id !== 'number' ||
      !Number.isInteger(id) ||
      id <= 0 ||
      id > MAX_INT32
    ) {
      return res.status(400).json({
        error: {
          code: 'CATEGORIA_INEXISTENTE',
          message:
            'Una o más categorías seleccionadas no existen o no son predefinidas',
        },
      });
    }
  }

  const idsUnicos = [...new Set(categoria_ids)];
  const client = await pool.connect();

  try {
    const validacion = await client.query(
      `SELECT id
       FROM categorias
       WHERE id = ANY($1::int[])
         AND es_predefinida = TRUE
         AND usuario_id IS NULL`,
      [idsUnicos]
    );

    if (validacion.rows.length !== idsUnicos.length) {
      return res.status(400).json({
        error: {
          code: 'CATEGORIA_INEXISTENTE',
          message:
            'Una o más categorías seleccionadas no existen o no son predefinidas',
        },
      });
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM usuario_categorias WHERE usuario_id = $1', [
      usuarioId,
    ]);
    await client.query(
      `INSERT INTO usuario_categorias (usuario_id, categoria_id)
       SELECT $1, UNNEST($2::int[])`,
      [usuarioId, idsUnicos]
    );
    await client.query(
      'UPDATE usuarios SET categorias_configuradas = TRUE WHERE id = $1',
      [usuarioId]
    );
    await client.query('COMMIT');

    const categorias = await consultarCategoriasDisponibles(
      usuarioId,
      null,
      client
    );

    return res.status(200).json({
      categoria_ids: idsUnicos,
      categorias_configuradas: true,
      categorias,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error al actualizar selección de categorías:', err.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo actualizar la selección de categorías',
      },
    });
  } finally {
    client.release();
  }
};

// POST /categorias
const crearCategoriaPropia = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { nombre } =
      req.body && typeof req.body === 'object' ? req.body : {};

    const nombreLimpio = validarNombreCategoria(nombre);
    if (!nombreLimpio) {
      return res.status(400).json({
        error: {
          code: 'NOMBRE_INVALIDO',
          message:
            'El nombre de la categoría es obligatorio y debe tener entre 1 y 40 caracteres',
        },
      });
    }

    const duplicada = await pool.query(
      `SELECT id
       FROM categorias
       WHERE usuario_id = $1 AND LOWER(nombre) = LOWER($2)
       LIMIT 1`,
      [usuarioId, nombreLimpio]
    );

    if (duplicada.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'CATEGORIA_DUPLICADA',
          message: 'Ya tienes una categoría con ese nombre',
        },
      });
    }

    const conteoResult = await pool.query(
      'SELECT COUNT(*)::int AS total FROM categorias WHERE usuario_id = $1',
      [usuarioId]
    );
    const totalPropias = conteoResult.rows[0].total;

    if (totalPropias >= MAX_CATEGORIAS_PROPIAS) {
      return res.status(400).json({
        error: {
          code: 'LIMITE_CATEGORIAS_ALCANZADO',
          message: `Has alcanzado el límite máximo de ${MAX_CATEGORIAS_PROPIAS} categorías propias`,
        },
      });
    }

    const ultimaResult = await pool.query(
      `SELECT color
       FROM categorias
       WHERE usuario_id = $1
       ORDER BY id DESC
       LIMIT 1`,
      [usuarioId]
    );

    let indiceColor = 0;
    if (ultimaResult.rows.length > 0 && ultimaResult.rows[0].color) {
      const idxAnterior = PALETA_COLORES_CATEGORIAS.indexOf(
        ultimaResult.rows[0].color
      );
      indiceColor =
        idxAnterior >= 0
          ? (idxAnterior + 1) % PALETA_COLORES_CATEGORIAS.length
          : totalPropias % PALETA_COLORES_CATEGORIAS.length;
    }

    const colorAsignado = PALETA_COLORES_CATEGORIAS[indiceColor];

    const { rows } = await pool.query(
      `INSERT INTO categorias (nombre, tipo, es_predefinida, usuario_id, color)
       VALUES ($1, 'gasto', FALSE, $2, $3)
       RETURNING id, nombre, tipo, es_predefinida, usuario_id, color`,
      [nombreLimpio, usuarioId, colorAsignado]
    );

    return res.status(201).json({
      categoria: formatearCategoria(rows[0]),
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        error: {
          code: 'CATEGORIA_DUPLICADA',
          message: 'Ya tienes una categoría con ese nombre',
        },
      });
    }
    console.error('Error al crear categoría propia:', err.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo crear la categoría',
      },
    });
  }
};

// PUT /categorias/:id
const actualizarCategoriaPropia = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const categoriaId = parsearIdPositivo(req.params.id);

    if (!categoriaId) {
      return res.status(404).json({
        error: {
          code: 'CATEGORIA_NO_ENCONTRADA',
          message: 'Categoría no encontrada',
        },
      });
    }

    const existente = await pool.query(
      `SELECT id, nombre, tipo, es_predefinida, usuario_id, color
       FROM categorias
       WHERE id = $1`,
      [categoriaId]
    );

    const cat = existente.rows[0];
    if (!cat || cat.es_predefinida || cat.usuario_id !== usuarioId) {
      return res.status(404).json({
        error: {
          code: 'CATEGORIA_NO_ENCONTRADA',
          message: 'Categoría no encontrada',
        },
      });
    }

    const { nombre } =
      req.body && typeof req.body === 'object' ? req.body : {};
    const nombreLimpio = validarNombreCategoria(nombre);

    if (!nombreLimpio) {
      return res.status(400).json({
        error: {
          code: 'NOMBRE_INVALIDO',
          message:
            'El nombre de la categoría es obligatorio y debe tener entre 1 y 40 caracteres',
        },
      });
    }

    const duplicada = await pool.query(
      `SELECT id
       FROM categorias
       WHERE usuario_id = $1 AND LOWER(nombre) = LOWER($2) AND id <> $3
       LIMIT 1`,
      [usuarioId, nombreLimpio, categoriaId]
    );

    if (duplicada.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'CATEGORIA_DUPLICADA',
          message: 'Ya tienes una categoría con ese nombre',
        },
      });
    }

    const { rows } = await pool.query(
      `UPDATE categorias
       SET nombre = $1
       WHERE id = $2 AND usuario_id = $3
       RETURNING id, nombre, tipo, es_predefinida, usuario_id, color`,
      [nombreLimpio, categoriaId, usuarioId]
    );

    return res.status(200).json({
      categoria: formatearCategoria(rows[0]),
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({
        error: {
          code: 'CATEGORIA_DUPLICADA',
          message: 'Ya tienes una categoría con ese nombre',
        },
      });
    }
    console.error('Error al actualizar categoría propia:', err.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo actualizar la categoría',
      },
    });
  }
};

// DELETE /categorias/:id
const eliminarCategoriaPropia = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const categoriaId = parsearIdPositivo(req.params.id);

    if (!categoriaId) {
      return res.status(404).json({
        error: {
          code: 'CATEGORIA_NO_ENCONTRADA',
          message: 'Categoría no encontrada',
        },
      });
    }

    const existente = await pool.query(
      `SELECT id, usuario_id, es_predefinida
       FROM categorias
       WHERE id = $1`,
      [categoriaId]
    );

    const cat = existente.rows[0];
    if (!cat || cat.es_predefinida || cat.usuario_id !== usuarioId) {
      return res.status(404).json({
        error: {
          code: 'CATEGORIA_NO_ENCONTRADA',
          message: 'Categoría no encontrada',
        },
      });
    }

    const usoResult = await pool.query(
      `SELECT
         EXISTS (SELECT 1 FROM gastos WHERE categoria_id = $1) AS tiene_gastos,
         EXISTS (SELECT 1 FROM presupuestos WHERE categoria_id = $1) AS tiene_presupuestos`,
      [categoriaId]
    );

    const { tiene_gastos, tiene_presupuestos } = usoResult.rows[0];
    if (tiene_gastos || tiene_presupuestos) {
      return res.status(409).json({
        error: {
          code: 'CATEGORIA_EN_USO',
          message:
            'No se puede eliminar la categoría porque tiene gastos o presupuestos asociados',
        },
      });
    }

    await pool.query(
      'DELETE FROM categorias WHERE id = $1 AND usuario_id = $2',
      [categoriaId, usuarioId]
    );

    return res.status(200).json({ eliminado: true });
  } catch (err) {
    console.error('Error al eliminar categoría propia:', err.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo eliminar la categoría',
      },
    });
  }
};

module.exports = {
  PALETA_COLORES_CATEGORIAS,
  MAX_CATEGORIAS_PROPIAS,
  esCategoriaDisponibleParaUsuario,
  listarCategorias,
  listarCategoriasPredefinidas,
  actualizarSeleccionCategorias,
  crearCategoriaPropia,
  actualizarCategoriaPropia,
  eliminarCategoriaPropia,
};
