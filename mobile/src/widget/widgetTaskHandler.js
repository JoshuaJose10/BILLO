import { mesActual } from '../utils/fechas';
import { textoWidget } from '../utils/widgetResumen';
import ResumenMesWidget from './ResumenMesWidget';
import { leerDatoWidget } from './datoWidget';

// HU-58 (RF13): Android llama a esta tarea en segundo plano (sin abrir la app) cuando el widget se
// agrega, se actualiza, cambia de tamaño o el dispositivo se reinicia. Se registra en index.js.
// Solo lee lo guardado (sin red): si no hay dato o falla la lectura, muestra «Abre Billo».
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }) {
  if (widgetInfo.widgetName !== 'ResumenMes') return;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      let texto;
      try {
        texto = textoWidget(await leerDatoWidget(), mesActual());
      } catch {
        texto = textoWidget(null, mesActual());
      }
      renderWidget(<ResumenMesWidget titulo={texto.titulo} monto={texto.monto} />);
      break;
    }
    default:
      break;
  }
}
