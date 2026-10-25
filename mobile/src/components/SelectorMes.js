import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radios } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { mesActual, sumarMeses } from '../utils/fechas';
import { MONEDA, nombreMesAnio } from '../utils/formato';

// "< Octubre 2026 · MXN >" (Stitch: movimientos_modo_oscuro, "Month Switcher").
// `mes` es "YYYY-MM". El botón siguiente se deshabilita en `mesMaximo` (por defecto el
// mes actual: no hay meses futuros).
export default function SelectorMes({ mes, onCambiar, mesMaximo = mesActual() }) {
  const haySiguiente = mes < mesMaximo;
  const titulo = nombreMesAnio(mes);

  return (
    <View style={styles.barra}>
      <BotonMes
        icono="chevron-left"
        etiqueta="Mes anterior"
        activo
        onPress={() => onCambiar(sumarMeses(mes, -1))}
      />
      <View style={styles.centro} accessibilityRole="header" accessibilityLabel={titulo}>
        <Text style={styles.titulo}>{titulo}</Text>
        <View style={styles.punto} />
        <Text style={styles.moneda}>{MONEDA}</Text>
      </View>
      <BotonMes
        icono="chevron-right"
        etiqueta="Mes siguiente"
        activo={haySiguiente}
        onPress={() => onCambiar(sumarMeses(mes, 1))}
      />
    </View>
  );
}

function BotonMes({ icono, etiqueta, activo, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!activo}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: !activo }}
      style={({ pressed }) => [
        styles.boton,
        !activo ? styles.botonInactivo : null,
        pressed && activo ? styles.botonPresionado : null,
      ]}
    >
      <MaterialCommunityIcons name={icono} size={20} color={colors.textVariant} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // flex items-center justify-between bg-surface-container-low px-space-sm py-1.5 rounded-full
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radios.full,
    backgroundColor: colors.surfaceLow,
  },
  // w-8 h-8 rounded-full (con fondo para que se lea como botón circular)
  boton: {
    width: 32,
    height: 32,
    borderRadius: radios.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass05,
  },
  botonInactivo: {
    opacity: 0.3,
  },
  // active:scale-90
  botonPresionado: {
    transform: [{ scale: 0.9 }],
  },
  // flex items-center gap-2
  centro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // font-headline-sm text-headline-sm text-primary tracking-tight
  titulo: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.18,
    color: colors.text,
  },
  // w-1.5 h-1.5 rounded-full bg-primary/40
  punto: {
    width: 6,
    height: 6,
    borderRadius: radios.full,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  // font-label-caps text-label-caps text-on-surface-variant
  moneda: {
    fontFamily: fonts.monoMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.88,
    color: colors.textVariant,
  },
});
