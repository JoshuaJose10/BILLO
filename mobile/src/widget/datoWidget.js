import * as SecureStore from 'expo-secure-store';

import { mesActual } from '../utils/fechas';
import { CLAVE_SALDO_OCULTO } from '../utils/preferencias';
import { crearDatoWidget, leerDatoGuardado, vistaWidget } from '../utils/widgetResumen';

// HU-58 (RF13): dato que la app comparte con el widget (ver utils/widgetResumen). Se usa
// SecureStore porque ya está instalado y funciona en la tarea en segundo plano del widget (probado
// en el spike HU-23). Es el mismo almacén que la sesión: al cerrar sesión se borra con
// limpiarDatoWidget.
const CLAVE_DATO_WIDGET = 'billo_widget_resumen';

export async function leerDatoWidget() {
  try {
    return leerDatoGuardado(await SecureStore.getItemAsync(CLAVE_DATO_WIDGET));
  } catch {
    return null;
  }
}

// Lo que dibuja el widget (vistaWidget), o null si no hay dato del mes. Nunca lanza errores.
export async function leerVistaWidget() {
  let oculto = false;
  try {
    oculto = (await SecureStore.getItemAsync(CLAVE_SALDO_OCULTO)) === '1';
  } catch {
    // Sin la preferencia, el saldo se muestra como en Inicio.
  }
  return vistaWidget(await leerDatoWidget(), mesActual(), oculto);
}

// datos de Inicio ({ resumen, gastos, ingresos, membresias, categorias }) → guarda el dato.
export async function guardarDatoWidget(datos, mes) {
  const dato = crearDatoWidget(datos, mes);
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
