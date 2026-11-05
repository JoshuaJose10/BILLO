import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { formatearMonto } from '../utils/formato';
import { esCobroProximo, estiloServicio, textoCobro } from '../utils/membresias';

// Componente para una tarjeta de membresía / suscripción en Cartera (HU-05)
// Siguiendo el diseño de Stitch (13_cartera_subs_oscuro_brillo / 13_cartera_subs_claro_brillo).
// `opaca`: fondo sólido para permitir swipe con FilaDeslizable sin transparencia.
export default function ItemMembresia({ membresia, opaca = false }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);

  const { nombre, costo, frecuencia, fecha_cobro, dias_para_cobro } = membresia;
  const { color: colorMarca, icono } = estiloServicio(nombre);
  const esProximo = esCobroProximo(dias_para_cobro);
  const textoFrecuencia = frecuencia === 'anual' ? '/ año' : '/ mes';
  const etiquetaFrecuencia = frecuencia === 'anual' ? 'Anual' : 'Mensual';

  return (
    <View
      style={[
        styles.tarjeta,
        opaca ? styles.tarjetaOpaca : null,
        esProximo ? styles.tarjetaProxima : null,
      ]}
    >
      {/* Fila superior: Logo + Nombre + Costo */}
      <View style={styles.filaSuperior}>
        <View style={styles.infoServicio}>
          <View
            style={[
              styles.squircle,
              {
                backgroundColor: colorMarca,
                shadowColor: colorMarca,
              },
            ]}
          >
            <MaterialCommunityIcons name={icono} size={22} color="#FFFFFF" />
          </View>
          <View style={styles.textos}>
            <Text style={styles.nombre} numberOfLines={1}>
              {nombre}
            </Text>
            <Text style={styles.frecuenciaSubtitulo} numberOfLines={1}>
              Suscripción {etiquetaFrecuencia.toLowerCase()}
            </Text>
          </View>
        </View>

        <View style={styles.montoContenedor}>
          <Text style={styles.monto}>{formatearMonto(costo)}</Text>
          <Text style={styles.sufijoFrecuencia}>{textoFrecuencia}</Text>
        </View>
      </View>

      {/* Fila inferior: Píldora de cobro relativo (resaltada en <= 3 días) */}
      <View style={styles.filaInferior}>
        <View
          style={[
            styles.pildoraCobro,
            esProximo ? styles.pildoraCobroProximo : styles.pildoraCobroNormal,
          ]}
        >
          {esProximo ? (
            <View style={styles.puntoVerde} />
          ) : (
            <MaterialCommunityIcons name="clock-outline" size={13} color={colors.textSecondary} />
          )}
          <Text
            style={[
              styles.textoCobro,
              esProximo ? styles.textoCobroProximo : styles.textoCobroNormal,
            ]}
            numberOfLines={1}
          >
            {textoCobro(dias_para_cobro, fecha_cobro)}
          </Text>
        </View>

        <View style={styles.pildoraMetodo}>
          <Text style={styles.textoFrecuenciaPill}>{etiquetaFrecuencia}</Text>
        </View>
      </View>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    tarjeta: {
      borderRadius: radios['2xl'],
      padding: 16,
      backgroundColor: colors.surfaceLow,
      borderWidth: 1,
      borderColor: colors.border,
      borderTopColor: colors.borderTop,
      gap: 12,
    },
    tarjetaOpaca: {
      backgroundColor: colors.card,
    },
    // Resaltado sutil en el borde cuando cobra en 3 días o menos
    tarjetaProxima: {
      borderColor: 'rgba(52, 199, 123, 0.35)',
    },
    filaSuperior: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    infoServicio: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    squircle: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      shadowOpacity: 0.35,
      elevation: 4,
    },
    textos: {
      flex: 1,
    },
    nombre: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      lineHeight: 22,
      color: colors.text,
      letterSpacing: -0.2,
    },
    frecuenciaSubtitulo: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
      marginTop: 2,
    },
    montoContenedor: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 3,
      flexShrink: 0,
    },
    monto: {
      fontFamily: fonts.monoSemiBold,
      fontSize: 16,
      lineHeight: 20,
      color: colors.text,
    },
    sufijoFrecuencia: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textSecondary,
    },
    filaInferior: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      paddingTop: 4,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    pildoraCobro: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    pildoraCobroNormal: {
      backgroundColor: colors.glass05,
    },
    pildoraCobroProximo: {
      backgroundColor: 'rgba(52, 199, 123, 0.12)',
      borderColor: 'rgba(52, 199, 123, 0.4)',
    },
    puntoVerde: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#34C77B',
    },
    textoCobro: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      lineHeight: 15,
    },
    textoCobroNormal: {
      color: colors.textSecondary,
    },
    textoCobroProximo: {
      color: colors.text,
      fontFamily: fonts.monoSemiBold,
    },
    pildoraMetodo: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 9999,
      backgroundColor: colors.glass05,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textoFrecuenciaPill: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      color: colors.textSecondary,
    },
  });
