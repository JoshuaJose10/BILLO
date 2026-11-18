import RegistrarVozWidget from './RegistrarVozWidget';
import ResumenMesWidget from './ResumenMesWidget';
import { leerVistaWidget } from './datoWidget';
import { conTemas } from './estilos';

const WIDGETS = { ResumenMes: ResumenMesWidget, RegistrarVoz: RegistrarVozWidget };

// HU-58 (RF13): Android llama a esta tarea en segundo plano (sin abrir la app) cuando un widget se
// agrega, se actualiza, cambia de tamaño o el dispositivo se reinicia. Se registra en index.js.
// Atiende «Billo» (ResumenMes) y «Registrar por voz». ResumenMes solo lee lo guardado (sin red):
// sin dato muestra «Abre Billo para ver tu saldo». Los toques abren la app o la hoja por deep link.
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }) {
  const { widgetName, width, height } = widgetInfo;
  const Widget = WIDGETS[widgetName];
  if (!Widget) return;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const vista = widgetName === 'ResumenMes' ? await leerVistaWidget() : null;
      renderWidget(conTemas(Widget, { vista, ancho: width, alto: height }));
      break;
    }
    default:
      break;
  }
}
