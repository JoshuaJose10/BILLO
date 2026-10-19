import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme/colors';

// Botón principal tipo píldora. Con `cargando` muestra un spinner y no responde a toques.
export default function Boton({ titulo, onPress, cargando = false, disabled = false, icono }) {
  const inactivo = cargando || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      style={({ pressed }) => [
        styles.boton,
        pressed && !inactivo ? styles.presionado : null,
        inactivo ? styles.inactivo : null,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <>
          <Text style={styles.texto}>{titulo}</Text>
          {icono ? (
            <MaterialCommunityIcons name={icono} size={20} color={colors.onPrimary} />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    width: '100%',
    height: 52,
    borderRadius: 999,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  presionado: {
    opacity: 0.85,
  },
  inactivo: {
    opacity: 0.6,
  },
  texto: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
});
