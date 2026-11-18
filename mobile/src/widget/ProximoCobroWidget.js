import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { radios, temas } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { TEXTO_SIN_DATOS, URIS_WIDGETS } from '../utils/widgetResumen';

// Widget «Próximo cobro» (feature/widgets-billo):
// Muestra el servicio, monto y días que faltan para el siguiente cobro (reusando proximoCobro)
// en claro y oscuro, tamaños 2×2 y 4×2 sin texto cortado. Al tocarlo abre Cartera › Suscripciones.
export default function ProximoCobroWidget({ datos = null, esOscuro = true, ancho = 260 }) {
  const colors = esOscuro ? temas.oscuro : temas.claro;
  const compacto = ancho > 0 && ancho < 210;
  const vacio = !datos || datos.vacio;

  if (vacio) {
    return (
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: URIS_WIDGETS.ProximoCobro }}
        accessibilityLabel={`Próximo cobro: ${TEXTO_SIN_DATOS}`}
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
        <TextWidget
          text="PRÓXIMO COBRO"
          maxLines={1}
          style={{
            fontFamily: fonts.monoMedium,
            fontSize: compacto ? 10 : 11,
            color: colors.textSecondary,
          }}
        />
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget
            text={TEXTO_SIN_DATOS}
            maxLines={1}
            style={{
              fontFamily: fonts.sansBold,
              fontSize: compacto ? 16 : 20,
              fontWeight: '700',
              color: colors.text,
            }}
          />
          <TextWidget
            text="Ver tus suscripciones activas"
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

  const fondoDias = datos.urgente ? colors.avisoSuave : colors.exitoSuave;
  const colorDias = datos.urgente ? colors.avisoTexto : colors.exitoTexto;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: URIS_WIDGETS.ProximoCobro }}
      accessibilityLabel={`Próximo cobro: ${datos.servicio}, ${datos.monto}, ${datos.cuando}`}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: compacto ? 12 : 14,
        borderRadius: radios.tarjeta,
        backgroundColor: colors.surfaceLowest,
        borderWidth: 1,
        borderColor: colors.borderStrong,
      }}
    >
      {/* Cabecera */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <TextWidget
          text="PRÓXIMO COBRO"
          maxLines={1}
          style={{
            fontFamily: fonts.monoMedium,
            fontSize: compacto ? 9 : 10,
            color: colors.textSecondary,
          }}
        />
        <FlexWidget
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: fondoDias,
          }}
        >
          <TextWidget
            text={datos.cuando}
            maxLines={1}
            style={{
              fontFamily: fonts.monoSemiBold,
              fontSize: 9,
              color: colorDias,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Servicio y monto */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 6,
        }}
      >
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <FlexWidget
            style={{
              width: compacto ? 30 : 36,
              height: compacto ? 30 : 36,
              borderRadius: 12,
              backgroundColor: datos.colorMarca || colors.acento,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}
          >
            <TextWidget
              text={datos.inicial}
              maxLines={1}
              style={{
                fontFamily: fonts.sansBold,
                fontSize: compacto ? 14 : 16,
                fontWeight: '700',
                color: colors.textoSobreColor,
              }}
            />
          </FlexWidget>
          <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
            <TextWidget
              text={datos.servicio}
              maxLines={1}
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: compacto ? 13 : 15,
                fontWeight: '600',
                color: colors.text,
              }}
            />
            {compacto ? (
              <TextWidget
                text={datos.montoCompacto}
                maxLines={1}
                style={{
                  fontFamily: fonts.monoBold,
                  fontSize: 12,
                  fontWeight: '700',
                  color: colors.text,
                  marginTop: 1,
                }}
              />
            ) : (
              <TextWidget
                text="Suscripción activa"
                maxLines={1}
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 11,
                  color: colors.textSecondary,
                }}
              />
            )}
          </FlexWidget>
        </FlexWidget>

        {!compacto ? (
          <TextWidget
            text={datos.monto}
            maxLines={1}
            style={{
              fontFamily: fonts.monoBold,
              fontSize: 17,
              fontWeight: '700',
              color: colors.text,
              marginLeft: 8,
            }}
          />
        ) : null}
      </FlexWidget>
    </FlexWidget>
  );
}
