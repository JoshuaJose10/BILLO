import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';

// Botón redondo de micrófono junto a Confirmar en Nuevo gasto (HU-57). Mismo alto que el botón
// compacto (48).
export default function BotonMicrofono({ onPress, disabled = false }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel="Dictar gasto"
      accessibilityHint="Di el monto y la categoría, por ejemplo: ochenta pesos en comida"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.boton,
        pressed && !disabled ? styles.presionado : null,
        disabled ? styles.inactivo : null,
      ]}
    >
      <MaterialCommunityIcons name="microphone" size={22} color={colors.text} />
    </Pressable>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    boton: {
      width: 48,
      height: 48,
      borderRadius: radios.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.glass07,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    presionado: {
      backgroundColor: colors.vozHalo,
      borderColor: colors.vozPulso,
    },
    inactivo: {
      opacity: 0.4,
    },
  });
