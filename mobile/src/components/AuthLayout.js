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

import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

// Estructura común de Login y Registro: wordmark arriba y formulario en una hoja inferior.
// Con el teclado abierto el contenido se puede desplazar; tocar fuera cierra el teclado.
// `mostrarFinal`: si es true y el teclado está abierto, baja hasta el final (botón principal).
export default function AuthLayout({ titulo, subtitulo, mostrarFinal = false, children }) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
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
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.contenido} onPress={Keyboard.dismiss} accessible={false}>
          <View style={[styles.cabecera, { paddingTop: insets.top + 48 }]}>
            <Text style={styles.wordmark}>Billo</Text>
            <Text style={styles.lema}>Controla tus gastos sin esfuerzo</Text>
          </View>

          <View style={[styles.hoja, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.jalador} />
            <Text style={styles.titulo}>{titulo}</Text>
            <Text style={styles.subtitulo}>{subtitulo}</Text>
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
  wordmark: {
    fontFamily: fonts.sansBold,
    color: colors.text,
    fontSize: 52,
    letterSpacing: -1.5,
  },
  lema: {
    fontFamily: fonts.sans,
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: 6,
  },
  hoja: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  jalador: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.handle,
    marginBottom: 24,
  },
  titulo: {
    fontFamily: fonts.sansBold,
    color: colors.text,
    fontSize: 28,
  },
  subtitulo: {
    fontFamily: fonts.sans,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
    marginBottom: 28,
  },
});
