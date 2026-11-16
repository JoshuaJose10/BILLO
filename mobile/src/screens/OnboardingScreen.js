import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Boton from '../components/Boton';
import Etiqueta from '../components/Etiqueta';
import FondoDegradado from '../components/FondoDegradado';
import Logo from '../components/Logo';
import EscenaAtajo from '../components/onboarding/EscenaAtajo';
import EscenaGasto from '../components/onboarding/EscenaGasto';
import EscenaQuincena from '../components/onboarding/EscenaQuincena';
import EscenaSuscripciones from '../components/onboarding/EscenaSuscripciones';
import EscenaVoz from '../components/onboarding/EscenaVoz';
import { useAuth } from '../context/AuthContext';
import { espacios, estiloTarjeta, radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { tipografia } from '../theme/tipografia';

// `antes`: primera línea del título en peso normal (la segunda, `titulo`, en negrita).
// `libre`: la escena va sin tarjeta-maqueta (la composición del paso 1).
const PASOS = [
  {
    clave: 'quincena',
    Escena: EscenaQuincena,
    libre: true,
    etiqueta: '● Inteligencia financiera',
    antes: '¿A dónde se fue',
    titulo: 'tu quincena?',
    texto: 'Billo te lo dice. Registra, entiende y controla tus gastos.',
  },
  {
    clave: 'gasto',
    Escena: EscenaGasto,
    titulo: 'Registra un gasto en 3 toques',
    texto: 'Añade compras al instante con montos rápidos y categorías.',
  },
  {
    clave: 'voz',
    Escena: EscenaVoz,
    titulo: 'Dilo, no lo escribas',
    texto: 'Dicta tu gasto en lenguaje natural. Billo detecta el monto y la categoría.',
  },
  {
    clave: 'suscripciones',
    Escena: EscenaSuscripciones,
    titulo: 'Que ninguna suscripción te tome por sorpresa',
    texto: 'Te avisamos antes de cada cobro para que decidas a tiempo.',
  },
  {
    clave: 'atajo',
    Escena: EscenaAtajo,
    titulo: 'Mantén presionado el +',
    texto: 'Desliza a una categoría y suelta: tu gasto empieza ahí.',
  },
];

// Onboarding de 5 pasos (HU-93): logo y Omitir arriba; en cada paso la maqueta ocupa el alto libre
// y abajo, anclados, van los puntos, el título y el texto (wrap libre: nunca se recortan ni se
// encogen); el botón queda fijo. Comenzar y Omitir lo marcan como visto y
// RootNavigator pasa a Entrada. Cada escena anima componentes reales en el hilo de UI y solo
// mientras su paso está visible. Las escenas no reciben toques ni se leen: el lector anuncia
// "Paso N de 5" con el título y el texto.
export default function OnboardingScreen() {
  const { marcarOnboardingVisto } = useAuth();
  const { esOscuro } = useTema();
  const styles = useEstilos(crearEstilos);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const lista = useRef(null);
  const [indice, setIndice] = useState(0);
  const ultimo = indice === PASOS.length - 1;

  const continuar = () => {
    if (ultimo) {
      marcarOnboardingVisto();
      return;
    }
    lista.current?.scrollToIndex({ index: indice + 1 });
    setIndice(indice + 1);
  };

  return (
    <View style={styles.pantalla}>
      <StatusBar style={esOscuro ? 'light' : 'dark'} />
      <FondoDegradado />
      <View style={[styles.barra, { paddingTop: insets.top + espacios.sm }]}>
        <Logo nombre />
        <Pressable
          onPress={marcarOnboardingVisto}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Omitir introducción"
        >
          <Text style={styles.omitir}>Omitir</Text>
        </Pressable>
      </View>

      <FlatList
        ref={lista}
        data={PASOS}
        keyExtractor={(p) => p.clave}
        extraData={indice}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_d, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => setIndice(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item: { Escena, libre, etiqueta, antes, titulo, texto }, index }) => (
          <View style={[styles.pagina, { width }]}>
            <View
              style={[styles.maqueta, libre ? null : styles.marco]}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Escena activa={index === indice} />
            </View>
            <View
              style={styles.textos}
              accessible
              accessibilityLabel={`Paso ${index + 1} de ${PASOS.length}. ${antes ? `${antes} ` : ''}${titulo}. ${texto}`}
            >
              <View style={styles.puntos}>
                {PASOS.map((p, i) => (
                  <View
                    key={p.clave}
                    style={[styles.punto, i === index ? styles.puntoActivo : null]}
                  />
                ))}
              </View>
              {etiqueta ? <Etiqueta style={styles.etiqueta}>{etiqueta}</Etiqueta> : null}
              <Text style={styles.titulo}>
                {antes ? <Text style={styles.tituloLigero}>{`${antes}\n`}</Text> : null}
                {titulo}
              </Text>
              <Text style={styles.texto}>{texto}</Text>
            </View>
          </View>
        )}
      />

      <View style={[styles.pie, { paddingBottom: insets.bottom + espacios.md }]}>
        <Boton
          titulo={ultimo ? 'Comenzar' : 'Continuar'}
          icono={ultimo ? undefined : 'arrow-right'}
          onPress={continuar}
          accessibilityLabel={
            ultimo ? 'Comenzar' : `Continuar al paso ${indice + 2} de ${PASOS.length}`
          }
          grande
        />
      </View>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    pantalla: {
      flex: 1,
      backgroundColor: colors.background,
    },
    barra: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: espacios.margen,
      paddingBottom: espacios.sm,
    },
    omitir: {
      ...tipografia.bodyMd,
      fontFamily: fonts.sansSemiBold,
      color: colors.acentoTexto,
    },
    pagina: {
      paddingHorizontal: espacios.margen,
      paddingTop: espacios.sm,
      gap: espacios.md,
    },
    // Toma todo el alto libre; la escena va centrada.
    maqueta: {
      flex: 1,
      justifyContent: 'center',
    },
    // Tarjeta-maqueta (la misma tarjeta de vidrio de Inicio).
    marco: {
      ...estiloTarjeta(colors),
      overflow: 'hidden',
    },
    textos: {
      gap: espacios.sm,
    },
    etiqueta: {
      color: colors.textSecondary,
    },
    // Wrap libre a tamaño completo: nunca se recortan ni se encogen.
    titulo: {
      ...tipografia.display,
      flexShrink: 1,
      color: colors.text,
    },
    tituloLigero: {
      fontFamily: fonts.sans,
    },
    texto: {
      ...tipografia.bodyLg,
      flexShrink: 1,
      color: colors.textVariant,
    },
    pie: {
      paddingHorizontal: espacios.margen,
      paddingTop: espacios.md,
    },
    puntos: {
      flexDirection: 'row',
      gap: 6,
    },
    punto: {
      width: 6,
      height: 6,
      borderRadius: radios.full,
      backgroundColor: colors.outlineVariant,
    },
    puntoActivo: {
      width: 20,
      backgroundColor: colors.primary,
    },
  });
