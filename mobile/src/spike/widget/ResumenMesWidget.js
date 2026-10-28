import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { colors } from '../../theme/colors';

// HU-23 (spike RF13): widget mínimo de Android. Muestra un texto fijo y el dato que la app
// guardó en datoWidget. Usa la fuente del sistema: las de la app requieren declararlas en
// la opción `fonts` del plugin.
// Este archivo importa react-native-android-widget, que falla en Expo Go: solo se carga con
// require desde modulosNativos.js o widgetTaskHandler.js.
export default function ResumenMesWidget({ dato }) {
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
        text="BILLO · TOTAL DEL MES"
        style={{ fontSize: 12, letterSpacing: 0.1, color: colors.textSecondary }}
      />
      <TextWidget
        text={dato || 'Sin datos: abre Billo'}
        style={{ fontSize: 26, fontWeight: '700', color: colors.text, marginTop: 4 }}
      />
    </FlexWidget>
  );
}
