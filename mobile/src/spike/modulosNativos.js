// HU-23 (spike): carga perezosa de los módulos nativos que no existen en Expo Go.
// Cada require va dentro de try/catch para que, sin el development build, la pantalla de
// pruebas muestre "no disponible" en lugar de romper la app.

let voz;

// Devuelve el módulo de expo-speech-recognition o null si no está en el binario.
export function cargarVoz() {
  if (voz !== undefined) return voz;
  try {
    voz = require('expo-speech-recognition').ExpoSpeechRecognitionModule ?? null;
  } catch {
    voz = null;
  }
  return voz;
}
