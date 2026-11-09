const URL_FUENTE_DEFAULT = 'https://api.frankfurter.dev/v1/latest';
const DURACION_CACHE_MS = 5 * 60 * 1000;
const TIEMPO_MAXIMO_MS = 5000;

const MONEDAS_SOPORTADAS = new Set([
  'AUD',
  'BGN',
  'BRL',
  'CAD',
  'CHF',
  'CNY',
  'CZK',
  'DKK',
  'EUR',
  'GBP',
  'HKD',
  'HUF',
  'IDR',
  'ILS',
  'INR',
  'ISK',
  'JPY',
  'KRW',
  'MXN',
  'MYR',
  'NOK',
  'NZD',
  'PHP',
  'PLN',
  'RON',
  'SEK',
  'SGD',
  'THB',
  'TRY',
  'USD',
  'ZAR',
]);

const cache = new Map();

const esMonedaValida = (codigo) =>
  typeof codigo === 'string' && MONEDAS_SOPORTADAS.has(codigo);

const limpiarCacheTipoCambio = () => {
  cache.clear();
};

// GET /divisas/tipo-cambio?moneda=USD
const obtenerTipoCambio = async (req, res) => {
  const { moneda } = req.query;

  if (!esMonedaValida(moneda) || moneda === 'MXN') {
    return res.status(400).json({
      error: {
        code: 'MONEDA_INVALIDA',
        message:
          'La moneda debe ser un código de 3 letras soportado distinto de MXN',
      },
    });
  }

  const guardado = cache.get(moneda);
  if (guardado && Date.now() - guardado.consultadoEn < DURACION_CACHE_MS) {
    return res.status(200).json(guardado.datos);
  }

  const urlFuente = process.env.TIPO_CAMBIO_URL || URL_FUENTE_DEFAULT;

  try {
    const respuesta = await fetch(`${urlFuente}?base=${moneda}&symbols=MXN`, {
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });

    if (respuesta.status === 404) {
      return res.status(400).json({
        error: {
          code: 'MONEDA_INVALIDA',
          message: 'La moneda solicitada no está soportada',
        },
      });
    }

    if (!respuesta.ok) {
      throw new Error(`La fuente respondió ${respuesta.status}`);
    }

    const cuerpo = await respuesta.json();
    const tasa = cuerpo?.rates?.MXN;
    if (typeof tasa !== 'number' || !Number.isFinite(tasa) || tasa <= 0) {
      throw new Error('La fuente no devolvió una tasa válida');
    }

    const tipo_cambio = Number(tasa.toFixed(6));
    const datos = {
      moneda,
      tipo_cambio,
      fecha: cuerpo.date,
    };

    cache.set(moneda, { datos, consultadoEn: Date.now() });
    return res.status(200).json(datos);
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Error al consultar el tipo de cambio:', err.message);
    }
    return res.status(502).json({
      error: {
        code: 'FUENTE_NO_DISPONIBLE',
        message: 'No se pudo obtener el tipo de cambio',
      },
    });
  }
};

module.exports = {
  MONEDAS_SOPORTADAS,
  esMonedaValida,
  limpiarCacheTipoCambio,
  obtenerTipoCambio,
};
