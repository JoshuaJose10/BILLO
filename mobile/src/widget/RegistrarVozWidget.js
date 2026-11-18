// Sin Fragments: la librería no los soporta.
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { etiqueta, titulo } from './estilos';
import { PADDING, textoRegistrarVoz } from './medidas';
import { abrirHoja, Mic, Tarjeta } from './piezas';

// «Registrar por voz» (2×1, solo voz): todo el widget abre Nuevo gasto dictando (el dictado pasa
// solo a Ingreso si lo dicho suena a ingreso). Micrófono con halo y, si caben, los textos.
// `ancho` y `alto` son el tamaño real del widget (dp).
// Solo se carga desde widgetTaskHandler.js (importa react-native-android-widget).
export default function RegistrarVozWidget({ colors, ancho = 0, alto = 0 }) {
  const lado = Math.max(40, Math.min(64, alto - 2 * PADDING));
  const conTexto = textoRegistrarVoz({ ancho, lado });
  return (
    <Tarjeta
      colors={colors}
      clic={abrirHoja('gasto', true)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: conTexto ? 'flex-start' : 'center',
        flexGap: 12,
      }}
    >
      <Mic colors={colors} lado={lado} anillos={1} />
      {conTexto ? (
        <FlexWidget style={{ flex: 1 }}>
          <TextWidget text="Registrar por voz" maxLines={1} truncate="END" style={titulo(colors)} />
          <TextWidget text="Toca y dilo" maxLines={1} truncate="END" style={etiqueta(colors)} />
        </FlexWidget>
      ) : null}
    </Tarjeta>
  );
}
