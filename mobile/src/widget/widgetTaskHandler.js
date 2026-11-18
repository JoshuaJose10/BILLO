import { fechaLocalISO, mesActual } from '../utils/fechas';
import {
  datosBalanceWidget,
  datosDonaWidget,
  datosProximoCobroWidget,
  NOMBRES_WIDGETS,
  textoWidget,
} from '../utils/widgetResumen';
import BalanceMesWidget from './BalanceMesWidget';
import DonaCategoriasWidget from './DonaCategoriasWidget';
import ProximoCobroWidget from './ProximoCobroWidget';
import ResumenMesWidget from './ResumenMesWidget';
import { leerDatoWidget } from './datoWidget';

export function construirRepresentacionWidget(
  nombreWidget,
  dato,
  {
    mes = mesActual(),
    hoyISO = fechaLocalISO(),
    ancho = 260,
    componentes = {
      ResumenMesWidget,
      BalanceMesWidget,
      DonaCategoriasWidget,
      ProximoCobroWidget,
    },
  } = {},
) {
  const CompResumen = componentes.ResumenMesWidget;
  const CompBalance = componentes.BalanceMesWidget;
  const CompDona = componentes.DonaCategoriasWidget;
  const CompCobro = componentes.ProximoCobroWidget;

  switch (nombreWidget) {
    case 'ResumenMes': {
      const texto = textoWidget(dato, mes);
      return {
        light: (
          <CompResumen titulo={texto.titulo} monto={texto.monto} esOscuro={false} ancho={ancho} />
        ),
        dark: (
          <CompResumen titulo={texto.titulo} monto={texto.monto} esOscuro={true} ancho={ancho} />
        ),
      };
    }
    case 'BalanceMes': {
      const balance = datosBalanceWidget(dato, mes);
      return {
        light: <CompBalance datos={balance} esOscuro={false} ancho={ancho} />,
        dark: <CompBalance datos={balance} esOscuro={true} ancho={ancho} />,
      };
    }
    case 'DonaCategorias': {
      const donaClaro = datosDonaWidget(dato, mes, false);
      const donaOscuro = datosDonaWidget(dato, mes, true);
      return {
        light: <CompDona datos={donaClaro} esOscuro={false} ancho={ancho} />,
        dark: <CompDona datos={donaOscuro} esOscuro={true} ancho={ancho} />,
      };
    }
    case 'ProximoCobro': {
      const cobro = datosProximoCobroWidget(dato, hoyISO);
      return {
        light: <CompCobro datos={cobro} esOscuro={false} ancho={ancho} />,
        dark: <CompCobro datos={cobro} esOscuro={true} ancho={ancho} />,
      };
    }
    default:
      return null;
  }
}

// HU-58 (RF13) y feature/widgets-billo: Android llama a esta tarea en segundo plano (sin abrir la
// app) cuando cualquiera de los 4 widgets se agrega, se actualiza, cambia de tamaño o el dispositivo
// se reinicia. Se registra en index.js.
// Solo lee lo guardado (sin red): si no hay dato o falla la lectura, muestra «Abre Billo».
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }) {
  if (!NOMBRES_WIDGETS.includes(widgetInfo.widgetName)) return;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      let dato = null;
      try {
        dato = await leerDatoWidget();
      } catch {
        dato = null;
      }
      const representacion = construirRepresentacionWidget(widgetInfo.widgetName, dato, {
        mes: mesActual(),
        hoyISO: fechaLocalISO(),
        ancho: widgetInfo?.width || 260,
      });
      if (representacion) {
        renderWidget(representacion);
      }
      break;
    }
    default:
      break;
  }
}
