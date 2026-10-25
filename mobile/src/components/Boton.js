import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

// Botón principal tipo píldora. Con `cargando` muestra un spinner y no responde a toques.
// `compacto`: variante de la hoja Nuevo gasto en Stitch (h-12, texto 14 semibold
// tracking-tight, ícono 18, gap-1.5 y brillo blanco).
// `grande`: variante de Login y Registro en Stitch (h-14 rounded-2xl, headline-sm en
// on-primary, mt-3 y shadow-lg shadow-primary/5).
// `secundario`: sin relleno, con borde y texto claro (acciones como "Cerrar sesión").
export default function Boton({
  titulo,
  onPress,
  cargando = false,
  disabled = false,
  icono,
  compacto = false,
  grande = false,
  secundario = false,
}) {
  const inactivo = cargando || disabled;
  const colorContenido = secundario
    ? colors.text
    : grande
      ? colors.onPrimaryMuted
      : colors.onPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      style={({ pressed }) => [
        styles.boton,
        compacto ? styles.botonCompacto : null,
        grande ? styles.botonGrande : null,
        secundario ? styles.botonSecundario : null,
        pressed && !inactivo ? (grande ? styles.presionadoGrande : styles.presionado) : null,
        inactivo ? styles.inactivo : null,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={colorContenido} />
      ) : (
        <>
          <Text
            style={[
              styles.texto,
              compacto ? styles.textoCompacto : null,
              grande ? styles.textoGrande : null,
              secundario ? styles.textoSecundario : null,
            ]}
          >
            {titulo}
          </Text>
          {icono ? (
            <MaterialCommunityIcons name={icono} size={compacto ? 18 : 20} color={colorContenido} />
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
  // h-14 rounded-2xl mt-3 gap-2 shadow-lg shadow-primary/5 (0 10px 15px -3px)
  botonGrande: {
    height: 56,
    borderRadius: 16,
    marginTop: 12,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 7.5,
    shadowOpacity: 0.05,
  },
  // bg-white/[0.07] border border-white/10 (como el botón de cerrar de las hojas)
  botonSecundario: {
    backgroundColor: colors.glass07,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  presionado: {
    opacity: 0.85,
  },
  // active:scale-[0.98]
  presionadoGrande: {
    transform: [{ scale: 0.98 }],
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
  // headline-sm: Inter 600 18/24, tracking -0.01em
  textoGrande: {
    fontFamily: fonts.sansSemiBold,
    color: colors.onPrimaryMuted,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.18,
  },
  textoSecundario: {
    color: colors.text,
  },
});
