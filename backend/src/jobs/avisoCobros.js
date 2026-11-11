const EXPO_PUSH_URL_DEFAULT = 'https://exp.host/--/api/v2/push/send';
const TIEMPO_MAXIMO_PUSH_MS = 5000;
const INTERVALO_DIARIO_MS = 24 * 60 * 60 * 1000;
const DIAS_ANTICIPACION_AVISO = 3;

const EXPO_PUSH_TOKEN_REGEX =
  /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

const esTokenPushValido = (token) => {
  return (
    typeof token === 'string' &&
    token.length <= 255 &&
    EXPO_PUSH_TOKEN_REGEX.test(token)
  );
};

const normalizarFechaStr = (valor) => {
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return valor.toISOString().slice(0, 10);
  }
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor.trim())) {
    const limpio = valor.trim();
    const [anio, mes, dia] = limpio.split('-').map(Number);
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    if (
      fecha.getUTCFullYear() === anio &&
      fecha.getUTCMonth() === mes - 1 &&
      fecha.getUTCDate() === dia
    ) {
      return limpio;
    }
  }
  return null;
};

// Obtiene la fecha de referencia en formato 'YYYY-MM-DD'
const obtenerFechaHoy = (fechaReferencia) => {
  const normalizada = normalizarFechaStr(fechaReferencia);
  if (normalizada) {
    return normalizada;
  }
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

// Devuelve el número de días en un mes dado (mes 1-12) de un año (considera años bisiestos)
const diasEnMes = (anio, mes) => {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
};

/**
 * Avanza la fecha de cobro al siguiente ciclo si ya pasó respecto a la fecha de referencia (RF7 / HU-51).
 * Si fecha_cobro < hoy, avanza de 1 en 1 mes (mensual) o de 1 en 1 año (anual) hasta una fecha >= hoy,
 * ajustando el fin de mes (31 -> 28, 29 o 30 según el mes destino).
 */
const avanzarFechaCobro = (
  fechaCobroStr,
  frecuencia = 'mensual',
  fechaReferenciaStr
) => {
  const fechaInicial = normalizarFechaStr(fechaCobroStr);
  if (!fechaInicial) {
    return fechaCobroStr;
  }

  const hoyStr = obtenerFechaHoy(fechaReferenciaStr);
  if (fechaInicial >= hoyStr) {
    return fechaInicial;
  }

  const [anioInicial, mesInicial, diaInicial] = fechaInicial
    .split('-')
    .map(Number);
  let anio = anioInicial;
  let mes = mesInicial;
  const diaOriginal = diaInicial;
  let fechaActual = fechaInicial;

  const esAnual = frecuencia === 'anual';
  let iteraciones = 0;
  const maxIteraciones = esAnual ? 200 : 2400;

  while (fechaActual < hoyStr && iteraciones < maxIteraciones) {
    iteraciones++;
    if (esAnual) {
      anio += 1;
    } else {
      mes += 1;
      if (mes > 12) {
        mes = 1;
        anio += 1;
      }
    }
    const maxDias = diasEnMes(anio, mes);
    const diaAjustado = Math.min(diaOriginal, maxDias);
    const mm = String(mes).padStart(2, '0');
    const dd = String(diaAjustado).padStart(2, '0');
    fechaActual = `${anio}-${mm}-${dd}`;
  }

  return fechaActual;
};

/**
 * Calcula los días enteros entre la fecha de referencia (hoy) y la fecha de cobro.
 */
const calcularDiasParaCobro = (fechaCobroStr, fechaReferenciaStr) => {
  const fechaCobro = normalizarFechaStr(fechaCobroStr);
  if (!fechaCobro) {
    return undefined;
  }
  const hoyStr = obtenerFechaHoy(fechaReferenciaStr);

  const [yCobro, mCobro, dCobro] = fechaCobro.split('-').map(Number);
  const [yHoy, mHoy, dHoy] = hoyStr.split('-').map(Number);

  const utcCobro = Date.UTC(yCobro, mCobro - 1, dCobro);
  const utcHoy = Date.UTC(yHoy, mHoy - 1, dHoy);

  return Math.round((utcCobro - utcHoy) / (1000 * 60 * 60 * 24));
};

/**
 * Calcula el próximo cobro efectivo de una membresía y determina si está dentro de la ventana de aviso (0 a 3 días).
 */
const calcularProximoCobro = (
  fechaCobroStr,
  frecuencia = 'mensual',
  fechaReferenciaStr
) => {
  const hoyStr = obtenerFechaHoy(fechaReferenciaStr);
  const fechaOriginal = normalizarFechaStr(fechaCobroStr);
  if (!fechaOriginal) {
    return {
      fecha_cobro: fechaCobroStr,
      fecha_cobro_original: fechaCobroStr,
      avanzada: false,
      dias_para_cobro: undefined,
      requiere_aviso: false,
    };
  }

  const fechaEfectiva = avanzarFechaCobro(fechaOriginal, frecuencia, hoyStr);
  const diasParaCobro = calcularDiasParaCobro(fechaEfectiva, hoyStr);
  const requiereAviso =
    typeof diasParaCobro === 'number' &&
    diasParaCobro >= 0 &&
    diasParaCobro <= DIAS_ANTICIPACION_AVISO;

  return {
    fecha_cobro: fechaEfectiva,
    fecha_cobro_original: fechaOriginal,
    avanzada: fechaEfectiva !== fechaOriginal,
    dias_para_cobro: diasParaCobro,
    requiere_aviso: requiereAviso,
  };
};

// Formatea el monto sin decimales si es entero ($199) o con 2 decimales ($199.50)
const formatearMontoAviso = (costo) => {
  const num = Number(costo);
  if (!Number.isFinite(num)) {
    return '$0';
  }
  return Number.isInteger(num) ? `$${num}` : `$${num.toFixed(2)}`;
};

// Construye el texto del aviso («Netflix se cobra en 2 días: $199»)
const construirMensajeCobro = (nombre, costo, diasParaCobro) => {
  const montoTexto = formatearMontoAviso(costo);
  if (diasParaCobro === 0) {
    return `${nombre} se cobra hoy: ${montoTexto}`;
  }
  if (diasParaCobro === 1) {
    return `${nombre} se cobra en 1 día: ${montoTexto}`;
  }
  return `${nombre} se cobra en ${diasParaCobro} días: ${montoTexto}`;
};

// Envía una notificación push mediante la API HTTP v2 de Expo
const enviarPushExpo = async (
  { to, title = 'Cobro próximo', body, data },
  {
    fetchImpl = fetch,
    url = process.env.EXPO_PUSH_URL || EXPO_PUSH_URL_DEFAULT,
  } = {}
) => {
  const respuesta = await fetchImpl(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      title,
      body,
      sound: 'default',
      channelId: 'default',
      data,
    }),
    signal: AbortSignal.timeout(TIEMPO_MAXIMO_PUSH_MS),
  });

  if (!respuesta.ok) {
    throw new Error(`Expo Push API respondió HTTP ${respuesta.status}`);
  }

  const cuerpo = await respuesta.json();
  const ticket = Array.isArray(cuerpo?.data) ? cuerpo.data[0] : cuerpo?.data;
  if (ticket?.status === 'error') {
    throw new Error(
      ticket.message || ticket.details?.error || 'Expo rechazó el envío push'
    );
  }

  return ticket;
};

