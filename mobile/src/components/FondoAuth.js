import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurTargetView, BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import FondoDegradado from './FondoDegradado';

const CAPAS = 10;
const MARGEN = 20; // px-margin

// Mancha de luz difusa. RN no tiene `filter: blur()`: se apilan círculos concéntricos cada vez
// más pequeños y translúcidos (degradado radial) y el BlurView de encima suaviza los bordes.
// `difuminado` imita el radio de blur-xl/2xl/3xl: agranda la mancha y la hace caer hacia afuera.
// `top`/`left` son los de la mancha sin difuminar, como en el HTML.
function Resplandor({ tamano, difuminado, color, opacidad, top, left }) {
  const total = tamano + difuminado;
  // Opacidad por capa para que el centro acumule `opacidad`.
  const opacidadCapa = 1 - Math.pow(1 - opacidad, 1 / CAPAS);
  return (
    <View
      style={[
        styles.resplandor,
        { top: top - difuminado / 2, left: left - difuminado / 2, width: total, height: total },
      ]}
    >
      {Array.from({ length: CAPAS }, (_, i) => {
        const d = total * (1 - i / CAPAS);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: d,
              height: d,
              borderRadius: d / 2,
              backgroundColor: color,
              opacity: opacidadCapa,
            }}
          />
        );
      })}
    </View>
  );
}

// Login (05_login_oscuro): tres manchas de luz sobre surface.
function ManchasLogin({ width, height }) {
  return (
    <>
      {/* -top-12 -left-12 w-64 h-64 bg-surface-bright/20 blur-3xl */}
      <Resplandor
        tamano={256}
        difuminado={64}
        color={colors.surfaceBright}
        opacidad={0.2}
        top={-48}
        left={-48}
      />
      {/* top-28 -right-16 w-72 h-72 bg-primary/10 blur-3xl */}
      <Resplandor
        tamano={288}
        difuminado={64}
        color={colors.primary}
        opacidad={0.1}
        top={112}
        left={width + 64 - 288}
      />
      {/* top-1/4 w-80 h-80 (centrado) bg-surface-container-high/40 blur-2xl */}
      <Resplandor
        tamano={320}
        difuminado={40}
        color={colors.surfaceHigh}
        opacidad={0.4}
        top={height / 4}
        left={(width - 320) / 2}
      />
    </>
  );
}

// Registro (registro_bottom_sheet_modo_oscuro): composición "Bienvenida" falsa (cabecera,
// tarjeta con figuras 3D y accesos rápidos) con opacity-35, difuminada detrás de la hoja.
function ComposicionRegistro({ width, top }) {
  const anchoTarjeta = width - MARGEN * 2;
  return (
    <View style={[styles.composicion, { top }]}>
      {/* Cabecera falsa */}
      <View style={styles.filaCabecera}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons name="wallet-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.pastilla} />
      </View>

      {/* Tarjeta: h-56 rounded-xl bg-surface-container-lowest p-4 shadow-2xl */}
      <View style={styles.tarjeta}>
        {/* -right-8 -top-8 w-44 h-44 bg-surface-bright/20 blur-2xl */}
        <Resplandor
          tamano={176}
          difuminado={40}
          color={colors.surfaceBright}
          opacidad={0.2}
          top={-32}
          left={anchoTarjeta + 32 - 176}
        />
        {/* -left-6 -bottom-6 w-36 h-36 bg-primary/10 blur-xl */}
        <Resplandor
          tamano={144}
          difuminado={24}
          color={colors.primary}
          opacidad={0.1}
          top={224 + 24 - 144}
          left={-24}
        />
        <View style={styles.filaTarjeta}>
          <View style={styles.columnaSaldo}>
            <View style={[styles.linea, { width: 64, backgroundColor: colors.outline }]} />
            <View style={styles.saldo} />
          </View>
          <View style={styles.chip}>
            <MaterialCommunityIcons
              name="contactless-payment"
              size={22}
              color={colors.outlineVariant}
            />
          </View>
        </View>
        {/* Monolitos: rotate-12 y -rotate-6 */}
        <View style={styles.centroTarjeta}>
          <View style={styles.monolito}>
            <View style={styles.monolitoInterior}>
              <MaterialCommunityIcons name="chart-line-variant" size={32} color={colors.primary} />
            </View>
          </View>
        </View>
        <View style={[styles.filaTarjeta, styles.filaInferior]}>
          <View style={[styles.linea, { width: 112, backgroundColor: colors.outlineVariant }]} />
          <View style={styles.etiquetaMonto} />
        </View>
      </View>

      {/* Accesos rápidos: grid-cols-2 gap-4 h-20 rounded-xl bg-surface-container-low */}
      <View style={styles.accesos}>
        {[80, 64].map((ancho) => (
          <View key={ancho} style={styles.acceso}>
            <View style={styles.accesoIcono} />
            <View style={[styles.linea, { width: ancho, backgroundColor: colors.outline }]} />
          </View>
        ))}
      </View>
    </View>
  );
}

// Fondo de Login y Registro: degradado de color, las figuras de cada pantalla, un velo
// surface/60 con backdrop-blur que las difumina y el brillo de FondoDegradado encima. `objetivoRef` es el BlurTargetView que
// también usan otros BlurView de la pantalla (Android lo necesita para difuminar).
export default function FondoAuth({ variante = 'login', objetivoRef }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const esRegistro = variante === 'registro';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <BlurTargetView ref={objetivoRef} style={StyleSheet.absoluteFill}>
        {/* Luz suave arriba que se apaga hacia la hoja */}
        <LinearGradient
          colors={[colors.surfaceLow, colors.background, colors.surfaceLowest]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
        {esRegistro ? (
          <ComposicionRegistro width={width} top={insets.top + 64} />
        ) : (
          <ManchasLogin width={width} height={height} />
        )}
      </BlurTargetView>
      {/* backdrop-blur-xl (Registro suma el blur-[18px] de la composición) */}
      <BlurView
        tint="dark"
        intensity={esRegistro ? 70 : 40}
        blurTarget={objetivoRef}
        blurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      {/* bg-surface/60 */}
      <View style={[StyleSheet.absoluteFill, styles.velo]} />
      {/* Tinte índigo/violeta de Luminal Glow encima del velo, sin tapar las figuras */}
      <FondoDegradado />
    </View>
  );
}

const styles = StyleSheet.create({
  resplandor: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  velo: {
    backgroundColor: colors.background60,
  },
  // px-margin gap-6 opacity-35
  composicion: {
    position: 'absolute',
    left: MARGEN,
    right: MARGEN,
    gap: 24,
    opacity: 0.35,
  },
  filaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastilla: {
    width: 80,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceHighest,
  },
  tarjeta: {
    height: 224,
    borderRadius: 12,
    backgroundColor: colors.surfaceLowest,
    padding: 16,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  filaTarjeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  filaInferior: {
    alignItems: 'flex-end',
  },
  columnaSaldo: {
    gap: 4,
  },
  linea: {
    height: 12,
    borderRadius: 6,
  },
  saldo: {
    width: 128,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  chip: {
    width: 48,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceHighest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centroTarjeta: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  monolito: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '12deg' }],
  },
  monolitoInterior: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.surfaceBright40, // surface-bright/40
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  etiquetaMonto: {
    width: 48,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primaryFixedDim,
  },
  accesos: {
    flexDirection: 'row',
    gap: 16,
  },
  acceso: {
    flex: 1,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.surfaceLow,
    padding: 16,
    justifyContent: 'space-between',
  },
  accesoIcono: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.surfaceHighest,
  },
});
