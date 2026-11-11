const crypto = require('node:crypto');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const DURACION_TOKEN_MS = 30 * 60 * 1000; // 30 minutos
const VENTANA_LIMITE_MS = 15 * 60 * 1000; // 15 minutos
const MAX_SOLICITUDES_POR_CORREO = 3;

// Registro en memoria de solicitudes por correo normalizado: Map<email, number[]>
const solicitudesPorCorreo = new Map();
let ultimoCorreoEnviado = null;
let transportePersonalizado = null;

/**
 * Genera un código numérico aleatorio de 6 dígitos de un solo uso.
 */
const generarTokenRecuperacion = () => {
  return String(crypto.randomInt(100000, 1000000));
};

/**
 * Calcula el hash SHA-256 de un token/código de recuperación.
 * En la base de datos solo se almacena este hash, nunca el token en claro.
 */
const hashearTokenRecuperacion = (token) => {
  return crypto
    .createHash('sha256')
    .update(String(token).trim())
    .digest('hex');
};

/**
 * Verifica y registra una solicitud de recuperación para un correo normalizado.
 * Devuelve true si se permite la solicitud o false si superó el límite en la ventana.
 */
const registrarSolicitudRecuperacion = (
  emailNormalizado,
  ahoraMs = Date.now()
) => {
  const clave = String(emailNormalizado).trim().toLowerCase();
  const previas = solicitudesPorCorreo.get(clave) || [];
  const vigentes = previas.filter((ts) => ahoraMs - ts < VENTANA_LIMITE_MS);

  if (vigentes.length >= MAX_SOLICITUDES_POR_CORREO) {
    solicitudesPorCorreo.set(clave, vigentes);
    return false;
  }

  vigentes.push(ahoraMs);
  solicitudesPorCorreo.set(clave, vigentes);
  return true;
};

/**
 * Convierte MAIL_FROM ("Billo <correo@ejemplo.com>" o "correo@ejemplo.com")
 * al objeto sender que espera la API HTTP v3 de Brevo.
 */
const parsearRemitente = (mailFrom) => {
  const valor = typeof mailFrom === 'string' ? mailFrom.trim() : '';
  const match = valor.match(/^(.+?)\s*<([^<>@\s]+@[^<>@\s]+)>$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^["']|["']$/g, '') || 'Billo',
      email: match[2].trim(),
    };
  }
  return {
    name: 'Billo',
    email: valor,
  };
};

/**
 * Envía el correo de recuperación con el código de 6 dígitos mediante la API HTTP de Brevo
 * (POST https://api.brevo.com/v3/smtp/email con header api-key).
 */
const enviarCorreoRecuperacion = async ({
  email,
  nombre,
  token,
  fetchImpl = global.fetch,
  apiKey = process.env.BREVO_API_KEY,
  mailFrom = process.env.MAIL_FROM,
}) => {
  const destinatarioNombre =
    typeof nombre === 'string' && nombre.trim() !== '' ? nombre.trim() : email;

  const asunto = 'Código para recuperar tu contraseña de Billo';
  const textContent = `Hola ${destinatarioNombre},\n\nTu código para restablecer tu contraseña de Billo es: ${token}\n\nEste código caduca en 30 minutos y solo puede utilizarse una vez.\nSi no solicitaste este cambio, puedes ignorar este correo.`;
  const htmlContent = `<p>Hola <strong>${destinatarioNombre}</strong>,</p><p>Tu código para restablecer tu contraseña de Billo es:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${token}</p><p>Este código caduca en 30 minutos y solo puede utilizarse una vez.</p>`;

  if (process.env.NODE_ENV === 'test') {
    ultimoCorreoEnviado = {
      email,
      nombre: destinatarioNombre,
      token,
      subject: asunto,
      textContent,
    };
  }

  if (typeof transportePersonalizado === 'function') {
    return transportePersonalizado({
      email,
      nombre: destinatarioNombre,
      token,
      subject: asunto,
      textContent,
      htmlContent,
    });
  }

  const keyLimpia = typeof apiKey === 'string' ? apiKey.trim() : '';
  const fromLimpio = typeof mailFrom === 'string' ? mailFrom.trim() : '';

  if (!keyLimpia || !fromLimpio) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(
        'Aviso: BREVO_API_KEY o MAIL_FROM no configurados; se omite el envío HTTP a Brevo.'
      );
    }
    return { enviado: false, modo: 'sin-credenciales' };
  }

  const sender = parsearRemitente(fromLimpio);
  const response = await fetchImpl(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': keyLimpia,
    },
    body: JSON.stringify({
      sender,
      to: [{ email, name: destinatarioNombre }],
      subject: asunto,
      textContent,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const detalle = await response.text().catch(() => '');
    throw new Error(
      `Brevo respondió con HTTP ${response.status}${detalle ? `: ${detalle}` : ''}`
    );
  }

  return response.json().catch(() => ({ enviado: true }));
};

const obtenerUltimoCorreoEnviado = () => ultimoCorreoEnviado;

const configurarTransporteCorreo = (fn) => {
  transportePersonalizado = fn;
};

const limpiarEstadoRecuperacion = () => {
  solicitudesPorCorreo.clear();
  ultimoCorreoEnviado = null;
  transportePersonalizado = null;
};

module.exports = {
  BREVO_API_URL,
  DURACION_TOKEN_MS,
  VENTANA_LIMITE_MS,
  MAX_SOLICITUDES_POR_CORREO,
  generarTokenRecuperacion,
  hashearTokenRecuperacion,
  registrarSolicitudRecuperacion,
  parsearRemitente,
  enviarCorreoRecuperacion,
  obtenerUltimoCorreoEnviado,
  configurarTransporteCorreo,
  limpiarEstadoRecuperacion,
};