/**
 * Proceso diario (cron) de avisos de cobro (RF7).
 * - Calcula el siguiente ciclo de cada membresía si su fecha_cobro ya pasó y la actualiza en BD.
 * - Si faltan 3 días o menos (0..3) y no se ha notificado hoy (ultima_notificacion <> hoy),
 *   envía el push al token del dueño y guarda ultima_notificacion = hoy.
 * - Si el usuario no tiene token o Expo falla, registra el error y continúa con los demás sin lanzar excepción.
 */
const procesarAvisosCobro = async ({
  fechaReferencia,
  pool: customPool,
  fetchImpl = fetch,
  urlExpo,
  logger = console,
} = {}) => {
  const pool = customPool || require('../db').pool;
  const hoyStr = obtenerFechaHoy(fechaReferencia);
  const resumen = {
    fecha: hoyStr,
    revisadas: 0,
    avanzadas: 0,
    enviadas: 0,
    yaNotificadas: 0,
    fueraDeRango: 0,
    sinToken: 0,
    errores: 0,
  };

  try {
    const { rows: membresias } = await pool.query(`
      SELECT
        m.id,
        m.usuario_id,
        m.nombre,
        m.costo,
        m.frecuencia,
        TO_CHAR(m.fecha_cobro, 'YYYY-MM-DD') AS fecha_cobro,
        TO_CHAR(m.ultima_notificacion, 'YYYY-MM-DD') AS ultima_notificacion,
        u.expo_push_token
      FROM membresias m
      INNER JOIN usuarios u ON u.id = m.usuario_id
      ORDER BY m.id ASC
    `);

    for (const m of membresias) {
      resumen.revisadas++;
      try {
        const calculo = calcularProximoCobro(
          m.fecha_cobro,
          m.frecuencia,
          hoyStr
        );

        if (calculo.avanzada) {
          await pool.query(
            'UPDATE membresias SET fecha_cobro = $1 WHERE id = $2',
            [calculo.fecha_cobro, m.id]
          );
          resumen.avanzadas++;
        }

        if (!calculo.requiere_aviso) {
          resumen.fueraDeRango++;
          continue;
        }

        if (m.ultima_notificacion === hoyStr) {
          resumen.yaNotificadas++;
          continue;
        }

        if (!m.expo_push_token || !esTokenPushValido(m.expo_push_token)) {
          resumen.sinToken++;
          logger.error(
            `[aviso-cobros] Usuario ${m.usuario_id} sin token push válido para membresía ${m.id} (${m.nombre})`
          );
          continue;
        }

        const textoAviso = construirMensajeCobro(
          m.nombre,
          m.costo,
          calculo.dias_para_cobro
        );

        await enviarPushExpo(
          {
            to: m.expo_push_token,
            title: 'Cobro próximo',
            body: textoAviso,
            data: {
              tipo: 'cobro',
              membresia_id: m.id,
            },
          },
          {
            fetchImpl,
            ...(urlExpo ? { url: urlExpo } : {}),
          }
        );

        await pool.query(
          'UPDATE membresias SET ultima_notificacion = $1 WHERE id = $2',
          [hoyStr, m.id]
        );
        resumen.enviadas++;
      } catch (errMembresia) {
        resumen.errores++;
        logger.error(
          `[aviso-cobros] Error al procesar membresía ${m.id} (${m.nombre}): ${errMembresia.message}`
        );
      }
    }
  } catch (errGlobal) {
    resumen.errores++;
    logger.error(
      `[aviso-cobros] Error general en el proceso diario: ${errGlobal.message}`
    );
  }

  return resumen;
};

