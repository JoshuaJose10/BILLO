import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

// Panel flotante dentro de una hoja inferior (selector de método de pago, fecha o nota).
// Se dibuja encima del contenido de la hoja; tocar el fondo oscuro lo cierra.
export default function PanelHoja({ titulo, onCerrar, children }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        style={styles.fondo}
        onPress={onCerrar}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
      />
      <View style={styles.panel}>
        <View style={styles.cabecera}>
          <Text style={styles.titulo}>{titulo}</Text>
          <Pressable
            onPress={onCerrar}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
          >
            <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  panel: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titulo: {
    fontFamily: fonts.sansBold,
    color: colors.text,
    fontSize: 18,
  },
});
