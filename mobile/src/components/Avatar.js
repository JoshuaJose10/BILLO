import { StyleSheet, Text, View } from 'react-native';

import { radios } from '../theme/colors';
import { useEstilos } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';

// Inicial del primer nombre en mayúscula ("ana lópez" → "A"); "?" si no hay nombre.
export const inicialDe = (nombre) => (nombre || '').trim().charAt(0).toUpperCase() || '?';

// Círculo con la inicial del usuario. `tamano` en px (40 en Inicio, más grande en Perfil).
export default function Avatar({ nombre, tamano = 40 }) {
  const styles = useEstilos(crearEstilos);
  return (
    <View style={[styles.avatar, { width: tamano, height: tamano }]}>
      <Text style={[styles.texto, { fontSize: tamano * 0.45, lineHeight: tamano * 0.6 }]}>
        {inicialDe(nombre)}
      </Text>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // rounded-full bg-surface-container-high
    avatar: {
      borderRadius: radios.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceHigh,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderTopAvatar,
    },
    // font-headline-sm text-primary
    texto: {
      fontFamily: fonts.sansSemiBold,
      color: colors.text,
    },
  });
