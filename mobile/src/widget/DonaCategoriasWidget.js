// Sin Fragments: la librería no los soporta.
import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import { temas } from '../theme/colors';
import { generarSvgDonaWidget, TEXTO_SIN_DATOS_CORTO, URIS_WIDGETS } from '../utils/widgetResumen';
import { etiqueta, pastilla, titulo } from './estilos';
import { esMediano, FUENTE_CHIP } from './medidas';
import { Logo, Tarjeta } from './piezas';

// Widget «Dona por categoría» (feature/widgets-billo):
// Dibuja la dona con las categorías del mes (máximo 5 segmentos y «Otras») usando SvgWidget y el
// total al centro. Se adapta a 2×2 y 4×2 sin texto cortado. Al tocarlo abre Reportes › Gastos.
export default function DonaCategoriasWidget({
  colors = temas.oscuro,
  oscuro = true,
  vista = null,
  datos: datosProp = null,
  ancho = 260,
}) {
  const datos = (oscuro ? vista?.donaOscuro : vista?.donaClaro) ?? datosProp;
  const mediano = esMediano(ancho);
  const vacio = !datos || datos.vacio;
  const clic = {
    clickAction: 'OPEN_URI',
    clickActionData: { uri: URIS_WIDGETS.DonaCategorias },
  };

  if (vacio) {
    return (
      <Tarjeta colors={colors} clic={clic} style={{ justifyContent: 'space-between' }}>
        <Logo colors={colors} />
        <FlexWidget style={{ width: 'match_parent' }}>
          <TextWidget text="Dona por categoría" style={etiqueta(colors, FUENTE_CHIP)} />
          <TextWidget
            text={TEXTO_SIN_DATOS_CORTO}
            maxLines={1}
            style={titulo(colors, mediano ? 20 : 16)}
          />
        </FlexWidget>
      </Tarjeta>
    );
  }

  const ladoDona = mediano ? 88 : 74;
  const svgString =
    datos.svg && mediano
      ? datos.svg
      : generarSvgDonaWidget(datos.segmentos, {
          esOscuro: oscuro,
          lado: ladoDona,
          grosor: mediano ? 12 : 10,
        });
  const principal = datos.segmentos?.[0] ?? null;

  return (
    <Tarjeta
      colors={colors}
      clic={clic}
      style={{
        flexDirection: mediano ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <OverlapWidget style={{ width: ladoDona, height: ladoDona }}>
        <SvgWidget svg={svgString} style={{ width: ladoDona, height: ladoDona }} />
        <FlexWidget
          style={{
            width: ladoDona,
            height: ladoDona,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 8,
          }}
        >
          <TextWidget text={datos.mesCorto || 'MES'} maxLines={1} style={etiqueta(colors, 9)} />
          <TextWidget
            text={datos.totalCompacto}
            maxLines={1}
            style={titulo(colors, mediano ? 11 : 10)}
          />
        </FlexWidget>
      </OverlapWidget>

      {!mediano ? (
        <FlexWidget style={pastilla(colors.surfaceHigh)}>
          {principal ? (
            <FlexWidget
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: principal.color,
              }}
            />
          ) : null}
          <TextWidget
            text={principal ? `${principal.nombre} ${principal.porcentaje}%` : 'Sin gastos'}
            maxLines={1}
            style={etiqueta(colors, FUENTE_CHIP)}
          />
        </FlexWidget>
      ) : (
        <FlexWidget
          style={{
            flex: 1,
            height: 'match_parent',
            flexDirection: 'column',
            justifyContent: 'center',
            marginLeft: 12,
          }}
        >
          <TextWidget
            text={datos.titulo}
            maxLines={1}
            style={{ ...etiqueta(colors, 10), marginBottom: 4 }}
          />
          {datos.segmentos.length === 0 ? (
            <TextWidget
              text="Sin gastos este mes"
              maxLines={1}
              style={etiqueta(colors, FUENTE_CHIP)}
            />
          ) : (
            datos.segmentos.map((seg) => (
              <FlexWidget
                key={seg.nombre}
                style={{
                  width: 'match_parent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginVertical: 1,
                }}
              >
                <FlexWidget
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexGap: 6,
                  }}
                >
                  <FlexWidget
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: seg.color,
                    }}
                  />
                  <TextWidget text={seg.nombre} maxLines={1} style={titulo(colors, FUENTE_CHIP)} />
                </FlexWidget>
                <TextWidget
                  text={`${seg.porcentaje}%`}
                  maxLines={1}
                  style={etiqueta(colors, FUENTE_CHIP)}
                />
              </FlexWidget>
            ))
          )}
        </FlexWidget>
      )}
    </Tarjeta>
  );
}
