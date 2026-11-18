import { CommonActions } from '@react-navigation/native';
import { useEffect } from 'react';
import { Linking } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { navegacionRef } from '../navigation/navegacionRef';
import { cargarWidget } from '../spike/modulosNativos';
import { fechaLocalISO, mesActual } from '../utils/fechas';
import {
  datosBalanceWidget,
  datosDonaWidget,
  datosProximoCobroWidget,
  destinoWidget,
  NOMBRES_WIDGETS,
  textoWidget,
} from '../utils/widgetResumen';
import { guardarResumenWidget, leerDatoWidget, limpiarDatoWidget } from './datoWidget';

// HU-58 (RF13) y feature/widgets-billo: la app avisa a los 4 widgets. Nada de esto lanza errores
// ni hace nada fuera de Android o sin el módulo nativo (Expo Go).

function renderizarConModulos(widget, nombreWidget, dato, info) {
  const mes = mesActual();
  const hoyISO = fechaLocalISO();
  const ancho = info?.width || 260;

  switch (nombreWidget) {
    case 'ResumenMes': {
      const texto = textoWidget(dato, mes);
      return {
        light: (
          <widget.ResumenMesWidget
            titulo={texto.titulo}
            monto={texto.monto}
            esOscuro={false}
            ancho={ancho}
          />
        ),
        dark: (
          <widget.ResumenMesWidget
            titulo={texto.titulo}
            monto={texto.monto}
            esOscuro={true}
            ancho={ancho}
          />
        ),
      };
    }
    case 'BalanceMes': {
      const balance = datosBalanceWidget(dato, mes);
      return {
        light: <widget.BalanceMesWidget datos={balance} esOscuro={false} ancho={ancho} />,
        dark: <widget.BalanceMesWidget datos={balance} esOscuro={true} ancho={ancho} />,
      };
    }
    case 'DonaCategorias': {
      const donaClaro = datosDonaWidget(dato, mes, false);
      const donaOscuro = datosDonaWidget(dato, mes, true);
      return {
        light: <widget.DonaCategoriasWidget datos={donaClaro} esOscuro={false} ancho={ancho} />,
        dark: <widget.DonaCategoriasWidget datos={donaOscuro} esOscuro={true} ancho={ancho} />,
      };
    }
    case 'ProximoCobro': {
      const cobro = datosProximoCobroWidget(dato, hoyISO);
      return {
        light: <widget.ProximoCobroWidget datos={cobro} esOscuro={false} ancho={ancho} />,
        dark: <widget.ProximoCobroWidget datos={cobro} esOscuro={true} ancho={ancho} />,
      };
    }
    default:
      return null;
  }
}

// Pide a Android que vuelva a dibujar los 4 widgets con lo guardado (si no están agregados, no pasa nada).
async function redibujar() {
  const widget = cargarWidget();
  if (!widget) return;
  const dato = await leerDatoWidget();
  await Promise.all(
    NOMBRES_WIDGETS.map((widgetName) =>
      widget.requestWidgetUpdate({
        widgetName,
        renderWidget: (info) => renderizarConModulos(widget, widgetName, dato, info),
        widgetNotFound: () => {},
      }),
    ),
  );
}

// Guarda los datos del mes (resumen, gastos, ingresos, membresías) y actualiza todos los widgets.
export async function actualizarWidget(entrada, mes = mesActual()) {
  try {
    await guardarResumenWidget(entrada, mes);
    await redibujar();
  } catch {
    // El widget conserva lo último que mostró.
  }
}

// Cierre de sesión: borra el dato para que ningún widget muestre datos del usuario anterior.
export async function limpiarWidget() {
  try {
    await limpiarDatoWidget();
    await redibujar();
  } catch {
    // Si no se puede redibujar, el dato ya no existe y el widget lo mostrará al actualizarse.
  }
}

// Al tocar un widget (billo://inicio, billo://balance, billo://dona, billo://cobro), abre la
// pantalla correspondiente de la app cuando la sesión está lista.
export function useAperturaDesdeWidget() {
  const { token, visitante, cargando } = useAuth();
  const sesionActiva = Boolean(token || visitante);

  useEffect(() => {
    if (!sesionActiva || cargando) return undefined;

    const navegarAUri = (url) => {
      if (!url || !navegacionRef.isReady()) return;
      const destino = destinoWidget(url);
      if (!destino) return;
      navegacionRef.dispatch(
        CommonActions.navigate({
          name: 'Main',
          params: {
            screen: destino.screen,
            params: destino.params ? { ...destino.params, solicitud: Date.now() } : undefined,
          },
          pop: true,
        }),
      );
    };

    Linking.getInitialURL()
      .then((url) => {
        if (url) navegarAUri(url);
      })
      .catch(() => {});

    const sub = Linking.addEventListener('url', ({ url }) => navegarAUri(url));
    return () => sub.remove();
  }, [sesionActiva, cargando]);
}
