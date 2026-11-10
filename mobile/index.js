import { registerRootComponent } from 'expo';

import App from './App';
import { configurarNotificaciones } from './src/services/notificaciones';
import { registrarWidget } from './src/spike/modulosNativos';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// HU-23 (spike RF13): tarea en segundo plano del widget; no hace nada en Expo Go.
registrarWidget();

// HU-47 (RF7): los avisos de cobro también se muestran con la app abierta.
configurarNotificaciones();
