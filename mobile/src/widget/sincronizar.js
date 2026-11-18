import { cargarWidget } from '../spike/modulosNativos';
import { mesActual } from '../utils/fechas';
import { conTemas } from './estilos';
import { guardarDatoWidget, leerVistaWidget, limpiarDatoWidget } from './datoWidget';

// HU-58 (RF13): la app avisa al widget. Nada de esto lanza errores ni hace nada fuera de Android
// o sin el módulo nativo (Expo Go): el widget es un extra y no debe romper la app.

// Pide a Android que vuelva a dibujar el widget «Billo» con lo guardado (si no está agregado, no
// pasa nada). También al alternar «ocultar saldo» (useSaldoOculto).
export async function redibujarWidget() {
  try {
    const widget = cargarWidget();
    if (!widget) return;
    const vista = await leerVistaWidget();
    await widget.requestWidgetUpdate({
      widgetName: 'ResumenMes',
      renderWidget: ({ width, height }) =>
        conTemas(widget.ResumenMesWidget, { vista, ancho: width, alto: height }),
      widgetNotFound: () => {},
    });
  } catch {
    // El widget conserva lo último que mostró.
  }
}

// Guarda lo que cargó Inicio ({ resumen, gastos, ingresos, membresias, categorias }) y actualiza
// el widget.
export async function actualizarWidget(datos, mes = mesActual()) {
  try {
    await guardarDatoWidget(datos, mes);
    await redibujarWidget();
  } catch {
    // El widget conserva lo último que mostró.
  }
}

// Cierre de sesión: borra el dato para que el widget no muestre datos del usuario anterior.
export async function limpiarWidget() {
  await limpiarDatoWidget();
  await redibujarWidget();
}
