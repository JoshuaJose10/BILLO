import { createNavigationContainerRef } from '@react-navigation/native';

// Referencia del NavigationContainer (App.js) para navegar desde fuera de los navegadores, como el
// aviso de presupuesto, que se dibuja encima de toda la app.
export const navegacionRef = createNavigationContainerRef();
