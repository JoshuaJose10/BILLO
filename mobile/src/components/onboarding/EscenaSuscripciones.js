import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue } from 'react-native-reanimated';

import { membresiaEjemplo } from '../../datos/ejemplo';
import { tramo, useReloj } from '../../hooks/useReloj';
import { espacios, estiloTarjeta } from '../../theme/colors';
import { useEstilos } from '../../theme/TemaContext';
import { tipografia } from '../../theme/tipografia';
import { formatearMontoCorto } from '../../utils/formato';
import { proximoCobro } from '../../utils/membresias';
import BarraPresupuesto from '../BarraPresupuesto';
import Etiqueta from '../Etiqueta';
import ItemMembresia from '../ItemMembresia';
import Logo from '../Logo';
import TarjetaProximoCobro from '../TarjetaProximoCobro';
import TextoAnimado from '../TextoAnimado';

const NETFLIX = membresiaEjemplo({ id: 1, nombre: 'Netflix', costo: 219, dias: 4 });
const COBRO = proximoCobro([
  NETFLIX,
  membresiaEjemplo({ id: 2, nombre: 'Spotify Premium', costo: 129, dias: 2 }),
]);
const AVISO = `Spotify cobra en ${COBRO.dias} días · ${formatearMontoCorto(COBRO.membresia.costo)}`;
// Tiempos (ms): baja la notificación (con un pulso), entra Spotify, corre la cuenta regresiva y
// entra Netflix; pausa y salida.
const AVISO_T = 200;
const TARJETA = 900;
const CUENTA = 1500;
const FILA = 1700;
const SALIDA = 4300;
const CICLO = 4900;
const faltan = (v) => {
  'worklet';
  return `Faltan ${v < 0.5 ? 3 : 2} días`;
};

// Paso 4 del onboarding: una pila sin encimar: el aviso push antes del cobro, la tarjeta «Próximo
// cobro» de Inicio con la cuenta regresiva dentro (del neutro a alerta) y Netflix como fila chica.
export default function EscenaSuscripciones({ activa }) {
  const styles = useEstilos(crearEstilos);
  const t = useReloj(activa, CICLO, SALIDA);
  const salida = (v) => {
    'worklet';
    return 1 - tramo(v, SALIDA, SALIDA + 400);
  };
  const entra = (v, inicio, desde) => {
    'worklet';
    const p = tramo(v, inicio, inicio + 450) * salida(v);
    return { opacity: p, transform: [{ translateY: desde * (1 - p) }] };
  };
  const avance = useDerivedValue(() => tramo(t.value, CUENTA, CUENTA + 1200) * salida(t.value));
  const aviso = useAnimatedStyle(() => {
    const { opacity, transform } = entra(t.value, AVISO_T, -24);
    const latido =
      tramo(t.value, AVISO_T + 450, AVISO_T + 600) - tramo(t.value, AVISO_T + 600, AVISO_T + 900);
    return { opacity, transform: [...transform, { scale: 1 + 0.03 * latido }] };
  });
  const tarjeta = useAnimatedStyle(() => entra(t.value, TARJETA, 16));
  const fila = useAnimatedStyle(() => {
    const { opacity, transform } = entra(t.value, FILA, 16);
    return { opacity: 0.75 * opacity, transform };
  });

  return (
    <View style={styles.escena}>
      <Animated.View style={[styles.aviso, aviso]}>
        <Logo tamano={32} />
        <View style={styles.avisoTextos}>
          <Etiqueta>Billo · ahora</Etiqueta>
          <Text style={styles.avisoTexto}>{AVISO}</Text>
        </View>
      </Animated.View>

      <Animated.View style={tarjeta}>
        <TarjetaProximoCobro cobro={COBRO} conFecha style={styles.sinMargen}>
          <View style={styles.cuenta}>
            <BarraPresupuesto avance={avance} porcentaje={67} estado="excedido" />
            <TextoAnimado valor={avance} formatear={faltan} style={styles.cuentaTexto} />
          </View>
        </TarjetaProximoCobro>
      </Animated.View>

      <Animated.View style={[styles.netflix, fila]}>
        <ItemMembresia membresia={NETFLIX} />
      </Animated.View>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    escena: {
      gap: espacios.md,
    },
    aviso: {
      ...estiloTarjeta(colors),
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacios.sm + 4,
    },
    avisoTextos: {
      flex: 1,
      gap: 2,
    },
    avisoTexto: {
      ...tipografia.bodyMd,
      flexShrink: 1,
      color: colors.text,
    },
    sinMargen: {
      marginTop: 0,
    },
    cuenta: {
      gap: espacios.xs,
    },
    cuentaTexto: {
      ...tipografia.labelCaps,
      textTransform: 'none',
      color: colors.textSecondary,
    },
    // Fila chica y más tenue debajo de la tarjeta destacada.
    netflix: {
      marginHorizontal: espacios.md,
    },
  });
