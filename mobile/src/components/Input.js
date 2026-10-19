import { MaterialCommunityIcons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

// Campo con etiqueta en mayúsculas, ícono a la izquierda y error debajo.
// `password` agrega el botón de ojo; `pie` se muestra entre el campo y el error.
const Input = forwardRef(function Input({ etiqueta, icono, error, password, pie, ...props }, ref) {
  const [oculto, setOculto] = useState(true);

  return (
    <View style={styles.contenedor}>
      {etiqueta ? <Text style={styles.etiqueta}>{etiqueta}</Text> : null}
      <View style={[styles.campo, error ? styles.campoError : null]}>
        {icono ? (
          <MaterialCommunityIcons
            name={icono}
            size={20}
            color={error ? colors.error : colors.textSecondary}
          />
        ) : null}
        <TextInput
          ref={ref}
          style={styles.input}
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.text}
          secureTextEntry={password ? oculto : false}
          autoCorrect={false}
          {...props}
        />
        {password ? (
          <Pressable
            onPress={() => setOculto((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={oculto ? 'Mostrar contraseña' : 'Ocultar contraseña'}
          >
            <MaterialCommunityIcons
              name={oculto ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
      {pie}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

export default Input;

const styles = StyleSheet.create({
  contenedor: {
    marginBottom: 18,
  },
  etiqueta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  campoError: {
    borderColor: colors.error,
  },
  input: {
    fontFamily: fonts.sans,
    flex: 1,
    height: '100%',
    color: colors.text,
    fontSize: 16,
  },
  error: {
    fontFamily: fonts.sans,
    color: colors.error,
    fontSize: 13,
    marginTop: 6,
  },
});
