import BalanceMesWidget from './BalanceMesWidget';
import DonaCategoriasWidget from './DonaCategoriasWidget';
import ProximoCobroWidget from './ProximoCobroWidget';
import RegistrarVozWidget from './RegistrarVozWidget';
import ResumenMesWidget from './ResumenMesWidget';
import { leerVistaWidget } from './datoWidget';
import { conTemas } from './estilos';

const WIDGETS = {
  ResumenMes: ResumenMesWidget,
  RegistrarVoz: RegistrarVozWidget,
  BalanceMes: BalanceMesWidget,
  DonaCategorias: DonaCategoriasWidget,
  ProximoCobro: ProximoCobroWidget,
};

// HU-58 (RF13) y feature/widgets-billo: Android llama a esta tarea en segundo plano (sin abrir la
// app) cuando un widget se agrega, se actualiza, cambia de tamaño o el dispositivo se reinicia. Se
// registra en index.js. Solo lee lo guardado (sin red). Los toques abren la app o la pantalla
// correspondiente por deep link.
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }) {
  const { widgetName, width, height } = widgetInfo;
  const Widget = WIDGETS[widgetName];
  if (!Widget) return;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const vista = widgetName === 'RegistrarVoz' ? null : await leerVistaWidget();
      renderWidget(conTemas(Widget, { vista, ancho: width, alto: height }));
      break;
    }
    default:
      break;
  }
}
