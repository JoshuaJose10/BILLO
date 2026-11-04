const { pool } = require('../db');

const esMesValido = (mesStr) => {
  return typeof mesStr === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(mesStr);
};

// GET /reportes/por-categoria?mes=YYYY-MM
const obtenerGastosPorCategoria = async (req, res) => {
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

    const query = `
      SELECT
        c.id AS categoria_id,
        c.nombre AS categoria,
        SUM(g.monto) AS total
      FROM gastos g
      INNER JOIN categorias c ON c.id = g.categoria_id
      WHERE g.usuario_id = $1
        AND TO_CHAR(g.fecha, 'YYYY-MM') = $2
      GROUP BY c.id, c.nombre
      ORDER BY total DESC, c.id ASC
    `;

    const { rows } = await pool.query(query, [usuarioId, mes]);

    if (rows.length === 0) {
      return res.status(200).json([]);
    }

    const granTotal = rows.reduce((acc, row) => acc + Number(row.total), 0);

    const resultado = rows.map((row) => {
      const total = Number(row.total);
      const porcentaje =
        granTotal > 0 ? Math.round((total * 100) / granTotal) : 0;
      return {
        categoria_id: row.categoria_id,
        categoria: row.categoria,
        total,
        porcentaje,
      };
    });

    if (resultado.length > 0 && granTotal > 0) {
      const sumaPorcentajes = resultado.reduce(
        (acc, item) => acc + item.porcentaje,
        0
      );
      resultado[0].porcentaje += 100 - sumaPorcentajes;
    }

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Error al obtener reporte por categoría:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudo obtener el reporte por categoría',
      },
    });
  }
};

module.exports = {
  obtenerGastosPorCategoria,
};

