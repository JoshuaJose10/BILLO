import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { useAlturaNavbar } from './NavbarFlotante';

// Placeholder de las pestañas que aún no se implementan.
export default function PantallaProximamente({ titulo, mensaje, icono }) {
  const insets = useSafeAreaInsets();
  const alturaNavbar = useAlturaNavbar();

  return (
    <View style={[styles.pantalla, { paddingTop: insets.top, paddingBottom: alturaNavbar }]}>
      {icono ? (
        <MaterialCommunityIcons name={icono} size={40} color={colors.textSecondary} />
      ) : null}
      <Text style={styles.titulo}>{titulo}</Text>
      {mensaje ? <Text style={styles.mensaje}>{mensaje}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
    backgroundColor: colors.background,
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
