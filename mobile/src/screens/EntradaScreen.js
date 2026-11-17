import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Boton from '../components/Boton';
import FondoDegradado from '../components/FondoDegradado';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { espacios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { tipografia } from '../theme/tipografia';

const RESPIRAR = { duration: 3000, easing: Easing.inOut(Easing.quad) };

// Entrada (HU-93): pantalla sin sesión al terminar u omitir el onboarding y al cerrar sesión.
// Resplandor de marca arriba que respira lento (6 s ida y vuelta), logo, título y las entradas;
// todo entra escalonado en ~800 ms. Con "Reducir movimiento" nada se mueve.
export default function EntradaScreen({ navigation }) {
  const { explorarSinCuenta } = useAuth();
  const { esOscuro } = useTema();
  const styles = useEstilos(crearEstilos);
  const insets = useSafeAreaInsets();
  const reducirMovimiento = useReducedMotion();
  const respiro = useSharedValue(0);

  useEffect(() => {
    if (reducirMovimiento) return undefined;
    respiro.set(withRepeat(withTiming(1, RESPIRAR), -1, true));
    return () => cancelAnimation(respiro);
  }, [respiro, reducirMovimiento]);

  const resplandor = useAnimatedStyle(() => ({
    opacity: 0.8 + 0.2 * respiro.value,
    transform: [{ scale: 1 + 0.06 * respiro.value }],
  }));

  return (
    <View style={[styles.pantalla, { paddingBottom: insets.bottom + espacios.lg }]}>
      <StatusBar style={esOscuro ? 'light' : 'dark'} />
      <Animated.View style={[StyleSheet.absoluteFill, resplandor]} pointerEvents="none">
        <FondoDegradado capas="resplandorEntrada" />
      </Animated.View>

      <View style={styles.centro}>
        <Animated.View entering={ZoomIn.duration(400)}>
          <Logo tamano={64} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.textos}>
          <Text style={styles.titulo} accessibilityRole="header">
            Esto es Billo.
          </Text>
          <Text style={styles.texto}>Toma el control de tu quincena.</Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.pie}>
        <Boton
          titulo="Crear cuenta"
          onPress={() => navigation.navigate('Registro')}
          accessibilityLabel="Crear cuenta"
          brillo
        />
        <Boton
          titulo="Ya tengo cuenta"
          onPress={() => navigation.navigate('Login')}
          accessibilityLabel="Ya tengo cuenta, iniciar sesión"
          secundario
        />
        <View style={styles.explorar}>
          <Boton
            titulo="Explorar sin cuenta"
            onPress={explorarSinCuenta}
            accessibilityLabel="Explorar sin cuenta con datos de ejemplo"
            chico
          />
        </View>
      </Animated.View>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    pantalla: {
      flex: 1,
      paddingHorizontal: espacios.lg,
      backgroundColor: colors.background,
    },
    centro: {
      flex: 1,
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: espacios.lg,
      paddingBottom: espacios.xl,
    },
    textos: {
      alignItems: 'center',
      gap: espacios.sm,
    },
    titulo: {
      ...tipografia.display,
      color: colors.text,
      textAlign: 'center',
    },
    texto: {
      ...tipografia.bodyLg,
      color: colors.textVariant,
      textAlign: 'center',
    },
    pie: {
      gap: espacios.sm + 4,
    },
    explorar: {
      marginTop: espacios.xs,
    },
  });
