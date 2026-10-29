const { pool } = require('../db');

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

module.exports = { listarCatalogo };
