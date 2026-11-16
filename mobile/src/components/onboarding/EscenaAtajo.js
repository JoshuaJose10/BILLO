import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { crearDatosEjemplo, saldoMesEjemplo } from '../../datos/ejemplo';
import { tramo, useReloj } from '../../hooks/useReloj';
import { espacios, radios } from '../../theme/colors';
import { useEstilos, useTema } from '../../theme/TemaContext';
import { accionesAbanico, posicionesAbanico } from '../../utils/abanico';
import { arcoAbanico } from '../AbanicoAcciones';
import { useFilasDeslizables } from '../FilaDeslizable';
import FilaMovimiento from '../FilaMovimiento';
import NavbarFlotante, { centroBotonCentral, useAlturaNavbar } from '../NavbarFlotante';
import TarjetaSaldo from '../TarjetaSaldo';

// Barra estática: las pestañas de MainTabs, ninguna activa (así el + queda al centro).
const PESTANAS = [
  ['Inicio', 'home-outline'],
  ['Movimientos', 'receipt-text-outline'],
  ['Reportes', 'chart-pie-outline'],
  ['Cartera', 'wallet-outline'],
];
const ESTADO = { index: -1, routes: PESTANAS.map(([name]) => ({ key: name, name })) };
const DESCRIPTORES = Object.fromEntries(
  PESTANAS.map(([name, icono]) => [name, { options: { title: name, tabBarIconName: icono } }]),
);
const NAVEGACION = { emit: () => ({ defaultPrevented: true }), navigate: () => {} };
const SIN_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };
const nada = () => {};

// Inicio falso de fondo: el saldo y los últimos 3 gastos de ejemplo.
const datos = crearDatosEjemplo();
const SALDO = saldoMesEjemplo();
const nombreCategoria = (id) => datos.categorias.find((c) => c.id === id)?.nombre;
const RECIENTES = datos.gastos
  .slice(-3)
  .reverse()
  .map((g) => ({ ...g, tipo: 'gasto' }));

// El dedo recorre Comida → Transporte → Entretenimiento → Comida (las 3 primeras acciones): se
// queda HOLD ms en cada una (resaltada) y tarda MOVER ms entre ellas. Bucle continuo.
const HOLD = 700;
const MOVER = 500;
const RECORRIDO = [0, 1, 2];
const TRAMO = HOLD + MOVER;
const CICLO = TRAMO * RECORRIDO.length;
const DEDO = 40;
const ANILLO = 30;

// Paso 5 del onboarding: el atajo del + sobre un Inicio atenuado, con la NavbarFlotante y el
// AbanicoAcciones reales abiertos desde fuera. Sin safe area: la barra va pegada al borde.
export default function EscenaAtajo({ activa }) {
  return (
    <SafeAreaInsetsContext.Provider value={SIN_INSETS}>
      <Demostracion activa={activa} />
    </SafeAreaInsetsContext.Provider>
  );
}

function Demostracion({ activa }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const filas = useFilasDeslizables();
  const altoInferior = useAlturaNavbar();
  const [area, setArea] = useState({ width: 0, height: 0 });
  const { width: ancho, height: alto } = area;
  const t = useReloj(activa, CICLO, HOLD / 2);

  const acciones = useMemo(
    () => accionesAbanico({ frecuentes: datos.categorias, ancho, conVoz: false }),
    [ancho],
  );
  const puntos = useMemo(() => {
    const posiciones = posicionesAbanico(
      acciones.length,
      arcoAbanico({ ancho, alto, altoInferior }),
    );
    return RECORRIDO.map((i) => posiciones[i]);
  }, [acciones.length, ancho, alto, altoInferior]);
  const boton = { x: ancho / 2, y: centroBotonCentral(alto) };

  // El abanico queda abierto; resalta la categoría mientras el dedo está quieto sobre ella.
  const abierto = useSharedValue(1);
  const activo = useDerivedValue(() =>
    t.value % TRAMO < HOLD ? RECORRIDO[Math.floor(t.value / TRAMO) % RECORRIDO.length] : -1,
  );
  const botonX = useDerivedValue(() => boton.x);
  const botonY = useDerivedValue(() => boton.y);
  const accionCentral = useMemo(
    () => ({
      icono: 'plus',
      accessibilityLabel: 'Nuevo gasto',
      onPress: nada,
      onElegir: nada,
      acciones,
      controlado: { abierto, activo, botonX, botonY },
    }),
    [acciones, abierto, activo, botonX, botonY],
  );

  const dedo = useAnimatedStyle(() => {
    const i = Math.floor(t.value / TRAMO) % puntos.length;
    const desde = puntos[i];
    const hasta = puntos[(i + 1) % puntos.length];
    const inicio = i * TRAMO + HOLD;
    const p = tramo(t.value, inicio, inicio + MOVER, Easing.inOut(Easing.quad));
    return {
      transform: [
        { translateX: desde.x + (hasta.x - desde.x) * p - DEDO / 2 },
        { translateY: desde.y + (hasta.y - desde.y) * p - DEDO / 2 },
      ],
    };
  });

  return (
    <View style={styles.area} onLayout={(e) => setArea(e.nativeEvent.layout)}>
      <View style={styles.inicio}>
        <TarjetaSaldo saldo={SALDO.saldo} ingresos={SALDO.ingresos} />
        {RECIENTES.map((g) => (
          <FilaMovimiento
            key={g.id}
            movimiento={g}
            nombreCategoria={nombreCategoria(g.categoria_id)}
            filas={filas}
            eliminar={nada}
            onEditar={nada}
          />
        ))}
      </View>
      {ancho > 0 ? (
        <>
          <NavbarFlotante
            state={ESTADO}
            descriptors={DESCRIPTORES}
            navigation={NAVEGACION}
            accionCentral={accionCentral}
          />
          {/* El + presionado: anillo de «mantener» lleno. */}
          <Svg
            width={ANILLO * 2 + 4}
            height={ANILLO * 2 + 4}
            style={[styles.anillo, { left: boton.x - ANILLO - 2, top: boton.y - ANILLO - 2 }]}
          >
            <Circle
              cx={ANILLO + 2}
              cy={ANILLO + 2}
              r={ANILLO}
              stroke={colors.acento}
              strokeWidth={3}
              fill="none"
            />
          </Svg>
          <Animated.View style={[styles.dedo, dedo]} />
        </>
      ) : null}
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    area: {
      flex: 1,
      overflow: 'hidden',
    },
    inicio: {
      gap: espacios.xs,
    },
    anillo: {
      position: 'absolute',
    },
    dedo: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: DEDO,
      height: DEDO,
      borderRadius: radios.full,
      backgroundColor: colors.primary40,
      borderWidth: 1,
      borderColor: colors.primary,
    },
  });
