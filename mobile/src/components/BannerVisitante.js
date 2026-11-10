import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';

// Alto fijo para que useAlturaNavbar (NavbarFlotante) sume el banner al espacio inferior.
export const ALTO_BANNER = 40;

// Aviso discreto del modo exploración (HU-50): NavbarFlotante lo dibuja encima de la barra, así
// queda fijo en Inicio, Movimientos, Reportes y Cartera. Tocarlo sale del modo hacia Registro.
export default function BannerVisitante() {
  const { salirDeVisitante } = useAuth();
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);

  return (
    <Pressable
      onPress={() => salirDeVisitante('Registro')}
      accessibilityRole="button"
      accessibilityLabel="Estás explorando con datos de ejemplo. Crear cuenta"
      style={({ pressed }) => [styles.banner, pressed ? styles.presionado : null]}
    >
      <MaterialCommunityIcons name="compass-outline" size={16} color={colors.textSecondary} />
      <Text
        style={styles.texto}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={1.3}
      >
        Estás explorando con datos de ejemplo · <Text style={styles.enlace}>Crear cuenta</Text>
      </Text>
    </Pressable>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    banner: {
      height: ALTO_BANNER,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 14,
      borderRadius: 9999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    presionado: {
      backgroundColor: colors.surfaceHigh,
    },
    texto: {
      flexShrink: 1,
      fontFamily: fonts.sansMedium,
      fontSize: 13,
      color: colors.textVariant,
    },
    enlace: {
      fontFamily: fonts.sansSemiBold,
      color: colors.acentoTexto,
    },
  });
