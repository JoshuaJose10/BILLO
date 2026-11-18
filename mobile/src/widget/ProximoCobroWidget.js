// Sin Fragments: la librería no los soporta.
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { temas } from '../theme/colors';
import { TEXTO_SIN_DATOS_CORTO, URIS_WIDGETS } from '../utils/widgetResumen';
import { etiqueta, pastilla, titulo } from './estilos';
import { esMediano, FUENTE_CHIP } from './medidas';
import { Logo, Tarjeta } from './piezas';

// Widget «Próximo cobro» (feature/widgets-billo):
// Muestra el servicio, monto y días que faltan para el siguiente cobro (reusando proximoCobro)
// en claro y oscuro, tamaños 2×2 y 4×2 sin texto cortado. Al tocarlo abre Cartera › Suscripciones.
export default function ProximoCobroWidget({
  colors = temas.oscuro,
  vista = null,
  datos: datosProp = null,
  ancho = 260,
}) {
  const datos = vista?.proximoCobro ?? datosProp;
  const mediano = esMediano(ancho);
  const vacio = !datos || datos.vacio;
  const clic = {
    clickAction: 'OPEN_URI',
    clickActionData: { uri: URIS_WIDGETS.ProximoCobro },
  };

  if (vacio) {
    return (
      <Tarjeta colors={colors} clic={clic} style={{ justifyContent: 'space-between' }}>
        <Logo colors={colors} />
        <FlexWidget style={{ width: 'match_parent' }}>
          <TextWidget text="Próximo cobro" style={etiqueta(colors, FUENTE_CHIP)} />
          <TextWidget
            text={TEXTO_SIN_DATOS_CORTO}
            maxLines={1}
            style={titulo(colors, mediano ? 20 : 16)}
          />
        </FlexWidget>
      </Tarjeta>
    );
  }

  const fondoDias = datos.urgente ? colors.avisoSuave : colors.exitoSuave;
  const colorDias = datos.urgente ? colors.avisoTexto : colors.exitoTexto;

  return (
    <Tarjeta colors={colors} clic={clic} style={{ justifyContent: 'space-between' }}>
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Logo colors={colors} />
        <FlexWidget style={pastilla(fondoDias)}>
          <TextWidget
            text={datos.cuando}
            maxLines={1}
            style={{
              fontSize: FUENTE_CHIP,
              fontWeight: '600',
              color: colorDias,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            flexGap: 10,
          }}
        >
          <FlexWidget
            style={{
              width: mediano ? 36 : 30,
              height: mediano ? 36 : 30,
              borderRadius: 12,
              backgroundColor: datos.colorMarca || colors.acento,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TextWidget
              text={datos.inicial}
              maxLines={1}
              style={{
                fontSize: mediano ? 16 : 14,
                fontWeight: '700',
                color: colors.textoSobreColor,
              }}
            />
          </FlexWidget>
          <FlexWidget style={{ flex: 1 }}>
            <TextWidget
              text={datos.servicio}
              maxLines={1}
              style={titulo(colors, mediano ? 15 : 13)}
            />
            <TextWidget
              text={mediano ? 'Próximo cobro' : datos.montoCompacto}
              maxLines={1}
              style={etiqueta(colors, FUENTE_CHIP)}
            />
          </FlexWidget>
        </FlexWidget>

        {mediano ? <TextWidget text={datos.monto} maxLines={1} style={titulo(colors, 18)} /> : null}
      </FlexWidget>
    </Tarjeta>
  );
}
