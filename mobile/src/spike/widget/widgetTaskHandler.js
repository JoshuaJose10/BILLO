import ResumenMesWidget from './ResumenMesWidget';
import { leerDatoWidget } from './datoWidget';

// HU-23 (spike RF13): Android llama a esta tarea en segundo plano (sin abrir la app) cuando el
// widget se agrega, se actualiza o cambia de tamaño. Se registra en index.js.
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }) {
  if (widgetInfo.widgetName !== 'ResumenMes') return;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const dato = await leerDatoWidget();
      renderWidget(<ResumenMesWidget dato={dato} />);
      break;
    }
    default:
      break;
  }
}