// Inicia la ejecución periódica diaria dentro del proceso del servidor
const iniciarCronAvisoCobros = ({
  intervaloMs = INTERVALO_DIARIO_MS,
  ejecutarAlIniciar = true,
  ...opciones
} = {}) => {
  if (ejecutarAlIniciar) {
    procesarAvisosCobro(opciones).catch(() => {});
  }

  const timer = setInterval(() => {
    procesarAvisosCobro(opciones).catch(() => {});
  }, intervaloMs);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return {
    detener: () => clearInterval(timer),
  };
};

if (require.main === module) {
  require('dotenv').config({ quiet: true });
  procesarAvisosCobro()
    .then((resumen) => {
      console.log(
        `OK Aviso de cobros (${resumen.fecha}): revisadas=${resumen.revisadas}, avanzadas=${resumen.avanzadas}, enviadas=${resumen.enviadas}, sinToken=${resumen.sinToken}, errores=${resumen.errores}`
      );
      return require('../db').pool.end();
    })
    .catch((err) => {
      console.error('Error al ejecutar aviso de cobros:', err.message);
      process.exitCode = 1;
    });
}

module.exports = {
  DIAS_ANTICIPACION_AVISO,
  diasEnMes,
  obtenerFechaHoy,
  avanzarFechaCobro,
  calcularDiasParaCobro,
  calcularProximoCobro,
  formatearMontoAviso,
  construirMensajeCobro,
  enviarPushExpo,
  procesarAvisosCobro,
  iniciarCronAvisoCobros,
};
