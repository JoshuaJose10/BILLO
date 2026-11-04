import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { useAlturaNavbar } from './NavbarFlotante';

// Placeholder de las pestañas que aún no se implementan.
// `incrustada`: dentro de una sección de otra pantalla (Cartera): sin fondo, sin márgenes de la
// barra de estado ni de la navbar y sin ocupar todo el alto.
export default function PantallaProximamente({ titulo, mensaje, icono, incrustada = false }) {
  const insets = useSafeAreaInsets();
  const alturaNavbar = useAlturaNavbar();
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);

  return (
    <View
      style={
        incrustada
          ? [styles.contenido, styles.incrustada]
          : [
              styles.contenido,
              styles.pantalla,
              { paddingTop: insets.top, paddingBottom: alturaNavbar },
            ]
      }
    >
      {icono ? (
        <MaterialCommunityIcons name={icono} size={40} color={colors.textSecondary} />
      ) : null}
      <Text style={styles.titulo}>{titulo}</Text>
      {mensaje ? <Text style={styles.mensaje}>{mensaje}</Text> : null}
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    contenido: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 32,
    },
    pantalla: {
      flex: 1,
      backgroundColor: colors.background,
    },
    incrustada: {
      paddingVertical: 48,
    },
    titulo: {
      fontFamily: fonts.sansBold,
      color: colors.text,
      fontSize: 22,
      marginTop: 4,
    },
    mensaje: {
      fontFamily: fonts.sans,
      color: colors.textSecondary,
      fontSize: 15,
      textAlign: 'center',
    },
  });
