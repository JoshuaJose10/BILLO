import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { temas } from '../theme/colors';
import { TEXTO_SIN_DATOS } from '../utils/widgetResumen';

// El widget se dibuja fuera del árbol de React (sin TemaProvider) y conserva el tema oscuro.
const colors = temas.oscuro;

// HU-58 (RF13): total del mes, o «Abre Billo» si no hay dato (sin sesión, mes nuevo o error).
// Al tocarlo abre la app. Usa la fuente del sistema: las de la app requieren declararlas en la
// opción `fonts` del plugin.
// Este archivo importa react-native-android-widget, que falla en Expo Go: solo se carga con
// require desde modulosNativos.js o widgetTaskHandler.js.
export default function ResumenMesWidget({ titulo = 'BILLO', monto = null }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 24,
        backgroundColor: colors.surfaceLowest,
      }}
    >
      <TextWidget
        text={titulo}
        style={{ fontSize: 12, letterSpacing: 0.1, color: colors.textSecondary }}
      />
      <TextWidget
        text={monto ?? TEXTO_SIN_DATOS}
        style={{ fontSize: monto ? 26 : 20, fontWeight: '700', color: colors.text, marginTop: 4 }}
      />
    </FlexWidget>
  );
}
