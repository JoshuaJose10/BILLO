import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { degradadoCategoria, sombraCategoria } from '../theme/categorias';
import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { iconoCategoria } from '../utils/categorias';

// Ícono de categoría (Luminal Glow, 07_inicio_oscuro y 07_inicio_claro): squircle w-10 h-10
// rounded-2xl con degradado diagonal del color de la categoría (uno por tema), reflejo blanco
// arriba, glifo blanco y sombra suave del mismo color (intensidad por tema). La sombra va en el contenedor exterior: con overflow hidden iOS la
// recortaría.
export default function IconoCategoria({ nombre }) {
  const { colors, esOscuro } = useTema();
  const styles = useEstilos(crearEstilos);
  return (
    <View style={[styles.sombra, { shadowColor: sombraCategoria(nombre, esOscuro) }]}>
      <LinearGradient
        colors={degradadoCategoria(nombre, esOscuro)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.icono}
      >
        <LinearGradient
          colors={[colors.brilloIcono, colors.brilloIconoFin]}
          style={styles.reflejo}
        />
        <MaterialCommunityIcons
          name={iconoCategoria(nombre)}
          size={20}
          color={colors.textoSobreColor}
        />
      </LinearGradient>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    sombra: {
      borderRadius: radios['2xl'],
      shadowOffset: { width: 0, height: colors.iconoSombraY },
      shadowRadius: colors.iconoSombraRadio,
      shadowOpacity: colors.iconoSombraOpacidad,
    },
    icono: {
      width: 40,
      height: 40,
      borderRadius: radios['2xl'],
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Mitad superior: blanco translúcido que se desvanece hacia abajo.
    reflejo: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 20,
    },
  });
