import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';

// Panel flotante dentro de una hoja inferior (selector de método de pago, fecha, moneda o nota).
// Se dibuja encima del contenido de la hoja; su altura se acota al espacio disponible de la hoja
// y hace scroll interno si las opciones superan esa altura; tocar el fondo oscuro lo cierra.
export default function PanelHoja({ titulo, onCerrar, children }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  return (
    <View style={styles.contenedor}>
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
        <ScrollView
          style={styles.cuerpoScroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    contenedor: {
      ...StyleSheet.absoluteFillObject,
      padding: 16,
      justifyContent: 'flex-start',
    },
    fondo: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.scrim,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
    },
    panel: {
      maxHeight: '100%',
      flexShrink: 1,
      padding: 20,
      borderRadius: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cuerpoScroll: {
      flexGrow: 0,
      flexShrink: 1,
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
      lineHeight: 24,
    },
  });
