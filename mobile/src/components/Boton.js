import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

// Botón principal tipo píldora. Con `cargando` muestra un spinner y no responde a toques.
// `compacto`: variante de la hoja Nuevo gasto en Stitch (h-12, texto 14 semibold
// tracking-tight, ícono 18, gap-1.5 y brillo blanco).
export default function Boton({
  titulo,
  onPress,
  cargando = false,
  disabled = false,
  icono,
  compacto = false,
}) {
  const inactivo = cargando || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      style={({ pressed }) => [
        styles.boton,
        compacto ? styles.botonCompacto : null,
        pressed && !inactivo ? styles.presionado : null,
        inactivo ? styles.inactivo : null,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <>
          <Text style={[styles.texto, compacto ? styles.textoCompacto : null]}>{titulo}</Text>
          {icono ? (
            <MaterialCommunityIcons
              name={icono}
              size={compacto ? 18 : 20}
              color={colors.onPrimary}
            />
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
  // shadow-[0_0_30px_rgba(255,255,255,0.25)]
  botonCompacto: {
    height: 48,
    gap: 6,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 15,
    shadowOpacity: 0.25,
  },
  presionado: {
    opacity: 0.85,
  },
  inactivo: {
    opacity: 0.6,
  },
  texto: {
    fontFamily: fonts.sansBold,
    color: colors.onPrimary,
    fontSize: 16,
  },
  textoCompacto: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    letterSpacing: -0.35,
  },
});
