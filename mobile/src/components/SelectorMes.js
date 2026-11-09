import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { mesActual, sumarMeses } from '../utils/fechas';
import { MONEDA, nombreMesAnio } from '../utils/formato';

// "< Octubre 2026 · MXN >" (Stitch: movimientos_modo_oscuro, "Month Switcher").
// `mes` es "YYYY-MM". El botón siguiente se deshabilita en `mesMaximo` (por defecto el
// mes actual: no hay meses futuros).
// `calendario` (Reportes, HU-81): estilo del Stitch reportes_modo_oscuro/_claro, con ícono de
// calendario antes del mes y flechas sin fondo, en lugar del punto y "MXN".
export default function SelectorMes({
  mes,
  onCambiar,
  mesMaximo = mesActual(),
  calendario = false,
}) {
  const haySiguiente = mes < mesMaximo;
  const titulo = nombreMesAnio(mes);
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);

  return (
    <View style={[styles.barra, calendario ? styles.barraCalendario : null]}>
      <BotonMes
        icono="chevron-left"
        etiqueta="Mes anterior"
        activo
        sinFondo={calendario}
        onPress={() => onCambiar(sumarMeses(mes, -1))}
      />
      <View style={styles.centro} accessibilityRole="header" accessibilityLabel={titulo}>
        {calendario ? (
          <MaterialCommunityIcons name="calendar-today" size={16} color={colors.textVariant} />
        ) : null}
        <Text style={styles.titulo}>{titulo}</Text>
        {calendario ? null : (
          <>
            <View style={styles.punto} />
            <Text style={styles.moneda}>{MONEDA}</Text>
          </>
        )}
      </View>
      <BotonMes
        icono="chevron-right"
        etiqueta="Mes siguiente"
        activo={haySiguiente}
        sinFondo={calendario}
        onPress={() => onCambiar(sumarMeses(mes, 1))}
      />
    </View>
  );
}

function BotonMes({ icono, etiqueta, activo, sinFondo = false, onPress }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
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
        sinFondo ? styles.botonSinFondo : null,
        !activo ? styles.botonInactivo : null,
        pressed && activo ? styles.botonPresionado : null,
      ]}
    >
      <MaterialCommunityIcons name={icono} size={20} color={colors.textVariant} />
    </Pressable>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
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
    // px-space-md py-space-xs rounded-full bg-surface-container-low con brillo interior
    barraCalendario: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderTopWidth: 1,
      borderTopColor: colors.borderTop,
    },
    boton: {
      width: 32,
      height: 32,
      borderRadius: radios.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.glass05,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    botonSinFondo: {
      backgroundColor: 'transparent',
    },
    botonInactivo: {
      opacity: 0.3,
    },
    // active:scale-90; activo con borde y fondo translúcido del acento.
    botonPresionado: {
      transform: [{ scale: 0.9 }],
      backgroundColor: colors.acentoSuave,
      borderColor: colors.acento,
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
      backgroundColor: colors.primary40,
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
