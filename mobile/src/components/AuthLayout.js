import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FondoAuth from './FondoAuth';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

// Estructura común de Login y Registro: fondo difuminado, wordmark arriba y formulario en una
// hoja inferior (Stitch 05_login_oscuro y registro_bottom_sheet_modo_oscuro).
// Con el teclado abierto el contenido se puede desplazar; tocar fuera cierra el teclado.
// `mostrarFinal`: si es true y el teclado está abierto, baja hasta el final (botón principal).
// `fondo`: 'login' (manchas de luz) o 'registro' (composición difuminada).
export default function AuthLayout({
  titulo,
  subtitulo,
  mostrarFinal = false,
  fondo = 'login',
  children,
}) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const fondoRef = useRef(null);
  const [tecladoVisible, setTecladoVisible] = useState(false);

  useEffect(() => {
    const mostrar = Keyboard.addListener('keyboardDidShow', () => setTecladoVisible(true));
    const ocultar = Keyboard.addListener('keyboardDidHide', () => setTecladoVisible(false));
    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, []);

  useEffect(() => {
    if (tecladoVisible && mostrarFinal) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [tecladoVisible, mostrarFinal]);

  return (
    // iOS: el ScrollView ajusta sus insets al teclado (automaticallyAdjustKeyboardInsets).
    // Android: KeyboardAvoidingView reduce la altura para que el ScrollView pueda desplazarse.
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'android' ? 'height' : undefined}
      enabled={Platform.OS === 'android'}
    >
      <StatusBar style="light" />
      <FondoAuth variante={fondo} objetivoRef={fondoRef} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.contenido} onPress={Keyboard.dismiss} accessible={false}>
          {/* pt-16 px-6, centrado */}
          <View style={[styles.cabecera, { paddingTop: insets.top + 64 }]}>
            {/* w-12 h-12 rounded-2xl bg-surface-container-high/80 border-outline-variant/30
                shadow-lg backdrop-blur-md */}
            <View style={styles.iconoSombra}>
              <View style={styles.icono}>
                <BlurView
                  tint="dark"
                  intensity={30}
                  blurTarget={fondoRef}
                  blurMethod="dimezisBlurView"
                  style={StyleSheet.absoluteFill}
                />
                <MaterialCommunityIcons name="wallet-outline" size={26} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.wordmark}>Billo</Text>
            <Text style={styles.lema}>Controla tus gastos sin esfuerzo</Text>
          </View>

          {/* rounded-t-[32px] px-margin pt-4 pb-8 (+ pb-safe) */}
          <View style={[styles.hoja, { paddingBottom: insets.bottom + 32 }]}>
            <View style={styles.jalador} />
            <View style={styles.encabezado}>
              <Text style={styles.titulo}>{titulo}</Text>
              <Text style={styles.subtitulo}>{subtitulo}</Text>
            </View>
            {children}
          </View>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
  },
  contenido: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cabecera: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  // La sombra va en un contenedor aparte: con overflow hidden iOS la recortaría.
  iconoSombra: {
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: colors.sombra,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15,
    shadowOpacity: 0.35,
  },
  icono: {
    width: 48,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh80, // surface-container-high/80
    borderWidth: 1,
    borderColor: colors.outlineVariant30, // outline-variant/30
  },
  // text-[32px] font-bold tracking-tight leading-none text-white
  wordmark: {
    fontFamily: fonts.sansBold,
    color: colors.text,
    fontSize: 32,
    lineHeight: 32,
    letterSpacing: -0.8,
  },
  // text-sm text-neutral-400 mt-2
  lema: {
    fontFamily: fonts.sans,
    color: colors.textNav,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  // bg-surface-container-lowest/95; borde superior sutil en todo el ancho
  hoja: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderTopColor: colors.borderTop,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  // w-10 h-1 rounded-full bg-outline-variant mb-3
  jalador: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    marginBottom: 12,
  },
  encabezado: {
    marginBottom: 20,
  },
  // display-hero-mobile: Inter 700 34/38, tracking-tight
  titulo: {
    fontFamily: fonts.sansBold,
    color: colors.text,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.85,
  },
  // body-md: Inter 400 14/20, on-surface-variant, mt-1
  subtitulo: {
    fontFamily: fonts.sans,
    color: colors.textVariant,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
