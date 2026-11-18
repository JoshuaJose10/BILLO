const { pool } = require('../db');

const BOM_UTF8 = '\uFEFF';
const ENCABEZADO_CSV = [
  'tipo',
  'fecha',
  'descripción',
  'categoría/fuente',
  'monto',
  'moneda',
  'método de pago',
];

const esMesValido = (mesStr) => {
  return typeof mesStr === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(mesStr);
};

const escaparCeldaCsv = (valor) => {
  if (valor === null || valor === undefined) {
    return '';
  }
  let texto = String(valor);
  // Las comillas CSV no impiden que Excel evalúe una celda como fórmula.
  if (/^\s*[-=+@]|^[\t\r\n]/.test(texto)) {
    texto = `'${texto}`;
  }
  if (/[",\r\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
};

const formatearFilaCsv = (campos) => campos.map(escaparCeldaCsv).join(',');

// GET /exportar?formato=csv&mes=YYYY-MM
const exportarDatos = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const { formato, mes } = req.query;

    if (
      formato !== undefined &&
      (typeof formato !== 'string' || formato.trim().toLowerCase() !== 'csv')
    ) {
      return res.status(400).json({
        error: {
          code: 'FORMATO_INVALIDO',
          message: 'El formato de exportación debe ser csv',
        },
      });
    }

    let mesFiltro = null;
    if (mes !== undefined) {
      if (!esMesValido(mes)) {
        return res.status(400).json({
          error: {
            code: 'MES_INVALIDO',
            message: 'El formato del mes debe ser YYYY-MM',
          },
        });
      }
      mesFiltro = mes;
    }

    const [gastosRes, ingresosRes, membresiasRes] = await Promise.all([
      pool.query(
        `SELECT
           TO_CHAR(g.fecha, 'YYYY-MM-DD') AS fecha,
           COALESCE(g.nota, '') AS descripcion,
           COALESCE(c.nombre, '') AS categoria_fuente,
           COALESCE(g.monto_original, g.monto) AS monto,
           CASE WHEN g.monto_original IS NULL THEN 'MXN'
                ELSE COALESCE(g.moneda, 'MXN') END AS moneda,
           COALESCE(g.metodo_pago, '') AS metodo_pago
         FROM gastos g
         LEFT JOIN categorias c ON c.id = g.categoria_id
         WHERE g.usuario_id = $1
           AND ($2::text IS NULL OR TO_CHAR(g.fecha, 'YYYY-MM') = $2)
         ORDER BY g.fecha DESC, g.id DESC`,
        [usuarioId, mesFiltro]
      ),
      pool.query(
        `SELECT
           TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
           COALESCE(descripcion, '') AS descripcion,
           COALESCE(fuente, '') AS categoria_fuente,
           monto,
           'MXN' AS moneda,
           '' AS metodo_pago
         FROM ingresos
         WHERE usuario_id = $1
           AND ($2::text IS NULL OR TO_CHAR(fecha, 'YYYY-MM') = $2)
         ORDER BY fecha DESC, id DESC`,
        [usuarioId, mesFiltro]
      ),
      pool.query(
        `SELECT
           TO_CHAR(fecha_cobro, 'YYYY-MM-DD') AS fecha,
           nombre AS descripcion,
           frecuencia AS categoria_fuente,
           COALESCE(monto_original, costo) AS monto,
           CASE WHEN monto_original IS NULL THEN 'MXN'
                ELSE COALESCE(moneda, 'MXN') END AS moneda,
           CASE WHEN tarjeta_id IS NOT NULL THEN 'tarjeta' ELSE '' END AS metodo_pago
         FROM membresias
         WHERE usuario_id = $1
           AND ($2::text IS NULL OR TO_CHAR(fecha_cobro, 'YYYY-MM') = $2)
         ORDER BY fecha_cobro DESC, id DESC`,
        [usuarioId, mesFiltro]
      ),
    ]);

    const filas = [
      ...gastosRes.rows.map((r) => ({
        tipo: 'gasto',
        fecha: r.fecha,
        descripcion: r.descripcion,
        categoria_fuente: r.categoria_fuente,
        monto: Number(r.monto).toFixed(2),
        moneda: r.moneda,
        metodo_pago: r.metodo_pago,
      })),
      ...ingresosRes.rows.map((r) => ({
        tipo: 'ingreso',
        fecha: r.fecha,
        descripcion: r.descripcion,
        categoria_fuente: r.categoria_fuente,
        monto: Number(r.monto).toFixed(2),
        moneda: r.moneda,
        metodo_pago: r.metodo_pago,
      })),
      ...membresiasRes.rows.map((r) => ({
        tipo: 'suscripcion',
        fecha: r.fecha,
        descripcion: r.descripcion,
        categoria_fuente: r.categoria_fuente,
        monto: Number(r.monto).toFixed(2),
        moneda: r.moneda,
        metodo_pago: r.metodo_pago,
      })),
    ];

    const lineas = [
      formatearFilaCsv(ENCABEZADO_CSV),
      ...filas.map((f) =>
        formatearFilaCsv([
          f.tipo,
          f.fecha,
          f.descripcion,
          f.categoria_fuente,
          f.monto,
          f.moneda,
          f.metodo_pago,
        ])
      ),
    ];

    const nombreArchivo = mesFiltro
      ? `billo-datos-${mesFiltro}.csv`
      : 'billo-datos.csv';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${nombreArchivo}"`
    );

    return res.status(200).send(`${BOM_UTF8}${lineas.join('\r\n')}\r\n`);
  } catch (error) {
    console.error('Error al exportar datos CSV:', error.message);
    return res.status(500).json({
      error: {
        code: 'ERROR_SERVIDOR',
        message: 'No se pudieron exportar los datos',
      },
    });
  }
};

module.exports = {
  BOM_UTF8,
  ENCABEZADO_CSV,
  exportarDatos,
};
