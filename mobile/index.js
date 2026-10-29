import { registerRootComponent } from 'expo';

import App from './App';
import { registrarWidget } from './src/spike/modulosNativos';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// HU-23 (spike RF13): tarea en segundo plano del widget; no hace nada en Expo Go.
registrarWidget();
