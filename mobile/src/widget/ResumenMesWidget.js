import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { radios, temas } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { TEXTO_SIN_DATOS, URIS_WIDGETS } from '../utils/widgetResumen';

// Widget «Resumen del mes» (HU-58 / feature/widgets-billo):
// Muestra el gasto total del mes con la paleta y tipografía de Billo en claro y oscuro,
// adaptándose a 2×2 y 4×2 sin cortar texto. Al tocarlo abre Inicio.
export default function ResumenMesWidget({
  titulo = 'BILLO',
  monto = null,
  esOscuro = true,
  ancho = 260,
}) {
  const colors = esOscuro ? temas.oscuro : temas.claro;
  const compacto = ancho > 0 && ancho < 210;
  const sinDatos = !monto;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: URIS_WIDGETS.ResumenMes }}
      accessibilityLabel={sinDatos ? `Resumen del mes: ${TEXTO_SIN_DATOS}` : `${titulo}: ${monto}`}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: compacto ? 12 : 16,
        borderRadius: radios.tarjeta,
        backgroundColor: colors.surfaceLowest,
        borderWidth: 1,
        borderColor: colors.borderStrong,
      }}
    >
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <TextWidget
          text={titulo}
          maxLines={1}
          style={{
            fontFamily: fonts.monoMedium,
            fontSize: compacto ? 10 : 11,
            color: colors.textSecondary,
          }}
        />
        <FlexWidget
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: colors.acentoSuave,
          }}
        >
          <TextWidget
            text="MXN"
            maxLines={1}
            style={{
              fontFamily: fonts.monoSemiBold,
              fontSize: 9,
              color: colors.acentoTexto,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'column',
          marginTop: 4,
        }}
      >
        <TextWidget
          text={monto ?? TEXTO_SIN_DATOS}
          maxLines={1}
          style={{
            fontFamily: sinDatos ? fonts.sansBold : fonts.monoBold,
            fontSize: sinDatos ? (compacto ? 16 : 20) : compacto ? 20 : 26,
            fontWeight: '700',
            color: colors.text,
          }}
        />
        <TextWidget
          text={sinDatos ? 'Inicia sesión para ver tu resumen' : 'Gastado este mes'}
          maxLines={1}
          style={{
            fontFamily: fonts.sans,
            fontSize: compacto ? 10 : 12,
            color: colors.textSecondary,
            marginTop: 2,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
