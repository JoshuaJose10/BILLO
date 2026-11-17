import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { tipografia } from '../theme/tipografia';

// Logo de Billo: cartera en un cuadro del color primario y, con `nombre`, la palabra «billo».
// `tamano`: lado del cuadro (24 en barras y avisos, 64 en Entrada).
export default function Logo({ tamano = 24, nombre = false }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  return (
    <View style={styles.logo} accessible accessibilityLabel="Billo" accessibilityRole="image">
      <View
        style={[
          styles.icono,
          { width: tamano, height: tamano, borderRadius: tamano > 32 ? radios['3xl'] : radios.lg },
        ]}
      >
        <MaterialCommunityIcons
          name="wallet-outline"
          size={tamano * 0.6}
          color={colors.onPrimary}
        />
      </View>
      {nombre ? <Text style={styles.nombre}>billo</Text> : null}
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    logo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    icono: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    nombre: {
      ...tipografia.headlineSm,
      color: colors.text,
    },
  });
