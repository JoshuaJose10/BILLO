import { MaterialCommunityIcons } from '@expo/vector-icons';
import { forwardRef, useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import Etiqueta from './Etiqueta';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';

// Campo con etiqueta en mayúsculas, ícono a la izquierda y error debajo.
// `password` agrega el botón de ojo; `limpiable`, una X que vacía el campo cuando tiene texto;
// `pie` se muestra entre el campo y el error.
const Input = forwardRef(function Input(
  { etiqueta, icono, error, password, limpiable, pie, onFocus, onBlur, ...props },
  ref,
) {
  const [oculto, setOculto] = useState(true);
  const [enfocado, setEnfocado] = useState(false);
  const { colors, esOscuro } = useTema();
  const styles = useEstilos(crearEstilos);

  return (
    <View style={styles.contenedor}>
      {etiqueta ? <Etiqueta style={styles.etiqueta}>{etiqueta}</Etiqueta> : null}
      <View
        style={[
          styles.campo,
          password || limpiable ? styles.campoPassword : null,
          enfocado ? styles.campoEnfocado : null,
          error ? styles.campoError : null,
        ]}
      >
        {icono ? (
          <MaterialCommunityIcons
            name={icono}
            size={20}
            color={error ? colors.alertaTexto : colors.outline}
          />
        ) : null}
        <TextInput
          ref={ref}
          style={[styles.input, password ? styles.inputPassword : null]}
          placeholderTextColor={colors.outline}
          selectionColor={colors.text}
          keyboardAppearance={esOscuro ? 'dark' : 'light'}
          secureTextEntry={password ? oculto : false}
          autoCorrect={false}
          onFocus={(e) => {
            setEnfocado(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setEnfocado(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {password ? (
          <Pressable
            onPress={() => setOculto((v) => !v)}
            hitSlop={6}
            style={styles.ojo}
            accessibilityRole="button"
            accessibilityLabel={oculto ? 'Mostrar contraseña' : 'Ocultar contraseña'}
          >
            {({ pressed }) => (
              <MaterialCommunityIcons
                name={oculto ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={pressed ? colors.text : colors.outline}
              />
            )}
          </Pressable>
        ) : null}
        {limpiable && props.value ? (
          <Pressable
            onPress={() => props.onChangeText?.('')}
            hitSlop={6}
            style={styles.ojo}
            accessibilityRole="button"
            accessibilityLabel="Borrar texto"
          >
            {({ pressed }) => (
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={pressed ? colors.text : colors.outline}
              />
            )}
          </Pressable>
        ) : null}
      </View>
      {pie}
      {error ? <TextoError>{error}</TextoError> : null}
    </View>
  );
});

export default Input;

// Mensaje de error que el lector de pantalla anuncia al aparecer o cambiar. Debajo de un campo,
// o centrado sobre el botón principal con `formulario` (errores de la API).
export function TextoError({ children, formulario = false }) {
  const styles = useEstilos(crearEstilos);
  useEffect(() => {
    if (children) AccessibilityInfo.announceForAccessibility(children);
  }, [children]);
  return <Text style={formulario ? styles.errorFormulario : styles.error}>{children}</Text>;
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // gap-4 entre campos del formulario
    contenedor: {
      marginBottom: 16,
    },
    // label-caps + tracking-wider (0.05em) + mb-1
    etiqueta: {
      letterSpacing: 0.55,
      marginBottom: 4,
    },
    // h-[52px] bg-surface-container/90 rounded-xl; ícono en left-4, texto en pl-12, pr-4
    campo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      height: 52,
      paddingLeft: 16,
      paddingRight: 16,
      borderRadius: 12,
      backgroundColor: colors.surfaceInput,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    // pr-12 con el botón de ojo en right-3 (w-8 h-8)
    campoPassword: {
      paddingRight: 12,
    },
    // focus:bg-surface-container-high con borde del acento
    campoEnfocado: {
      backgroundColor: colors.surfaceHigh,
      borderColor: colors.acento,
    },
    campoError: {
      borderColor: colors.alerta,
    },
    // body-md: Inter 400 14, text-primary
    input: {
      fontFamily: fonts.sans,
      flex: 1,
      height: '100%',
      color: colors.text,
      fontSize: 14,
      paddingVertical: 0,
    },
    // tracking-widest
    inputPassword: {
      letterSpacing: 1.4,
    },
    ojo: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    error: {
      fontFamily: fonts.sans,
      color: colors.alertaTexto,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 6,
      paddingHorizontal: 4,
    },
    errorFormulario: {
      fontFamily: fonts.sans,
      color: colors.alertaTexto,
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 12,
    },
  });
