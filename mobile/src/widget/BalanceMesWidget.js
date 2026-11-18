// Sin Fragments: la librería no los soporta.
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { temas } from '../theme/colors';
import { TEXTO_SIN_DATOS_CORTO, URIS_WIDGETS } from '../utils/widgetResumen';
import { etiqueta, pastilla, titulo } from './estilos';
import { esMediano, FUENTE_CHIP, GAP } from './medidas';
import { Logo, Tarjeta } from './piezas';

// Widget «Balance del mes» (feature/widgets-billo):
// Muestra ingresos, gastos y balance del mes (verde si positivo, rojo si negativo) en 2×2 y 4×2.
// Al tocarlo abre Reportes › Balance.
export default function BalanceMesWidget({
  colors = temas.oscuro,
  vista = null,
  datos: datosProp = null,
  ancho = 260,
}) {
  const datos = vista?.balance ?? datosProp;
  const mediano = esMediano(ancho);
  const vacio = !datos || datos.vacio;
  const clic = {
    clickAction: 'OPEN_URI',
    clickActionData: { uri: URIS_WIDGETS.BalanceMes },
  };

  if (vacio) {
    return (
      <Tarjeta colors={colors} clic={clic} style={{ justifyContent: 'space-between' }}>
        <Logo colors={colors} />
        <FlexWidget style={{ width: 'match_parent' }}>
          <TextWidget text="Balance del mes" style={etiqueta(colors, FUENTE_CHIP)} />
          <TextWidget
            text={TEXTO_SIN_DATOS_CORTO}
            maxLines={1}
            style={titulo(colors, mediano ? 20 : 16)}
          />
        </FlexWidget>
      </Tarjeta>
    );
  }

  const esPositivo = datos.estado === 'positivo';
  const esNegativo = datos.estado === 'negativo';
  const colorBalance = esPositivo
    ? colors.exitoTexto
    : esNegativo
      ? colors.alertaTexto
      : colors.text;
  const fondoEstado = esPositivo
    ? colors.exitoSuave
    : esNegativo
      ? colors.alertaSuave
      : colors.surfaceHigh;

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
        <FlexWidget style={pastilla(fondoEstado)}>
          <TextWidget
            text={esPositivo ? 'Positivo' : esNegativo ? 'Negativo' : 'Neutro'}
            maxLines={1}
            style={{
              fontSize: FUENTE_CHIP,
              fontWeight: '600',
              color: colorBalance,
            }}
          />
        </FlexWidget>
      </FlexWidget>

      <FlexWidget style={{ width: 'match_parent' }}>
        <TextWidget
          text={mediano ? datos.titulo : `BALANCE · ${datos.mesCorto}`}
          maxLines={1}
          style={etiqueta(colors, FUENTE_CHIP)}
        />
        <TextWidget
          text={mediano ? datos.balance : datos.balanceCompacto}
          maxLines={1}
          style={{
            fontSize: mediano ? 24 : 18,
            fontWeight: '700',
            color: colorBalance,
          }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          width: 'match_parent',
          flexDirection: mediano ? 'row' : 'column',
          alignItems: mediano ? 'center' : 'flex-start',
          justifyContent: 'space-between',
          flexGap: GAP,
        }}
      >
        <FlexWidget style={pastilla(colors.exitoSuave)}>
          <TextWidget
            text={`Ing ${datos.ingresos}`}
            maxLines={1}
            style={{ fontSize: FUENTE_CHIP, fontWeight: '600', color: colors.exitoTexto }}
          />
        </FlexWidget>
        <FlexWidget style={pastilla(colors.surfaceHigh)}>
          <TextWidget
            text={`Gas ${datos.gastos}`}
            maxLines={1}
            style={{ fontSize: FUENTE_CHIP, fontWeight: '600', color: colors.text }}
          />
        </FlexWidget>
      </FlexWidget>
    </Tarjeta>
  );
}
