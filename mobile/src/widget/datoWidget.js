import * as SecureStore from 'expo-secure-store';

import { crearDatoWidget, leerDatoGuardado } from '../utils/widgetResumen';

// HU-58 (RF13): dato que la app comparte con el widget ({ mes, total }). Se usa SecureStore porque
// ya está instalado y funciona en la tarea en segundo plano del widget (probado en el spike HU-23).
// Es el mismo almacén que la sesión: al cerrar sesión se borra con limpiarDatoWidget.
const CLAVE_DATO_WIDGET = 'billo_widget_resumen';

export async function leerDatoWidget() {
  try {
    return leerDatoGuardado(await SecureStore.getItemAsync(CLAVE_DATO_WIDGET));
  } catch {
    return null;
  }
}

// resumen (GET /reportes/resumen) → guarda y devuelve el dato (null si el resumen no sirve).
export async function guardarResumenWidget(resumen, mes) {
  const dato = crearDatoWidget(resumen, mes);
  if (!dato) return null;
  await SecureStore.setItemAsync(CLAVE_DATO_WIDGET, JSON.stringify(dato));
  return dato;
}

export async function limpiarDatoWidget() {
  try {
    await SecureStore.deleteItemAsync(CLAVE_DATO_WIDGET);
  } catch {
    // Sin dato guardado no hay nada que borrar.
  }
}
