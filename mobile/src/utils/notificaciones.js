// Decisiones del registro de notificaciones push (HU-47, RF7). Sin dependencias de Expo para
// probarlas con npm test; services/tokenPush.js las conecta con expo-notifications y la API.

// Mismo formato que valida el backend (POST /notificaciones/token): un token distinto ni se envía.
const REGEX_TOKEN_EXPO = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;

export function esTokenPushValido(token) {
  return typeof token === 'string' && token.length <= 255 && REGEX_TOKEN_EXPO.test(token);
}

// Tope de cada paso al cerrar sesión: esperar el registro en curso y desvincular el token.
export const TOPE_CIERRE_MS = 3000;

// Espera `promesa` como máximo `ms`; si tarda más, sigue sin ella.
function conTope(promesa, ms) {
  let timer;
  const limite = new Promise((resolve) => {
    timer = setTimeout(resolve, ms);
  });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(timer));
}

// Vínculo entre el token push del teléfono y la sesión (JWT) que lo registró. Garantiza que:
// - se registra una vez por sesión (al iniciarla o restaurarla, y de nuevo si entra otro usuario);
// - cada intento pertenece a una "generación": si la sesión cambia o se cierra mientras espera el
//   permiso, el token o la respuesta del POST, el resultado se descarta y el POST se aborta;
// - al cerrar sesión se espera el registro en curso (con tope) y se desvincula el token con el
//   JWT todavía vigente (con tope). Nada de esto lanza ni espera más que los topes.
// `registrar` y `eliminar` reciben (token, sesion, signal). `avisar(etapa, error)` es solo para
// desarrollo; la etapa es 'token', 'registro' o 'desvinculo'.
export function crearVinculoPush({
  obtenerToken,
  registrar,
  eliminar,
  avisar = () => {},
  topeMs = TOPE_CIERRE_MS,
}) {
  let generacion = 0;
  let sesionActual = null;
  // Intento en curso: { sesion, controller, token (ya enviado o null), promesa }.
  let intento = null;
  // Último registro confirmado por el backend: { token, sesion }.
  let registrado = null;

  // Olvida la sesión sin llamar al backend (sesión vencida o paso final de desvincular).
  function descartar() {
    generacion++;
    sesionActual = null;
    intento?.controller.abort();
    intento = null;
    registrado = null;
  }

  // Registra el token de `sesion`. Devuelve el token registrado o null; nunca lanza.
  function iniciar(sesion) {
    if (!sesion) return Promise.resolve(null);
    if (sesion === sesionActual) {
      return intento?.promesa ?? Promise.resolve(registrado?.token ?? null);
    }
    descartar();
    sesionActual = sesion;
    const gen = generacion;
    const vigente = () => gen === generacion;
    const actual = { sesion, controller: new AbortController(), token: null };

    actual.promesa = (async () => {
      let token;
      try {
        token = await obtenerToken();
      } catch (error) {
        if (vigente()) avisar('token', error);
        return null;
      }
      if (!vigente() || !esTokenPushValido(token)) return null;

      actual.token = token;
      try {
        await registrar(token, sesion, actual.controller.signal);
      } catch (error) {
        if (vigente()) avisar('registro', error);
        return null;
      }
      // Respuesta tardía de una sesión que ya cambió o se cerró: se ignora.
      if (!vigente()) return null;
      registrado = { token, sesion };
      return token;
    })().finally(() => {
      if (intento === actual) intento = null;
    });

    intento = actual;
    return actual.promesa;
  }

  // Al cerrar `sesion`: espera el registro en curso (tope), desvincula el token con esa misma
  // sesión (tope) y la olvida. Siempre resuelve.
  async function desvincular(sesion) {
    const pendiente = intento && intento.sesion === sesion ? intento : null;
    if (pendiente) await conTope(pendiente.promesa, topeMs);

    // Si el POST no respondió a tiempo pudo llegar igual al backend: también se desvincula.
    const token = registrado?.sesion === sesion ? registrado.token : (pendiente?.token ?? null);
    descartar();
    if (!token) return;

    const controller = new AbortController();
    try {
      await conTope(eliminar(token, sesion, controller.signal), topeMs);
    } catch (error) {
      avisar('desvinculo', error);
    } finally {
      controller.abort();
    }
  }

  return { iniciar, desvincular, descartar };
}

// Línea del log de desarrollo: "[notificaciones] <etapa>: <code> <message>". Sirve para errores
// de la API ({ code, message, status }), de Expo (Error con `code`) o cualquier otro valor.
export function describirFallo(etapa, error) {
  const code = error?.code ?? error?.name ?? 'ERROR';
  const message = error?.message || (error?.status ? `HTTP ${error.status}` : String(error ?? ''));
  return `[notificaciones] ${etapa}: ${code} ${message}`.trim();
}

// Parámetros de Cartera al tocar una notificación. Hoy el backend solo manda avisos de cobro; un
// `data.tipo` distinto de 'cobro' no navega. Sin datos se asume cobro.
export function destinoNotificacion(data) {
  if (data?.tipo && data.tipo !== 'cobro') return null;
  return { seccion: 'suscripciones' };
}
