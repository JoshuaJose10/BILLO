const { pool } = require('../db');

const listarCategorias = async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, nombre FROM categorias ORDER BY id',
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