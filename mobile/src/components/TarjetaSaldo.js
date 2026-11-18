import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useSaldoOculto } from '../hooks/useSaldoOculto';
import { espacios, radios } from '../theme/colors';
import { degradadoTarjeta } from '../theme/tarjetas';
import { useEstilos, useTema } from '../theme/TemaContext';
import { tipografia } from '../theme/tipografia';
import { formatearMonto, MONEDA, partesMonto } from '../utils/formato';
import { etiquetaAccesibleTarjeta, suscripcionesDeTarjeta } from '../utils/tarjetas';
import AvataresServicios from './AvataresServicios';
import Etiqueta from './Etiqueta';
import TarjetaVisual from './TarjetaVisual';

// Bloque "Saldo disponible" de Inicio (Stitch 07_inicio_*_fondo_1), entre el saludo y la tarjeta
// del mes. `saldo` = ingresos − gastos del mes (HU-82): sin él (null: mes sin movimientos) muestra
// una invitación a registrar ingresos (no un $0.00); con un número, el monto grande en mono con los
// centavos pequeños y "MXN" al lado; si es negativo, con "−" en el color normal y debajo el aviso
// «Gastaste más de lo que entró este mes». Con `ingresos` > 0 (total del mes), «↗ +$X este mes».
// Al final, la pastilla de acción «↓ Ingreso» llama a `onRegistrarIngreso` (sin él no se dibuja:
// la maqueta del onboarding).
// El ojo oculta saldo, aviso e ingresos ("••••••" con el mismo estilo, para que el layout no
// salte); la preferencia se recuerda (useSaldoOculto).
// A la derecha, la pila de hasta 3 `tarjetas` (TarjetaVisual 'mini' escalonadas, recortadas por el
// bloque como en Stitch) y debajo hasta 3 íconos de las `membresias` pagadas con ellas; tocarla
// llama a `onAbrirTarjetas`. El saldo se limita al 62 % del ancho para no quedar debajo; sin
// tarjetas o en pantallas angostas no se dibuja.
export default function TarjetaSaldo({
  saldo,
  ingresos = 0,
  onRegistrarIngreso,
  tarjetas = [],
  membresias = [],
  onAbrirTarjetas,
}) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const { width } = useWindowDimensions();
  const pila =
    onAbrirTarjetas && width >= ANCHO_MIN_PILA ? (tarjetas || []).slice(0, MAX_PILA) : [];
  const vinculadas = pila.length
    ? (tarjetas || []).flatMap((t) => suscripcionesDeTarjeta(membresias, t.id).vinculadas)
    : [];
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
    <View style={[styles.bloque, pila.length > 0 ? styles.bloqueConPila : null]}>
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
        style={pila.length > 0 ? styles.conPila : null}
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

      {onRegistrarIngreso ? (
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
      ) : null}

      {pila.length > 0 ? (
        <Pressable
          onPress={onAbrirTarjetas}
          accessibilityRole="button"
          accessibilityLabel={`Tus tarjetas: ${pila.map(etiquetaAccesibleTarjeta).join(', ')}`}
          accessibilityHint="Abre tus tarjetas en Cartera"
          style={styles.pila}
        >
          {/* La primera tarjeta va al frente (se dibuja al final, top 24); las de atrás solo con
              su gradiente. La sombra va en el envoltorio (con el overflow de la cara no saldría
              en iOS) y crece hacia el frente. */}
          <View style={styles.tarjetasPila}>
            {[...pila].reverse().map((t, i, lista) => (
              <View
                key={t.id}
                style={[
                  styles.mini,
                  {
                    top: i * PASO_PILA,
                    backgroundColor: degradadoTarjeta(t)[0],
                    shadowOffset: { width: -8 - 2 * i, height: 6 + 2 * i },
                    shadowRadius: 20 + 4 * i,
                    elevation: 6 + 3 * i,
                  },
                ]}
              >
                <TarjetaVisual
                  tarjeta={t}
                  tamano="mini"
                  soloFondo={i < lista.length - 1}
                  style={styles.caraMini}
                />
              </View>
            ))}
          </View>
          {/* Como en Stitch: hasta 3 suscripciones pagadas con esas tarjetas */}
          <AvataresServicios membresias={vinculadas} style={styles.avataresPila} />
        </Pressable>
      ) : null}
    </View>
  );
}

const OCULTO = '••••••';
const MAX_PILA = 3;
const PASO_PILA = 12; // top 0 / 12 / 24
const ANCHO_MIN_PILA = 360;

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
    // Pila de tarjetas (Stitch 07_inicio_*_fondo_1): el bloque recorta lo que sale a la derecha
    // (overflow hidden, min-h-[170px]) y el saldo se queda en el 62 % izquierdo.
    bloqueConPila: {
      overflow: 'hidden',
      minHeight: 170,
    },
    conPila: {
      maxWidth: '62%',
    },
    // absolute -right-14 top-2 bottom-2 w-44, columna: tarjetas arriba, íconos abajo
    pila: {
      position: 'absolute',
      right: -56,
      top: 8,
      bottom: 8,
      width: 176,
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },
    // relative w-36 h-28
    tarjetasPila: {
      width: 144,
      height: 112,
    },
    // w-32 h-[100px] rounded-[20px] absolute right-0, sombra hacia izquierda-abajo
    mini: {
      position: 'absolute',
      right: 0,
      width: 128,
      height: 100,
      borderRadius: 20,
      shadowColor: colors.sombra,
      shadowOpacity: 0.6,
    },
    caraMini: {
      width: '100%',
      height: '100%',
      borderRadius: 20,
    },
    // flex -space-x-3 pr-1
    avataresPila: {
      paddingRight: espacios.xs,
    },
  });
