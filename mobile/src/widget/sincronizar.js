import { cargarWidget } from '../spike/modulosNativos';
import { mesActual } from '../utils/fechas';
import { guardarDatoWidget, leerVistaWidget, limpiarDatoWidget } from './datoWidget';
import { conTemas } from './estilos';

// HU-58 (RF13) y feature/widgets-billo: la app avisa a los widgets con datos. Nada de esto lanza
// errores ni hace nada fuera de Android o sin el módulo nativo (Expo Go).

const WIDGETS_CON_DATOS = [
  ['ResumenMes', 'ResumenMesWidget'],
  ['BalanceMes', 'BalanceMesWidget'],
  ['DonaCategorias', 'DonaCategoriasWidget'],
  ['ProximoCobro', 'ProximoCobroWidget'],
];

// Pide a Android que vuelva a dibujar los widgets con lo guardado (si no están agregados, no
// pasa nada). También al alternar «ocultar saldo» (useSaldoOculto).
export async function redibujarWidget() {
  try {
    const widget = cargarWidget();
    if (!widget) return;
    const vista = await leerVistaWidget();
    await Promise.all(
      WIDGETS_CON_DATOS.map(([widgetName, claveComponente]) => {
        const Componente = widget[claveComponente];
        if (!Componente) return Promise.resolve();
        return widget.requestWidgetUpdate({
          widgetName,
          renderWidget: ({ width, height }) =>
            conTemas(Componente, { vista, ancho: width, alto: height }),
          widgetNotFound: () => {},
        });
      }),
    );
  } catch {
    // El widget conserva lo último que mostró.
  }
}

// Guarda lo que cargó Inicio ({ resumen, gastos, ingresos, membresias, categorias }) y actualiza
// todos los widgets.
export async function actualizarWidget(datos, mes = mesActual()) {
  try {
    await guardarDatoWidget(datos, mes);
    await redibujarWidget();
  } catch {
    // El widget conserva lo último que mostró.
  }
}

// Cierre de sesión: borra el dato para que ningún widget muestre datos del usuario anterior.
export async function limpiarWidget() {
  await limpiarDatoWidget();
  await redibujarWidget();
}
