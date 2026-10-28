import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Boton from '../components/Boton';
import { colors, radios } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { cargarVoz } from './modulosNativos';

// HU-23 (spike RF11-RF13): pantalla de pruebas técnicas. Solo se registra en __DEV__ y no
// forma parte del flujo de la app. En Expo Go los módulos nativos no existen y cada sección
// lo indica en lugar de fallar.
const FRASE_PRUEBA = 'cincuenta pesos en tacos';

function Seccion({ titulo, children }) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion}>{titulo}</Text>
      {children}
    </View>
  );
}

function PruebaVoz() {
  const voz = cargarVoz();
  const [escuchando, setEscuchando] = useState(false);
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState('');

  useEffect(() => {
    if (!voz) return undefined;
    const subs = [
      voz.addListener('start', () => setEscuchando(true)),
      voz.addListener('end', () => setEscuchando(false)),
      voz.addListener('result', (e) => {
        setTexto(e.results[0]?.transcript ?? '');
        if (e.isFinal) setEstado('Resultado final');
      }),
      voz.addListener('error', (e) => setEstado(`Error: ${e.error} (${e.message})`)),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [voz]);

  if (!voz) {
    return <Text style={styles.aviso}>No disponible: requiere el development build.</Text>;
  }

  const escuchar = async () => {
    setTexto('');
    setEstado('');
    try {
      const permiso = await voz.requestPermissionsAsync();
      if (!permiso.granted) {
        setEstado('Permiso de micrófono denegado');
        return;
      }
      if (!voz.isRecognitionAvailable()) {
        setEstado('El reconocimiento de voz no está disponible en este teléfono');
        return;
      }
      voz.start({
        lang: 'es-MX',
        interimResults: true,
        continuous: false,
        contextualStrings: ['pesos', 'tacos'],
      });
    } catch (e) {
      setEstado(`Error al iniciar: ${e.message}`);
    }
  };

  const verIdiomas = async () => {
    try {
      const { locales, installedLocales } = await voz.getSupportedLocales({});
      const tieneMx = (lista) => (lista.includes('es-MX') ? 'sí' : 'no');
      setEstado(
        `es-MX soportado: ${tieneMx(locales)} · instalado sin conexión: ${tieneMx(installedLocales)}`,
      );
    } catch (e) {
      setEstado(`No se pudieron leer los idiomas: ${e.message}`);
    }
  };

  return (
    <>
      <Text style={styles.texto}>Di: “{FRASE_PRUEBA}”</Text>
      <Boton
        titulo={escuchando ? 'Detener' : 'Escuchar (es-MX)'}
        icono="microphone"
        onPress={escuchando ? () => voz.stop() : escuchar}
      />
      <Boton titulo="Ver idiomas" onPress={verIdiomas} secundario />
      <Text style={styles.resultado}>{texto || '—'}</Text>
      {texto ? (
        <Text style={styles.texto}>
          Coincide con la frase:{' '}
          {texto.trim().toLowerCase() === FRASE_PRUEBA ? 'sí' : 'no (revisar a mano)'}
        </Text>
      ) : null}
      {estado ? <Text style={styles.aviso}>{estado}</Text> : null}
    </>
  );
}

export default function LaboratorioScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.pantalla}
      contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + 24 }]}
    >
      <Seccion titulo="Voz (RF12)">
        <PruebaVoz />
      </Seccion>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contenido: {
    padding: 16,
    gap: 16,
  },
  seccion: {
    gap: 12,
    padding: 16,
    borderRadius: radios['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLow,
  },
  tituloSeccion: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textSecondary,
  },
  texto: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textVariant,
  },
  resultado: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.text,
  },
  aviso: {
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
