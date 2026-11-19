import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { radios } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { useEstilos, useTema } from '../theme/TemaContext';
import { estiloServicio, inicialServicio } from '../utils/membresias';

// Íconos encimados de servicios (-space-x-1.5 de Stitch): círculo con el color de marca y el glifo
// (o la inicial), como el squircle de ItemMembresia. Hasta `max`; sin `membresias`, nada.
// Fila resumen de Cartera › Tarjetas y pila de tarjetas de Inicio.
export default function AvataresServicios({ membresias = [], max = 3, style }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  if (!membresias.length) return null;
  return (
    <View style={[styles.fila, style]}>
      {membresias.slice(0, max).map((m, i) => {
        const { color, icono, predefinido } = estiloServicio(m.nombre);
        return (
          <View
            key={m.id}
            style={[styles.avatar, i > 0 && styles.encimado, { backgroundColor: color }]}
          >
            {predefinido ? (
              <MaterialCommunityIcons name={icono} size={14} color={colors.textoSobreColor} />
            ) : (
              <Text style={styles.inicial}>{inicialServicio(m.nombre)}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    fila: {
      flexDirection: 'row',
    },
    avatar: {
      width: 30,
      height: 30,
      borderRadius: radios.full,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.card,
    },
    encimado: {
      marginLeft: -8,
    },
    inicial: {
      fontFamily: fonts.sansBold,
      fontSize: 11,
      color: colors.textoSobreColor,
    },
  });
