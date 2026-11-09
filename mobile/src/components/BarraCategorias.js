import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { colorCategoria } from '../theme/categorias';
import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';

const SEPARACION = 2;
// Los tramos crecen al cargar, uno tras otro (60 ms entre tramos, 500 ms cada uno).
const ESCALON = 60;
const CRECER = { duration: 500, easing: Easing.out(Easing.cubic) };

// Un tramo de la barra; su ancho (px) crece hasta `ancho` con un retraso según su `indice`.
// Con "Reducir movimiento" toma su ancho de inmediato.
function Tramo({ ancho, indice, color, reducirMovimiento }) {
  const styles = useEstilos(crearEstilos);
  const valor = useSharedValue(0);

  useEffect(() => {
    valor.set(reducirMovimiento ? ancho : withDelay(indice * ESCALON, withTiming(ancho, CRECER)));
  }, [ancho, indice, reducirMovimiento, valor]);

  const estilo = useAnimatedStyle(() => ({ width: valor.value }));

  return <Animated.View style={[styles.tramo, { backgroundColor: color }, estilo]} />;
}

// Barra del mes dividida por categoría (Stitch 13_cartera_subs, "Total mensual"): un tramo por
// categoría con su color, de mayor a menor, separados 2 px. `tramos` = [{ id, nombre, fraccion }]
// (de resumenGastoMes). El hueco que queda es lo que falta del presupuesto. Un tramo con `color`
// usa ese color en vez del de la categoría (Suscripciones: color de marca, tramosSuscripciones).
// `etiqueta` y `porcentaje` son para el lector de pantalla.
export default function BarraCategorias({ tramos, etiqueta, porcentaje }) {
  const { esOscuro } = useTema();
  const styles = useEstilos(crearEstilos);
  const reducirMovimiento = useReducedMotion();
  const [anchoPista, setAnchoPista] = useState(0);

  // Ancho útil: el de la pista menos las separaciones entre tramos.
  const disponible = Math.max(anchoPista - SEPARACION * Math.max(tramos.length - 1, 0), 0);

  return (
    <View
      style={styles.pista}
      onLayout={(e) => setAnchoPista(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={etiqueta}
      accessibilityValue={
        porcentaje != null ? { min: 0, max: 100, now: Math.min(porcentaje, 100) } : undefined
      }
    >
      {anchoPista > 0
        ? tramos.map((t, i) => (
            <Tramo
              key={t.id}
              ancho={t.fraccion * disponible}
              indice={i}
              color={t.color ?? colorCategoria(t.nombre, esOscuro)}
              reducirMovimiento={reducirMovimiento}
            />
          ))
        : null}
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // h-1.5 rounded-full, la misma pista neutra que las barras de presupuesto
    pista: {
      flexDirection: 'row',
      gap: SEPARACION,
      height: 6,
      borderRadius: radios.full,
      backgroundColor: colors.surfaceHighest,
      overflow: 'hidden',
    },
    tramo: {
      height: '100%',
      borderRadius: radios.full,
    },
  });
