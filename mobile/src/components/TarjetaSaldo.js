import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { tipografia } from '../theme/tipografia';
import { formatearMonto, MONEDA, partesMonto } from '../utils/formato';
import Etiqueta from './Etiqueta';

// Bloque "Saldo disponible" de Inicio (Stitch 07_inicio_*_fondo_1), entre el saludo y la tarjeta
// del mes. Es el espacio reservado para los ingresos (HU-82): sin `saldo` muestra una invitación
// a registrarlos (no un $0.00); con un número, el monto grande en mono con los centavos pequeños.
// El ojo es decorativo por ahora. Sin la pila de tarjetas (Tarjetas está en "Próximamente").
export default function TarjetaSaldo({ saldo }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const conSaldo = typeof saldo === 'number' && Number.isFinite(saldo);
  const { entero, centavos } = conSaldo ? partesMonto(saldo) : {};

  return (
    <View
      style={styles.bloque}
      accessible
      accessibilityLabel={
        conSaldo
          ? `Saldo disponible: ${formatearMonto(saldo)} ${MONEDA}, cuenta principal`
          : 'Saldo disponible: registra tus ingresos para ver tu saldo'
      }
    >
      <View style={styles.etiquetaFila}>
        <Etiqueta style={styles.etiqueta}>Saldo disponible</Etiqueta>
        <MaterialCommunityIcons name="eye-outline" size={14} color={colors.textSecondary} />
      </View>

      {conSaldo ? (
        <Text style={styles.monto} numberOfLines={1} adjustsFontSizeToFit>
          {entero}
          <Text style={styles.centavos}>{centavos}</Text>
        </Text>
      ) : (
        <Text style={styles.invitacion}>Registra tus ingresos para ver tu saldo</Text>
      )}

      <View style={styles.pastilla}>
        <View style={styles.punto} />
        <Text style={styles.pastillaTexto}>{MONEDA} · Cuenta principal</Text>
      </View>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // py-6 del hero de Stitch, sin tarjeta de fondo
    bloque: {
      paddingTop: 8,
      paddingBottom: 20,
      alignItems: 'flex-start',
    },
    etiquetaFila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    etiqueta: {
      color: colors.textSecondary,
    },
    // display-hero en mono, centavos en headline-md de textSecondary
    monto: {
      ...tipografia.financialMetricLg,
      fontSize: 40,
      lineHeight: 44,
      letterSpacing: -1.2,
      color: colors.text,
    },
    centavos: {
      ...tipografia.financialMetricMd,
      fontSize: 22,
      color: colors.textSecondary,
    },
    invitacion: {
      ...tipografia.bodyMd,
      color: colors.textSecondary,
    },
    // px-2.5 py-1 rounded-full con vidrio neutro y borde sutil
    pastilla: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radios.full,
      backgroundColor: colors.glass05,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    punto: {
      width: 6,
      height: 6,
      borderRadius: radios.full,
      backgroundColor: colors.outline,
    },
    pastillaTexto: {
      ...tipografia.labelCaps,
      fontSize: 10,
      letterSpacing: 0,
      textTransform: 'none',
      color: colors.text,
    },
  });
