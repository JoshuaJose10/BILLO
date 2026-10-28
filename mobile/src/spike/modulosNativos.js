// HU-23 (spike): carga perezosa de los módulos nativos que no existen en Expo Go.
// Cada require va dentro de try/catch para que, sin el development build, la pantalla de
// pruebas muestre "no disponible" en lugar de romper la app.
import { Platform } from 'react-native';

let voz;
let widget;

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

// Devuelve { requestWidgetUpdate, ResumenMesWidget } o null fuera de Android o sin el módulo
// nativo (react-native-android-widget lanza un error al importarse en Expo Go).
export function cargarWidget() {
  if (widget !== undefined) return widget;
  try {
    if (Platform.OS !== 'android') throw new Error('Solo Android');
    widget = {
      requestWidgetUpdate: require('react-native-android-widget').requestWidgetUpdate,
      ResumenMesWidget: require('./widget/ResumenMesWidget').default,
    };
  } catch {
    widget = null;
  }
  return widget;
}

// Registra la tarea en segundo plano del widget. Se llama desde index.js.
export function registrarWidget() {
  if (Platform.OS !== 'android') return;
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    registerWidgetTaskHandler(require('./widget/widgetTaskHandler').widgetTaskHandler);
  } catch {
    // Expo Go: el módulo nativo no existe y la app sigue sin widget.
  }
}
