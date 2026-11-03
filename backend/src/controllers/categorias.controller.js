const { pool } = require('../db');

const TIPOS_VALIDOS = ['gasto', 'membresia'];

const listarCategorias = async (req, res) => {
  try {
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

      const { rows } = await pool.query(
        'SELECT id, nombre, tipo, es_predefinida FROM categorias WHERE tipo = $1 ORDER BY id',
        [tipo]
      );
      return res.status(200).json(rows);
    }

    const { rows } = await pool.query(
      'SELECT id, nombre, tipo, es_predefinida FROM categorias ORDER BY id'
    );
    return res.status(200).json(rows);
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

module.exports = { listarCategorias };
