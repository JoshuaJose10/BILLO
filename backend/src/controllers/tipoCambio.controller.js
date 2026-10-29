// EXPERIMENTAL (HU-23, spike RF11): prueba de que el servidor puede consultar el tipo de
// cambio. No es parte del contrato de la API (docs/api-contrato.md) y puede cambiar o
// eliminarse en el Sprint 3. Detalles en docs/spike-rf11-rf13.md.
//
// Fuente: Frankfurter (https://frankfurter.dev), gratis, sin clave y con datos del Banco
// Central Europeo que se actualizan una vez al día hábil. Por eso se guarda en memoria una hora.

const URL_FUENTE = 'https://api.frankfurter.dev/v1/latest';
const DURACION_CACHE_MS = 60 * 60 * 1000;
const TIEMPO_MAXIMO_MS = 5000;

const cache = new Map();

const esCodigoMoneda = (codigo) => typeof codigo === 'string' && /^[A-Z]{3}$/.test(codigo);

const obtenerTipoCambio = async (req, res) => {
  const de = String(req.query.de || 'USD').toUpperCase();
  const a = String(req.query.a || 'MXN').toUpperCase();

  if (!esCodigoMoneda(de) || !esCodigoMoneda(a) || de === a) {
    return res.status(400).json({
      error: {
        code: 'MONEDA_INVALIDA',
        message: 'Usa dos códigos de moneda distintos de 3 letras (ej. ?de=USD&a=MXN)',
      },
    });
  }

  const clave = `${de}-${a}`;
  const guardado = cache.get(clave);
  if (guardado && Date.now() - guardado.consultadoEn < DURACION_CACHE_MS) {
    return res.status(200).json({ ...guardado.datos, cache: true });
  }

  try {
    const respuesta = await fetch(`${URL_FUENTE}?base=${de}&symbols=${a}`, {
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });

    if (respuesta.status === 404) {
      return res.status(400).json({
        error: { code: 'MONEDA_NO_SOPORTADA', message: 'La fuente no tiene esa moneda' },
      });
    }
    if (!respuesta.ok) {
      throw new Error(`La fuente respondió ${respuesta.status}`);
    }

    const cuerpo = await respuesta.json();
    const tasa = cuerpo.rates?.[a];
    if (typeof tasa !== 'number') {
      throw new Error('La fuente no devolvió la tasa');
    }

    const datos = { de, a, tasa, fecha: cuerpo.date, fuente: 'frankfurter.dev (BCE)' };
    cache.set(clave, { datos, consultadoEn: Date.now() });
    return res.status(200).json({ ...datos, cache: false });
  } catch (err) {
    console.error('Error al consultar el tipo de cambio:', err.message);
    return res.status(502).json({
      error: {
        code: 'FUENTE_NO_DISPONIBLE',
        message: 'No se pudo obtener el tipo de cambio',
      },
    });
  }
};

module.exports = { obtenerTipoCambio };
