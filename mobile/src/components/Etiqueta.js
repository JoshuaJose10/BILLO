import { StyleSheet, Text } from 'react-native';

import { useEstilos } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';

// Etiqueta mono en mayúsculas (label-caps de Obsidian Luminescence). Otras props van al Text.
export default function Etiqueta({ children, style, ...props }) {
  const styles = useEstilos(crearEstilos);
  return (
    <Text {...props} style={[styles.etiqueta, style]}>
      {children}
    </Text>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // label-caps (Obsidian): JetBrains Mono 500, 11/14, tracking 0.08em, on-surface-variant
    etiqueta: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.88,
      textTransform: 'uppercase',
      color: colors.textVariant,
    },
  });
