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
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import PantallaCarga from './src/components/PantallaCarga';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { TemaProvider } from './src/theme/TemaContext';

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
          <NavigationContainer>
            <RootNavigator />
            {/* Toda la app usa tema oscuro. */}
            <StatusBar style="light" />
          </NavigationContainer>
        </TemaProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
