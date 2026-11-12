import * as Haptics from 'expo-haptics';
import { forwardRef, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import Etiqueta from './Etiqueta';
import { TextoError } from './Input';
import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { useSacudida } from '../hooks/useSacudida';
import { LARGO_CODIGO, limpiarCodigo } from '../utils/recuperacion';

// Código de un solo uso en casillas (estilo OTP). Un solo TextInput transparente encima de las
// casillas recibe los toques, el pegado y el autocompletado del sistema (iOS: código del correo
// o SMS con oneTimeCode; Android: sms-otp). Las casillas solo dibujan el valor.
const CampoCodigo = forwardRef(function CampoCodigo(
  { etiqueta, value, onChangeText, error, ...props },
  ref,
) {
  const { colors, esOscuro } = useTema();
  const styles = useEstilos(crearEstilos);
  const [enfocado, setEnfocado] = useState(false);
  // Sacudida corta y vibración al aparecer un error.
  const { estilo: estiloSacudida, sacudir } = useSacudida();

  useEffect(() => {
    if (!error) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    sacudir();
  }, [error, sacudir]);

  return (
    <View style={styles.contenedor}>
      {etiqueta ? <Etiqueta style={styles.etiqueta}>{etiqueta}</Etiqueta> : null}
      <Animated.View style={[styles.fila, estiloSacudida]}>
        {Array.from({ length: LARGO_CODIGO }, (_, i) => (
          <View
            key={i}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.casilla,
              enfocado && i === Math.min(value.length, LARGO_CODIGO - 1) ? styles.activa : null,
              error ? styles.casillaError : null,
            ]}
          >
            <Text style={styles.digito}>{value[i] ?? ''}</Text>
          </View>
        ))}
        <TextInput
          ref={ref}
          style={styles.entrada}
          value={value}
          onChangeText={(texto) => onChangeText(limpiarCodigo(texto))}
          maxLength={LARGO_CODIGO}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          keyboardAppearance={esOscuro ? 'dark' : 'light'}
          caretHidden
          selectionColor={colors.text}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          accessibilityLabel={`${etiqueta ?? 'Código'}, ${LARGO_CODIGO} dígitos`}
          accessibilityHint={error}
          {...props}
        />
      </Animated.View>
      {error ? <TextoError>{error}</TextoError> : null}
    </View>
  );
});

export default CampoCodigo;

const crearEstilos = (colors) =>
  StyleSheet.create({
    // Mismo ritmo que Input: gap-4 entre campos y etiqueta label-caps con mb-1.
    contenedor: {
      marginBottom: 16,
    },
    etiqueta: {
      letterSpacing: 0.55,
      marginBottom: 4,
    },
    fila: {
      flexDirection: 'row',
      gap: 8,
    },
    // Casillas del alto del Input (52) con su fondo; activa y error como el Input enfocado/con error.
    casilla: {
      flex: 1,
      height: 52,
      borderRadius: radios.xl,
      backgroundColor: colors.surfaceInput,
      borderWidth: 1,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    activa: {
      backgroundColor: colors.surfaceHigh,
      borderColor: colors.acento,
    },
    casillaError: {
      borderColor: colors.alertaTexto,
    },
    digito: {
      fontFamily: fonts.monoMedium,
      color: colors.text,
      fontSize: 22,
    },
    // Cubre toda la fila para que cualquier toque (o mantener para pegar) llegue al campo real.
    entrada: {
      ...StyleSheet.absoluteFill,
      color: 'transparent',
      opacity: 0.02,
    },
  });
