import * as SecureStore from 'expo-secure-store';

// HU-23 (spike RF13): dato que la app comparte con el widget. Se usa SecureStore solo porque
// ya está instalado y funciona en la tarea en segundo plano del widget; para el Sprint 3 el
// total del mes no es un secreto y conviene un almacenamiento normal.
const CLAVE_DATO_WIDGET = 'spike_widget_dato';

export const leerDatoWidget = () => SecureStore.getItemAsync(CLAVE_DATO_WIDGET);

export const guardarDatoWidget = (dato) => SecureStore.setItemAsync(CLAVE_DATO_WIDGET, dato);
