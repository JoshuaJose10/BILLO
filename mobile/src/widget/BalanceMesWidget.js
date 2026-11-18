import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { radios, temas } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { TEXTO_SIN_DATOS, URIS_WIDGETS } from '../utils/widgetResumen';

// Widget «Balance del mes» (feature/widgets-billo):
// Muestra ingresos, gastos y balance del mes (verde si positivo, rojo si negativo) en 2×2 y 4×2.
// Al tocarlo abre Reportes › Balance.
export default function BalanceMesWidget({ datos = null, esOscuro = true, ancho = 260 }) {
  const colors = esOscuro ? temas.oscuro : temas.claro;
  const compacto = ancho > 0 && ancho < 210;
  const vacio = !datos || datos.vacio;

  const esPositivo = datos?.estado === 'positivo';
  const esNegativo = datos?.estado === 'negativo';
  const colorBalance = esPositivo
    ? colors.exitoTexto
    : esNegativo
      ? colors.alertaTexto
      : colors.text;
  const fondoPastilla = esPositivo
    ? colors.exitoSuave
    : esNegativo
      ? colors.alertaSuave
      : colors.surfaceHigh;

  if (vacio) {
    return (
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: URIS_WIDGETS.BalanceMes }}
        accessibilityLabel={`Balance del mes: ${TEXTO_SIN_DATOS}`}
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
          text="BILLO · BALANCE"
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
            text="Ver ingresos y gastos del mes"
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

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: URIS_WIDGETS.BalanceMes }}
      accessibilityLabel={`${datos.titulo}: Balance ${datos.balance}, Ingresos ${datos.ingresos}, Gastos ${datos.gastos}`}
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
      {/* Encabezado */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <TextWidget
          text={compacto ? `BALANCE · ${datos.mesCorto}` : datos.titulo}
          maxLines={1}
          style={{
            fontFamily: fonts.monoMedium,
            fontSize: compacto ? 9 : 10,
            color: colors.textSecondary,
          }}
        />
        <FlexWidget
          style={{
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: fondoPastilla,
          }}
        >
          <TextWidget
            text={esPositivo ? 'Positivo' : esNegativo ? 'Negativo' : 'Neutro'}
            maxLines={1}
            style={{
              fontFamily: fonts.monoSemiBold,
              fontSize: 9,
              color: colorBalance,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      {/* Monto principal del balance */}
      <TextWidget
        text={compacto ? datos.balanceCompacto : datos.balance}
        maxLines={1}
        style={{
          fontFamily: fonts.monoBold,
          fontSize: compacto ? 18 : 22,
          fontWeight: '700',
          color: colorBalance,
          marginTop: 2,
        }}
      />

      {/* Fila de Ingresos y Gastos */}
      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: compacto ? 'column' : 'row',
          alignItems: compacto ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          paddingTop: 4,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text="Ing: "
            maxLines={1}
            style={{
              fontFamily: fonts.sans,
              fontSize: compacto ? 10 : 11,
              color: colors.textSecondary,
            }}
          />
          <TextWidget
            text={datos.ingresos}
            maxLines={1}
            style={{
              fontFamily: fonts.monoSemiBold,
              fontSize: compacto ? 10 : 11,
              color: colors.exitoTexto,
            }}
          />
        </FlexWidget>

        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: compacto ? 2 : 0,
          }}
        >
          <TextWidget
            text="Gas: "
            maxLines={1}
            style={{
              fontFamily: fonts.sans,
              fontSize: compacto ? 10 : 11,
              color: colors.textSecondary,
            }}
          />
          <TextWidget
            text={datos.gastos}
            maxLines={1}
            style={{
              fontFamily: fonts.monoSemiBold,
              fontSize: compacto ? 10 : 11,
              color: colors.text,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
