import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import { espacios, radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { tipografia } from '../theme/tipografia';
import { arcosDona } from '../utils/dona';
import { formatearMonto, MONEDA } from '../utils/formato';
import { descripcionDona } from '../utils/reportes';
import Etiqueta from './Etiqueta';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Geometría (px). El anillo va al centro de un lienzo de TAMANO × TAMANO: el trazo de grosor
// GROSOR se dibuja sobre el círculo de radio RADIO; el brillo (GROSOR × 2.2) y la órbita punteada
// quedan por fuera.
const GROSOR = 16;
const RADIO = 96;
const SEPARACION = 6;
const GROSOR_BRILLO = GROSOR * 2.2;
const OPACIDAD_BRILLO = 0.22;
const RADIO_ORBITA = 120;
const TAMANO = (RADIO_ORBITA + 2) * 2;
const CENTRO = TAMANO / 2;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;
// El texto del centro deja al menos 24 px libres hasta el borde interior del anillo.
const MARGEN_CENTRO = 24;
const ANCHO_CENTRO = (RADIO - GROSOR / 2 - MARGEN_CENTRO) * 2;

// Barrido de entrada: cada tramo se dibuja en 700 ms, uno tras otro (80 ms entre tramos).
const DURACION = 700;
const ESCALON = 80;
// Un punto (tramo muy chico) es un trazo casi nulo: solo se ven sus puntas redondeadas.
const LARGO_PUNTO = 0.01;

// Dona del gasto por categoría (RF8; diseño HU-81, Stitch reportes_modo_oscuro/_claro), dibujada
// con react-native-svg directo sobre el fondo con brillo (sin tarjeta):
// pista tenue, tramos con puntas redondeadas y separación (geometría en utils/dona.js), un brillo
// por tramo (el mismo arco más ancho y translúcido; sin filtros de blur) y una órbita punteada.
// - `datos`: de armarDatosDona ({ id, value, color, etiqueta, porcentaje }), de mayor a menor;
//   `color` es colorCategoria(nombre, esOscuro), el mismo del ícono en el desglose (la leyenda).
// - `total`: gasto_variable del mes (igual a la suma de la dona).
// - `nombreMes`: "Noviembre", para la pastilla "● MXN · NOVIEMBRE".
// - `animacion`: cambia (p. ej. el mes) para repetir el barrido de entrada. Con "Reducir
//   movimiento" los tramos aparecen completos.
export default function DonaCategorias({ datos, total, nombreMes, animacion }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const reducirMovimiento = useReducedMotion();

  const arcos = useMemo(
    () =>
      arcosDona(
        datos.map((d) => d.value),
        { radio: RADIO, grosor: GROSOR, separacion: SEPARACION },
      ),
    [datos],
  );

  // "$1,237.25" → "$1,237" y ".25"
  const texto = formatearMonto(total);
  const punto = texto.lastIndexOf('.');
  const entero = punto >= 0 ? texto.slice(0, punto) : texto;
  const centavos = punto >= 0 ? texto.slice(punto) : '';

  return (
    <View
      style={styles.contenedor}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Total gastado ${texto}. ${descripcionDona(datos)}`}
    >
      {/* En iOS, una sombra del color principal refuerza el brillo. */}
      <View style={[styles.lienzo, { shadowColor: datos[0]?.color }]}>
        <Svg width={TAMANO} height={TAMANO}>
          <Circle
            cx={CENTRO}
            cy={CENTRO}
            r={RADIO_ORBITA}
            fill="none"
            stroke={colors.borderStrong}
            strokeWidth={0.8}
            strokeDasharray="3 4"
          />
          <Circle
            cx={CENTRO}
            cy={CENTRO}
            r={RADIO}
            fill="none"
            stroke={colors.outlineVariant30}
            strokeWidth={GROSOR}
          />
          {/* Primero todos los brillos y encima los tramos, para que ningún brillo tape un tramo. */}
          {arcos.map((arco, i) => (
            <Tramo
              key={`brillo-${datos[arco.indice].id}-${animacion}`}
              arco={arco}
              color={datos[arco.indice].color}
              grosor={GROSOR_BRILLO}
              opacidad={OPACIDAD_BRILLO}
              orden={i}
              animar={!reducirMovimiento}
            />
          ))}
          {arcos.map((arco, i) => (
            <Tramo
              key={`tramo-${datos[arco.indice].id}-${animacion}`}
              arco={arco}
              color={datos[arco.indice].color}
              grosor={GROSOR}
              opacidad={1}
              orden={i}
              animar={!reducirMovimiento}
            />
          ))}
        </Svg>
      </View>

      <View style={styles.centro} pointerEvents="none">
        <Etiqueta style={styles.centroEtiqueta}>Total gastado</Etiqueta>
        <Text
          style={styles.centroMonto}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          <Text style={styles.centroEntero}>{entero}</Text>
          <Text style={styles.centroCentavos}>{centavos}</Text>
        </Text>
        <View style={styles.pastilla}>
          <View style={styles.pastillaPunto} />
          <Text
            style={styles.pastillaTexto}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {MONEDA} · {nombreMes}
          </Text>
        </View>
      </View>
    </View>
  );
}

// Un arco del anillo: un círculo con strokeDasharray [largo, circunferencia] girado a su inicio.
// La entrada anima strokeDashoffset de `largo` a 0 (el trazo crece desde su inicio) y la opacidad,
// para que la punta redondeada no se vea antes de empezar el barrido.
function Tramo({ arco, color, grosor, opacidad, orden, animar }) {
  const largo = arco.completo
    ? CIRCUNFERENCIA
    : arco.punto
      ? LARGO_PUNTO
      : (arco.barrido / 360) * CIRCUNFERENCIA;
  const avance = useSharedValue(animar ? 0 : 1);

  useEffect(() => {
    if (!animar) {
      avance.set(1);
      return;
    }
    avance.set(0);
    avance.set(
      withDelay(
        orden * ESCALON,
        withTiming(1, { duration: DURACION, easing: Easing.out(Easing.cubic) }),
      ),
    );
  }, [animar, avance, orden]);

  const props = useAnimatedProps(() => ({
    strokeDashoffset: largo * (1 - avance.value),
    strokeOpacity: opacidad * Math.min(avance.value * 6, 1),
  }));

  return (
    <G transform={`rotate(${arco.inicio - 90} ${CENTRO} ${CENTRO})`}>
      <AnimatedCircle
        cx={CENTRO}
        cy={CENTRO}
        r={RADIO}
        fill="none"
        stroke={color}
        strokeWidth={grosor}
        strokeLinecap={arco.completo ? 'butt' : 'round'}
        strokeDasharray={[largo, CIRCUNFERENCIA]}
        animatedProps={props}
      />
    </G>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    contenedor: {
      alignSelf: 'center',
      width: TAMANO,
      height: TAMANO,
      alignItems: 'center',
      justifyContent: 'center',
    },
    lienzo: {
      ...StyleSheet.absoluteFillObject,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 18,
      shadowOpacity: 0.3,
    },
    centro: {
      width: ANCHO_CENTRO,
      alignItems: 'center',
      gap: espacios.xs,
    },
    centroEtiqueta: {
      fontSize: 10,
      color: colors.textVariant,
    },
    centroMonto: {
      textAlign: 'center',
    },
    centroEntero: {
      ...tipografia.financialMetricLg,
      color: colors.text,
    },
    centroCentavos: {
      ...tipografia.financialMetricMd,
      color: colors.textSecondary,
    },
    // rounded-full con punto (oscuro: surface-container-high; claro: neutral-100 con borde)
    pastilla: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      maxWidth: ANCHO_CENTRO,
      paddingHorizontal: espacios.sm,
      paddingVertical: 2,
      borderRadius: radios.full,
      backgroundColor: colors.surfaceHigh,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    pastillaPunto: {
      width: 6,
      height: 6,
      borderRadius: radios.full,
      backgroundColor: colors.text,
    },
    pastillaTexto: {
      ...tipografia.labelCaps,
      fontSize: 9,
      lineHeight: 12,
      flexShrink: 1,
      color: colors.textSecondary,
    },
  });
