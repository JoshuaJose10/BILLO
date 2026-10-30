import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import PantallaCarga from './src/components/PantallaCarga';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { TemaProvider, useTema } from './src/theme/TemaContext';

// NavigationContainer con el fondo, la tarjeta y el texto del tema activo, para que al navegar no
// aparezcan destellos blancos o negros. La barra de estado va clara en oscuro y oscura en claro.
function Navegacion() {
  const { colors, esOscuro } = useTema();
  const temaNavegacion = useMemo(() => {
    const base = esOscuro ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.background,
        text: colors.text,
      },
    };
  }, [colors, esOscuro]);

  return (
    <NavigationContainer theme={temaNavegacion}>
      <RootNavigator />
      <StatusBar style={esOscuro ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  const [fuentesCargadas, errorFuentes] = useFonts({
    // La navbar dibuja los íconos como texto con esta fuente.
    ...MaterialCommunityIcons.font,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Si las fuentes fallan se sigue con las del sistema en vez de bloquear la app.
  // La pantalla de carga también sigue el tema del sistema.
  if (!fuentesCargadas && !errorFuentes) {
    return (
      <TemaProvider>
        <PantallaCarga />
      </TemaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <TemaProvider>
          <Navegacion />
        </TemaProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
