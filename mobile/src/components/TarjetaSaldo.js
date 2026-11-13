import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { espacios, radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { tipografia } from '../theme/tipografia';
import { formatearMonto, MONEDA, partesMonto } from '../utils/formato';
import Etiqueta from './Etiqueta';

// Bloque "Saldo disponible" de Inicio (Stitch 07_inicio_*_fondo_1), entre el saludo y la tarjeta
// del mes. `saldo` = ingresos − gastos del mes (HU-82): sin él (null: mes sin movimientos) muestra
// una invitación a registrar ingresos (no un $0.00); con un número, el monto grande en mono con los
// centavos pequeños y "MXN" al lado, en alertaTexto si es negativo. Con `ingresos` > 0 (total del
// mes), debajo «↗ +$X este mes». Al final, la pastilla de acción «↓ Ingreso» llama a
// `onRegistrarIngreso`.
// El ojo es decorativo por ahora. Sin la pila de tarjetas (Tarjetas está en "Próximamente").
export default function TarjetaSaldo({ saldo, ingresos = 0, onRegistrarIngreso }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const conSaldo = typeof saldo === 'number' && Number.isFinite(saldo);
  const negativo = conSaldo && saldo < 0;
  const { entero, centavos } = conSaldo ? partesMonto(saldo) : {};

  const registrar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onRegistrarIngreso();
  };

  return (
    <View style={styles.bloque}>
      <View
        accessible
        accessibilityLabel={[
          conSaldo
            ? `Saldo disponible: ${formatearMonto(saldo)} ${MONEDA}`
            : 'Saldo disponible: registra tus ingresos para ver tu saldo',
          ingresos > 0 ? `Ingresos de este mes: ${formatearMonto(ingresos)}` : null,
        ]
          .filter(Boolean)
          .join('. ')}
      >
        <View style={styles.etiquetaFila}>
          <Etiqueta style={styles.etiqueta}>Saldo disponible</Etiqueta>
          <MaterialCommunityIcons name="eye-outline" size={14} color={colors.textSecondary} />
        </View>

        {conSaldo ? (
          <View style={styles.filaMonto}>
            <Text
              style={[styles.monto, negativo ? styles.negativo : null]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {entero}
              <Text style={[styles.centavos, negativo ? styles.negativo : null]}>{centavos}</Text>
            </Text>
            <Text style={styles.moneda}>{MONEDA}</Text>
          </View>
        ) : (
          <Text style={styles.invitacion}>Registra tus ingresos para ver tu saldo</Text>
        )}

        {ingresos > 0 ? (
          <View style={styles.filaIngresos}>
            <MaterialCommunityIcons name="arrow-top-right" size={14} color={colors.exitoTexto} />
            <Text style={styles.ingresos}>+{formatearMonto(ingresos)}</Text>
            <Text style={styles.ingresosTexto}>este mes</Text>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={registrar}
        hitSlop={{ top: 4, bottom: 4 }}
        accessibilityRole="button"
        accessibilityLabel="Registrar ingreso"
        style={({ pressed }) => [styles.pastilla, pressed ? styles.pastillaPresionada : null]}
      >
        <View style={styles.pastillaIcono}>
          <MaterialCommunityIcons name="arrow-down" size={16} color={colors.exito} />
        </View>
        <Text style={styles.pastillaTexto}>Ingreso</Text>
      </Pressable>
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
    // "MXN" pequeño junto al saldo, alineado a la base de los centavos
    filaMonto: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
    },
    moneda: {
      ...tipografia.labelCaps,
      fontSize: 11,
      color: colors.textSecondary,
    },
    // display-hero en mono, centavos en headline-md de textSecondary
    monto: {
      flexShrink: 1,
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
    negativo: {
      color: colors.alertaTexto,
    },
    invitacion: {
      ...tipografia.bodyMd,
      color: colors.textSecondary,
    },
    // «↗ +$X este mes» entre el saldo y la pastilla
    filaIngresos: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: espacios.sm,
    },
    ingresos: {
      ...tipografia.financialMetricMd,
      fontSize: 14,
      lineHeight: 18,
      color: colors.exitoTexto,
    },
    ingresosTexto: {
      ...tipografia.bodyMd,
      color: colors.textSecondary,
    },
    // Pastilla de acción (Stitch, «Send / Request»): h-10 rounded-full px-4 con vidrio neutro y
    // borde sutil; con el hitSlop vertical el área táctil llega a 48.
    pastilla: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacios.sm,
      height: 40,
      marginTop: espacios.md,
      paddingLeft: espacios.sm,
      paddingRight: espacios.md,
      borderRadius: radios.full,
      backgroundColor: colors.glass05,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    pastillaPresionada: {
      borderColor: colors.borderPressed,
    },
    // Círculo de 24 con la flecha en exito
    pastillaIcono: {
      width: 24,
      height: 24,
      borderRadius: radios.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.exitoSuave,
    },
    pastillaTexto: {
      ...tipografia.labelAccion,
      color: colors.text,
    },
  });
