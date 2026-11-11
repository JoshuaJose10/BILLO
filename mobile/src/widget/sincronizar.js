import { cargarWidget } from '../spike/modulosNativos';
import { mesActual } from '../utils/fechas';
import { textoWidget } from '../utils/widgetResumen';
import { guardarResumenWidget, leerDatoWidget, limpiarDatoWidget } from './datoWidget';

// HU-58 (RF13): la app avisa al widget. Nada de esto lanza errores ni hace nada fuera de Android
// o sin el módulo nativo (Expo Go): el widget es un extra y no debe romper la app.

// Pide a Android que vuelva a dibujar el widget con lo guardado (si no está agregado, no pasa nada).
async function redibujar() {
  const widget = cargarWidget();
  if (!widget) return;
  const texto = textoWidget(await leerDatoWidget(), mesActual());
  await widget.requestWidgetUpdate({
    widgetName: 'ResumenMes',
    renderWidget: () => <widget.ResumenMesWidget titulo={texto.titulo} monto={texto.monto} />,
    widgetNotFound: () => {},
  });
}

// Guarda el total del resumen (GET /reportes/resumen) y actualiza el widget.
export async function actualizarWidget(resumen, mes = mesActual()) {
  try {
    await guardarResumenWidget(resumen, mes);
    await redibujar();
  } catch {
    // El widget conserva lo último que mostró.
  }
}

// Cierre de sesión: borra el dato para que el widget no muestre datos del usuario anterior.
export async function limpiarWidget() {
  try {
    await limpiarDatoWidget();
    await redibujar();
  } catch {
    // Si no se puede redibujar, el dato ya no existe y el widget lo mostrará al actualizarse.
  }
}
