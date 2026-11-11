// HU-23 (spike): carga perezosa de los módulos nativos que no existen en Expo Go.
// Antes de cada require se revisa que el módulo nativo exista: en desarrollo, Metro manda a la
// pantalla roja los errores de un require hecho fuera de la carga inicial aunque haya try/catch.
// El try/catch queda como segunda protección.
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';

// La voz pasó a la app (HU-57): se reexporta para la pantalla del laboratorio.
export { cargarVoz } from '../services/reconocimientoVoz';

let widget;

const existeModuloWidget = () =>
  Platform.OS === 'android' &&
  (TurboModuleRegistry.get('AndroidWidget') ?? NativeModules.AndroidWidget) != null;

// Devuelve { requestWidgetUpdate, ResumenMesWidget } o null fuera de Android o sin el módulo
// nativo (react-native-android-widget lanza un error al importarse en Expo Go).
export function cargarWidget() {
  if (widget !== undefined) return widget;
  widget = null;
  if (!existeModuloWidget()) return widget;
  try {
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
  if (!existeModuloWidget()) return;
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    registerWidgetTaskHandler(require('./widget/widgetTaskHandler').widgetTaskHandler);
  } catch {
    // Si algo falla, la app sigue sin widget.
  }
}
