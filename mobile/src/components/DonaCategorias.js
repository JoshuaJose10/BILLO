import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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

// Geometría (px). El lado del cuadro sale del ancho de la pantalla (ver `geometriaDona`); el resto
// es fijo.
const LADO_MAXIMO = 320;
const GROSOR = 15;
const SEPARACION = 6;
// Brillo difuso: dos copias de cada tramo debajo de él, más anchas y casi transparentes
// (opacidades en el tema: donaBrilloCerca / donaBrilloLejos).
const GROSOR_BRILLO_CERCA = GROSOR * 1.5;
const GROSOR_BRILLO_LEJOS = GROSOR * 2.2;
// Espacio para la órbita punteada (su trazo y un poco de aire) en el borde del cuadro.
const ESPACIO_ORBITA = 2;
const HOLGURA = 4;
// El texto del centro deja al menos 24 px libres hasta el borde interior del anillo.
const MARGEN_CENTRO = 24;

// Barrido de entrada: cada tramo se dibuja en 700 ms, uno tras otro (80 ms entre tramos).
const DURACION = 700;
const ESCALON = 80;
// Largo mínimo de un tramo: casi nulo, así solo se ven sus extremos redondeados (un punto del mismo
// grosor que el anillo). Sus brillos usan el mismo largo.
const LARGO_PUNTO = 0.01;

// Todo lo que se dibuja cabe en el cuadro de `lado`: la órbita va en el borde, el brillo más ancho
// (la mitad de GROSOR_BRILLO_LEJOS hacia fuera) queda dentro de ella, y el anillo va más adentro.
function geometriaDona(lado) {
  const centro = lado / 2;
  const radioOrbita = centro - ESPACIO_ORBITA / 2;
  const radio = centro - (ESPACIO_ORBITA + GROSOR_BRILLO_LEJOS / 2 + HOLGURA);
  const diametroInterior = (radio - GROSOR / 2) * 2;
  return {
    lado,
    centro,
    radio,
    radioOrbita,
    circunferencia: 2 * Math.PI * radio,
    anchoCentro: diametroInterior - MARGEN_CENTRO * 2,
  };
}

// Dona del gasto por categoría (RF8; diseño HU-81, Stitch reportes_modo_oscuro/_claro), dibujada
// con react-native-svg directo sobre el fondo con brillo (sin tarjeta). Capas, de abajo arriba:
// órbita punteada, pista tenue, los dos brillos de cada tramo y los tramos (puntas redondeadas y
// separación; geometría en utils/dona.js). El centro va en una capa encima, dentro del anillo.
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
  const { width } = useWindowDimensions();
  const g = useMemo(
    () => geometriaDona(Math.min(width - espacios.margen * 2, LADO_MAXIMO)),
    [width],
  );

  const arcos = useMemo(
    () =>
      arcosDona(
        datos.map((d) => d.value),
        { radio: g.radio, grosor: GROSOR, separacion: SEPARACION },
      ),
    [datos, g.radio],
  );

  // "$1,237.25" → "$1,237" y ".25"
  const texto = formatearMonto(total);
  const punto = texto.lastIndexOf('.');
  const entero = punto >= 0 ? texto.slice(0, punto) : texto;
  const centavos = punto >= 0 ? texto.slice(punto) : '';

  // Capas de cada tramo: brillo lejano, brillo cercano y el trazo. Se dibujan por capa (todos los
  // brillos primero) para que ningún brillo tape un tramo vecino.
  const capas = [
    { clave: 'lejos', grosor: GROSOR_BRILLO_LEJOS, opacidad: colors.donaBrilloLejos },
    { clave: 'cerca', grosor: GROSOR_BRILLO_CERCA, opacidad: colors.donaBrilloCerca },
    { clave: 'tramo', grosor: GROSOR, opacidad: 1 },
  ];

  return (
    <View
      style={[styles.contenedor, { width: g.lado, height: g.lado }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Total gastado ${texto}. ${descripcionDona(datos)}`}
    >
      <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${g.lado} ${g.lado}`}>
        <Circle
          cx={g.centro}
          cy={g.centro}
          r={g.radioOrbita}
          fill="none"
          stroke={colors.borderStrong}
          strokeWidth={0.8}
          strokeDasharray="3 4"
        />
        <Circle
          cx={g.centro}
          cy={g.centro}
          r={g.radio}
          fill="none"
          stroke={colors.outlineVariant30}
          strokeWidth={GROSOR}
        />
        {capas.map((capa) =>
          arcos.map((arco, i) => (
            <Tramo
              key={`${capa.clave}-${datos[arco.indice].id}-${animacion}`}
              arco={arco}
              geometria={g}
              color={datos[arco.indice].color}
              grosor={capa.grosor}
              opacidad={capa.opacidad}
              orden={i}
              animar={!reducirMovimiento}
            />
          )),
        )}
      </Svg>

      {/* Centro encima del Svg y dentro del anillo */}
      <View style={styles.capaCentro} pointerEvents="none">
        {/* Ancho fijo (diámetro interior - 2 × 24): el monto se achica para caber en él. */}
        <View style={[styles.centro, { width: g.anchoCentro }]}>
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
    </View>
  );
}

// Un arco del anillo: un círculo con strokeDasharray [largo, circunferencia] girado a su inicio.
// La entrada anima strokeDashoffset de `largo` a 0 (el trazo crece desde su inicio) y la opacidad,
// para que la punta redondeada no se vea antes de empezar el barrido.
function Tramo({ arco, geometria, color, grosor, opacidad, orden, animar }) {
  const { centro, radio, circunferencia } = geometria;
  const largo = arco.completo
    ? circunferencia
    : arco.punto
      ? LARGO_PUNTO
      : (arco.barrido / 360) * circunferencia;
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
    <G transform={`rotate(${arco.inicio - 90} ${centro} ${centro})`}>
      <AnimatedCircle
        cx={centro}
        cy={centro}
        r={radio}
        fill="none"
        stroke={color}
        strokeWidth={grosor}
        strokeLinecap={arco.completo ? 'butt' : 'round'}
        strokeDasharray={[largo, circunferencia]}
        animatedProps={props}
      />
    </G>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // Tamaño explícito (lado × lado, en línea); el Svg y el centro se apilan dentro.
    contenedor: {
      position: 'relative',
      alignSelf: 'center',
    },
    capaCentro: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centro: {
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
      maxWidth: '100%',
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
