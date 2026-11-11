const { pool } = require('../db');

const esCostoValido = (costo) => {
  return (
    typeof costo === 'number' &&
    Number.isFinite(costo) &&
    costo >= 0.01 &&
    costo <= 9999999999.99 &&
    /^\d+(\.\d{1,2})?$/.test(String(costo))
  );
};

const validarDatosServicio = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      error: {
        code: 'NOMBRE_INVALIDO',
        message: 'Los datos del servicio son inválidos',
      },
    };
  }

  const { nombre, costo_sugerido, logo_url } = body;

  if (
    typeof nombre !== 'string' ||
    nombre.trim().length === 0 ||
    nombre.trim().length > 255
  ) {
    return {
      error: {
        code: 'NOMBRE_INVALIDO',
        message: 'El nombre del servicio es obligatorio y debe tener máximo 255 caracteres',
      },
    };
  }

  if (costo_sugerido === undefined || costo_sugerido === null || !esCostoValido(Number(costo_sugerido))) {
    return {
      error: {
        code: 'COSTO_INVALIDO',
        message: 'El costo sugerido debe ser un número mayor a 0 con máximo 2 decimales',
      },
    };
  }

  let logoLimpio = null;
  if (typeof logo_url === 'string' && logo_url.trim().length > 0) {
    logoLimpio = logo_url.trim().slice(0, 500);
  }

  return {
    datos: {
      nombre: nombre.trim(),
      costo_sugerido: Number(costo_sugerido),
      logo_url: logoLimpio,
    },
  };
};

// GET /catalogo
const listarCatalogo = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, logo_url, costo_sugerido FROM catalogo_servicios ORDER BY nombre ASC'
    );

    const catalogo = rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      logo_url: row.logo_url,
      costo_sugerido: Number(row.costo_sugerido),
    }));

    return res.status(200).json(catalogo);
  } catch (err) {
    console.error('Error al listar catálogo:', err.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo obtener el catálogo de servicios',
      },
    });
  }
};

// POST /catalogo (requiere admin)
const crearServicio = async (req, res) => {
  try {
    const validacion = validarDatosServicio(req.body);
    if (validacion.error) {
      return res.status(400).json({ error: validacion.error });
    }

    const { nombre, costo_sugerido, logo_url } = validacion.datos;

    // Verificar si ya existe un servicio con el mismo nombre
    const duplicado = await pool.query(
      'SELECT id FROM catalogo_servicios WHERE LOWER(nombre) = LOWER($1)',
      [nombre]
    );
    if (duplicado.rows.length > 0) {
      return res.status(400).json({
        error: {
          code: 'NOMBRE_INVALIDO',
          message: 'Ya existe un servicio con ese nombre en el catálogo',
        },
      });
    }

    const insertQuery = `
      INSERT INTO catalogo_servicios (nombre, logo_url, costo_sugerido)
      VALUES ($1, $2, $3)
      RETURNING id, nombre, logo_url, costo_sugerido
    `;

    const { rows } = await pool.query(insertQuery, [nombre, logo_url, costo_sugerido]);

    return res.status(201).json({
      servicio: {
        id: rows[0].id,
        nombre: rows[0].nombre,
        logo_url: rows[0].logo_url,
        costo_sugerido: Number(rows[0].costo_sugerido),
      },
    });
  } catch (err) {
    console.error('Error al crear servicio del catálogo:', err.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo registrar el servicio en el catálogo',
      },
    });
  }
};

// PUT /catalogo/:id (requiere admin)
const actualizarServicio = async (req, res) => {
  try {
    const servicioId = Number(req.params.id);
    if (!Number.isInteger(servicioId) || servicioId <= 0 || servicioId > 2147483647) {
      return res.status(404).json({
        error: {
          code: 'SERVICIO_NO_ENCONTRADO',
          message: 'Servicio no encontrado',
        },
      });
    }

    const validacion = validarDatosServicio(req.body);
    if (validacion.error) {
      return res.status(400).json({ error: validacion.error });
    }

    const { nombre, costo_sugerido, logo_url } = validacion.datos;

    // Verificar que otro servicio no tenga ya ese nombre
    const duplicado = await pool.query(
      'SELECT id FROM catalogo_servicios WHERE LOWER(nombre) = LOWER($1) AND id <> $2',
      [nombre, servicioId]
    );
    if (duplicado.rows.length > 0) {
      return res.status(400).json({
        error: {
          code: 'NOMBRE_INVALIDO',
          message: 'Ya existe otro servicio con ese nombre en el catálogo',
        },
      });
    }

    const updateQuery = `
      UPDATE catalogo_servicios
      SET nombre = $1, logo_url = $2, costo_sugerido = $3
      WHERE id = $4
      RETURNING id, nombre, logo_url, costo_sugerido
    `;

    const { rows } = await pool.query(updateQuery, [
      nombre,
      logo_url,
      costo_sugerido,
      servicioId,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'SERVICIO_NO_ENCONTRADO',
          message: 'Servicio no encontrado',
        },
      });
    }

    return res.status(200).json({
      servicio: {
        id: rows[0].id,
        nombre: rows[0].nombre,
        logo_url: rows[0].logo_url,
        costo_sugerido: Number(rows[0].costo_sugerido),
      },
    });
  } catch (err) {
    console.error('Error al actualizar servicio del catálogo:', err.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo actualizar el servicio',
      },
    });
  }
};

// DELETE /catalogo/:id (requiere admin)
const eliminarServicio = async (req, res) => {
  try {
    const servicioId = Number(req.params.id);
    if (!Number.isInteger(servicioId) || servicioId <= 0 || servicioId > 2147483647) {
      return res.status(404).json({
        error: {
          code: 'SERVICIO_NO_ENCONTRADO',
          message: 'Servicio no encontrado',
        },
      });
    }

    // Verificar si el servicio está en uso por alguna membresía
    const enUso = await pool.query(
      'SELECT 1 FROM membresias WHERE servicio_id = $1 LIMIT 1',
      [servicioId]
    );
    if (enUso.rows.length > 0) {
      return res.status(409).json({
        error: {
          code: 'SERVICIO_EN_USO',
          message: 'No se puede eliminar un servicio que está en uso por membresías',
        },
      });
    }

    const deleteQuery = `
      DELETE FROM catalogo_servicios
      WHERE id = $1
      RETURNING id
    `;

    const { rows } = await pool.query(deleteQuery, [servicioId]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'SERVICIO_NO_ENCONTRADO',
          message: 'Servicio no encontrado',
        },
      });
    }

    return res.status(200).json({ eliminado: true });
  } catch (err) {
    console.error('Error al eliminar servicio del catálogo:', err.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo eliminar el servicio',
      },
    });
  }
};

module.exports = {
  listarCatalogo,
  crearServicio,
  actualizarServicio,
  eliminarServicio,
};
