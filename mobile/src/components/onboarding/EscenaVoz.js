import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';

import { crearDatosEjemplo } from '../../datos/ejemplo';
import { tramo, useReloj } from '../../hooks/useReloj';
import { espacios, estiloTarjeta } from '../../theme/colors';
import { useEstilos, useTema } from '../../theme/TemaContext';
import { fechaLocalISO } from '../../utils/fechas';
import ChipCategoria from '../ChipCategoria';
import EscuchaVoz from '../EscuchaVoz';
import { useFilasDeslizables } from '../FilaDeslizable';
import FilaMovimiento from '../FilaMovimiento';

const DICTADO = 'Gasté 85 en tacos';
const { categorias } = crearDatosEjemplo();
const COMIDA = categorias.find((c) => c.nombre === 'Comida');
const TACOS = {
  id: 1,
  tipo: 'gasto',
  monto: 85,
  categoria_id: COMIDA.id,
  fecha: fechaLocalISO(new Date()),
  nota: 'Tacos',
};
// Tiempos (ms): escucha, dictado letra por letra, conector, cápsula, pausa y salida.
const LETRAS = 1100;
const CONECTOR = 2100;
const CAPSULA = 2650;
const SALIDA = 4900;
const CICLO = 5500;
const LARGO = 48;
const PUNTA = 8;
const nada = () => {};
const lineal = (x) => {
  'worklet';
  return x;
};
const LineaAnimada = Animated.createAnimatedComponent(Line);

// Paso 3 del onboarding: la escucha real de Nuevo gasto, un conector punteado corto que se dibuja
// y el gasto que resulta, juntos y centrados en la maqueta.
export default function EscenaVoz({ activa }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const filas = useFilasDeslizables();
  const t = useReloj(activa, CICLO, SALIDA);
  const salida = (v) => {
    'worklet';
    return 1 - tramo(v, SALIDA, SALIDA + 400);
  };
  const letras = useDerivedValue(
    () => DICTADO.length * tramo(t.value, LETRAS, LETRAS + 800, lineal) * salida(t.value),
  );
  // El punteado se dibuja de arriba hacia abajo alargando la línea (el dashoffset correría los
  // puntos en lugar de dibujarla); la punta aparece al llegar.
  const linea = useAnimatedProps(() => ({
    y2: (LARGO - PUNTA) * tramo(t.value, CONECTOR, CONECTOR + 450),
    strokeOpacity: salida(t.value),
  }));
  const punta = useAnimatedStyle(() => ({
    opacity: tramo(t.value, CONECTOR + 400, CONECTOR + 550) * salida(t.value),
  }));
  const capsula = useAnimatedStyle(() => {
    const p = tramo(t.value, CAPSULA, CAPSULA + 450) * salida(t.value);
    return { opacity: p, transform: [{ translateY: 12 * (1 - p) }] };
  });

  return (
    <View style={styles.escena}>
      <View style={styles.tarjeta}>
        <EscuchaVoz
          estado="escuchando"
          transcripcion={DICTADO}
          letras={letras}
          quieto={!activa}
          compacto
        />
      </View>

      <View style={styles.conector}>
        <Svg width={PUNTA * 2} height={LARGO}>
          <LineaAnimada
            x1={PUNTA}
            x2={PUNTA}
            y1={0}
            stroke={colors.textSecondary}
            strokeWidth={1.5}
            strokeDasharray="2 5"
            strokeLinecap="round"
            animatedProps={linea}
          />
        </Svg>
        <Animated.View style={[styles.punta, punta]}>
          <Svg width={PUNTA * 2} height={PUNTA}>
            <Path
              d={`M1 1 L${PUNTA} ${PUNTA - 1} L${PUNTA * 2 - 1} 1`}
              stroke={colors.textSecondary}
              strokeWidth={1.5}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </Animated.View>
      </View>

      <Animated.View style={[styles.capsula, capsula]}>
        <FilaMovimiento
          movimiento={TACOS}
          nombreCategoria={COMIDA.nombre}
          filas={filas}
          eliminar={nada}
          onEditar={nada}
        />
        <View style={styles.badge}>
          <ChipCategoria nombre="Procesado por voz" icono="microphone" exito />
        </View>
      </Animated.View>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    escena: {
      gap: espacios.sm,
    },
    tarjeta: estiloTarjeta(colors),
    conector: {
      height: LARGO,
      alignItems: 'center',
    },
    punta: {
      position: 'absolute',
      bottom: 0,
    },
    // La tarjeta normal; el badge va dentro, debajo de la fila.
    capsula: {
      ...estiloTarjeta(colors),
      padding: 0,
      overflow: 'hidden',
    },
    badge: {
      alignItems: 'flex-start',
      paddingHorizontal: 14,
      paddingBottom: 12,
    },
  });
