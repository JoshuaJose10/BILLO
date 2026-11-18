// Piezas comunes de los widgets. Sin Fragments: la librería no los soporta.
// Importa react-native-android-widget (falla en Expo Go): solo la cargan los archivos *Widget.js.
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import { crearEnlace } from '../utils/enlaces';
import { brillo, contenedor, titulo } from './estilos';
import { ALTO, FUENTE_BOTON, GAP, TACTIL } from './medidas';

// Rutas de Material Design Icons (24×24).
const ICONOS = {
  microfono:
    'M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z',
  menos: 'M19 13H5v-2h14v2z',
  mas: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  cartera:
    'M5 3C3.89 3 3 3.9 3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2.28A2 2 0 0 0 22 15V9a2 2 0 0 0-1-1.72V5a2 2 0 0 0-2-2H5m0 2h14v2h-6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6v2H5V5m8 4h7v6h-7V9m3 1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  tendencia: 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z',
};

export function Icono({ nombre, color, lado }) {
  return (
    <SvgWidget
      svg={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${color}" d="${ICONOS[nombre]}"/></svg>`}
      style={{ width: lado, height: lado }}
    />
  );
}

// Círculo de acento con el micrófono blanco y 0, 1 o 2 halos concéntricos (viewBox 100).
export function Mic({ colors, lado, anillos = 0 }) {
  const r = [50, 40, 34][anillos];
  const halos = [49, 42]
    .slice(0, anillos)
    .map((radio, i) => `<circle cx="50" cy="50" r="${radio}" fill-opacity="${0.1 + 0.08 * i}"/>`)
    .join('');
  const escala = (r * 1.1) / 24;
  const desde = 50 - 12 * escala;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="${colors.acento}">${halos}<circle cx="50" cy="50" r="${r}"/></g><path fill="${colors.textoSobreColor}" transform="translate(${desde} ${desde}) scale(${escala})" d="${ICONOS.microfono}"/></svg>`;
  return <SvgWidget svg={svg} style={{ width: lado, height: lado }} />;
}

// Tarjeta del widget: fondo sólido del tema y, encima, el tinte de marca con el contenido.
// `clic` va al fondo (clickAction y clickActionData de la librería).
export function Tarjeta({ colors, style, clic, children }) {
  return (
    <FlexWidget style={contenedor(colors)} {...clic}>
      <FlexWidget style={brillo(colors, style)}>{children}</FlexWidget>
    </FlexWidget>
  );
}

// Abre la hoja NuevoGasto por deep link (OPEN_URI), sin pasar por el task handler.
export const abrirHoja = (tipo, voz = false) => ({
  clickAction: 'OPEN_URI',
  clickActionData: { uri: crearEnlace({ tipo, voz }) },
});

const ACCIONES = {
  gasto: { tipo: 'gasto', icono: 'menos', texto: 'Gasto', tono: 'alerta' },
  ingreso: { tipo: 'ingreso', icono: 'mas', texto: 'Ingreso', tono: 'exito' },
  voz: { tipo: 'gasto', voz: true, icono: 'microfono', texto: 'Voz', tono: 'acento' },
};

// Botón de acción: ícono y, si cabe completo (widget/medidas), el texto; nunca «…». Sin texto, el
// nombre queda como etiqueta de accesibilidad. En fila reparte el ancho (48dp de alto); apilado
// ocupa todo el ancho de la columna (ALTO.boton).
export function Accion({ colors, accion, conTexto = true, apilada = false }) {
  const { tipo, voz, icono, texto, tono } = ACCIONES[accion];
  const color = colors[`${tono}Texto`];
  return (
    <FlexWidget
      {...abrirHoja(tipo, voz)}
      accessibilityLabel={texto}
      style={{
        ...(apilada ? { width: 'match_parent', height: ALTO.boton } : { flex: 1, height: TACTIL }),
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexGap: 4,
        borderRadius: 16,
        backgroundColor: colors[`${tono}Suave`],
      }}
    >
      <Icono nombre={icono} color={color} lado={16} />
      {conTexto ? (
        <TextWidget
          text={texto}
          maxLines={1}
          style={{ fontSize: FUENTE_BOTON, fontWeight: '600', color }}
        />
      ) : null}
    </FlexWidget>
  );
}

// Acciones (Gasto, Ingreso…) en fila repartidas a lo ancho, o `apiladas` una debajo de otra.
export function Acciones({ colors, acciones, conTexto, apiladas = false }) {
  return (
    <FlexWidget
      style={{ flexDirection: apiladas ? 'column' : 'row', flexGap: GAP, width: 'match_parent' }}
    >
      {acciones.map((accion) => (
        <Accion
          key={accion}
          colors={colors}
          accion={accion}
          conTexto={conTexto}
          apilada={apiladas}
        />
      ))}
    </FlexWidget>
  );
}

// Logo de Billo (cartera en un cuadro del color primario, como components/Logo) y «Billo».
export function Logo({ colors }) {
  return (
    <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 6, height: 20 }}>
      <FlexWidget
        style={{
          width: 20,
          height: 20,
          borderRadius: 6,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.primary,
        }}
      >
        <Icono nombre="cartera" color={colors.onPrimary} lado={13} />
      </FlexWidget>
      <TextWidget text="Billo" style={titulo(colors, 13)} />
    </FlexWidget>
  );
}
