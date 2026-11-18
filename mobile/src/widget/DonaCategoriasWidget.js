import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import { radios, temas } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { generarSvgDonaWidget, TEXTO_SIN_DATOS, URIS_WIDGETS } from '../utils/widgetResumen';

// Widget «Dona por categoría» (feature/widgets-billo):
// Dibuja la dona con las categorías del mes (máximo 5 segmentos y «Otras») usando SvgWidget y el
// total al centro. Se adapta a 2×2 y 4×2 sin texto cortado. Al tocarlo abre Reportes › Gastos.
export default function DonaCategoriasWidget({ datos = null, esOscuro = true, ancho = 260 }) {
  const colors = esOscuro ? temas.oscuro : temas.claro;
  const compacto = ancho > 0 && ancho < 220;
  const vacio = !datos || datos.vacio;

  if (vacio) {
    return (
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: URIS_WIDGETS.DonaCategorias }}
        accessibilityLabel={`Dona por categoría: ${TEXTO_SIN_DATOS}`}
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
          text="BILLO · CATEGORÍAS"
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
            text="Ver gastos por categoría"
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

  const ladoDona = compacto ? 74 : 88;
  const svgString =
    datos.svg && !compacto
      ? datos.svg
      : generarSvgDonaWidget(datos.segmentos, {
          esOscuro,
          lado: ladoDona,
          grosor: compacto ? 10 : 12,
        });
  const principal = datos.segmentos?.[0] ?? null;

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: URIS_WIDGETS.DonaCategorias }}
      accessibilityLabel={`${datos.titulo}: Total ${datos.total}`}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: compacto ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: compacto ? 10 : 12,
        borderRadius: radios.tarjeta,
        backgroundColor: colors.surfaceLowest,
        borderWidth: 1,
        borderColor: colors.borderStrong,
      }}
    >
      {/* Anillo SVG con el total al centro */}
      <OverlapWidget
        style={{
          width: ladoDona,
          height: ladoDona,
        }}
      >
        <SvgWidget
          svg={svgString}
          style={{
            width: ladoDona,
            height: ladoDona,
          }}
        />
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
          <TextWidget
            text={datos.mesCorto || 'MES'}
            maxLines={1}
            style={{
              fontFamily: fonts.monoMedium,
              fontSize: 8,
              color: colors.textSecondary,
            }}
          />
          <TextWidget
            text={datos.totalCompacto}
            maxLines={1}
            style={{
              fontFamily: fonts.monoBold,
              fontSize: compacto ? 10 : 11,
              fontWeight: '700',
              color: colors.text,
            }}
          />
        </FlexWidget>
      </OverlapWidget>

      {compacto ? (
        <FlexWidget
          style={{
            width: 'match_parent',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 4,
          }}
        >
          {principal ? (
            <FlexWidget
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: principal.color,
                marginRight: 5,
              }}
            />
          ) : null}
          <TextWidget
            text={principal ? `${principal.nombre} ${principal.porcentaje}%` : 'Sin gastos'}
            maxLines={1}
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 10,
              color: colors.text,
            }}
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
            style={{
              fontFamily: fonts.monoMedium,
              fontSize: 9,
              color: colors.textSecondary,
              marginBottom: 4,
            }}
          />
          {datos.segmentos.length === 0 ? (
            <TextWidget
              text="Sin gastos este mes"
              maxLines={1}
              style={{
                fontFamily: fonts.sans,
                fontSize: 11,
                color: colors.textSecondary,
              }}
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
                  }}
                >
                  <FlexWidget
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 4,
                      backgroundColor: seg.color,
                      marginRight: 6,
                    }}
                  />
                  <TextWidget
                    text={seg.nombre}
                    maxLines={1}
                    style={{
                      fontFamily: fonts.sansMedium,
                      fontSize: 11,
                      color: colors.text,
                    }}
                  />
                </FlexWidget>
                <TextWidget
                  text={`${seg.porcentaje}%`}
                  maxLines={1}
                  style={{
                    fontFamily: fonts.monoSemiBold,
                    fontSize: 10,
                    color: colors.textSecondary,
                    marginLeft: 6,
                  }}
                />
              </FlexWidget>
            ))
          )}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
