import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSaldoOculto } from '../hooks/useSaldoOculto';
import { espacios, radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { tipografia } from '../theme/tipografia';
import { formatearMonto, MONEDA, partesMonto } from '../utils/formato';
import Etiqueta from './Etiqueta';

// Bloque "Saldo disponible" de Inicio (Stitch 07_inicio_*_fondo_1), entre el saludo y la tarjeta
// del mes. `saldo` = ingresos − gastos del mes (HU-82): sin él (null: mes sin movimientos) muestra
// una invitación a registrar ingresos (no un $0.00); con un número, el monto grande en mono con los
// centavos pequeños y "MXN" al lado; si es negativo, con "−" en el color normal y debajo el aviso
// «Gastaste más de lo que entró este mes». Con `ingresos` > 0 (total del mes), «↗ +$X este mes».
// Al final, la pastilla de acción «↓ Ingreso» llama a `onRegistrarIngreso`.
// El ojo oculta saldo, aviso e ingresos ("••••••" con el mismo estilo, para que el layout no
// salte); la preferencia se recuerda (useSaldoOculto). Sin la pila de tarjetas (Próximamente).
export default function TarjetaSaldo({ saldo, ingresos = 0, onRegistrarIngreso }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const conSaldo = typeof saldo === 'number' && Number.isFinite(saldo);
  const negativo = conSaldo && saldo < 0;
  // El signo va con "−" (menos tipográfico), no con el guion de Intl.
  const partes = conSaldo ? partesMonto(Math.abs(saldo)) : {};
  const entero = negativo ? `−${partes.entero}` : partes.entero;
  const [oculto, alternarOculto] = useSaldoOculto();

  const alternar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    alternarOculto();
  };

  const registrar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onRegistrarIngreso();
  };

  return (
    <View style={styles.bloque}>
      <View style={styles.etiquetaFila}>
        <Etiqueta style={styles.etiqueta}>Saldo disponible</Etiqueta>
        <Pressable
          onPress={alternar}
          hitSlop={15}
          accessibilityRole="button"
          accessibilityLabel={oculto ? 'Mostrar saldo' : 'Ocultar saldo'}
        >
          <MaterialCommunityIcons
            name={oculto ? 'eye-off-outline' : 'eye-outline'}
            size={14}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>

      <View
        accessible
        accessibilityLabel={
          oculto
            ? 'Saldo oculto'
            : [
                conSaldo
                  ? `Saldo disponible: ${formatearMonto(saldo)} ${MONEDA}`
                  : 'Registra tus ingresos para ver tu saldo',
                negativo ? 'Gastaste más de lo que entró este mes' : null,
                ingresos > 0 ? `Ingresos de este mes: ${formatearMonto(ingresos)}` : null,
              ]
                .filter(Boolean)
                .join('. ')
        }
      >
        {conSaldo ? (
          <View style={styles.filaMonto}>
            <Text style={styles.monto} numberOfLines={1} adjustsFontSizeToFit>
              {oculto ? OCULTO : entero}
              {oculto ? null : <Text style={styles.centavos}>{partes.centavos}</Text>}
            </Text>
            <Text style={styles.moneda}>{MONEDA}</Text>
          </View>
        ) : (
          <Text style={styles.invitacion}>Registra tus ingresos para ver tu saldo</Text>
        )}

        {negativo && !oculto ? (
          <View style={styles.filaLinea}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={14}
              color={colors.alertaTexto}
            />
            <Text style={styles.avisoNegativo}>Gastaste más de lo que entró este mes</Text>
          </View>
        ) : null}

        {ingresos > 0 ? (
          <View style={styles.filaLinea}>
            <MaterialCommunityIcons name="arrow-top-right" size={14} color={colors.exitoTexto} />
            <Text style={styles.ingresos}>{oculto ? OCULTO : `+${formatearMonto(ingresos)}`}</Text>
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

const OCULTO = '••••••';

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
    invitacion: {
      ...tipografia.bodyMd,
      color: colors.textSecondary,
    },
    // Aviso de saldo negativo y «↗ +$X este mes», entre el saldo y la pastilla
    filaLinea: {
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
    avisoNegativo: {
      ...tipografia.bodySm,
      flexShrink: 1,
      color: colors.textSecondary,
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
