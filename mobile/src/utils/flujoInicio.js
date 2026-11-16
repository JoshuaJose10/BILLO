// Flujo de arranque (HU-93): qué navegador muestra RootNavigator y con qué pantalla abre Auth.
// Sin imports de React Native para poder probarlo con node --test.

// 'Sesion' con token; 'Visitante' en el modo exploración; sin ninguno, 'Onboarding' la primera vez
// y 'Auth' (que abre en Entrada) cuando ya se vio u omitió.
export function navegadorRaiz({ token, visitante, onboardingVisto }) {
  if (token) return 'Sesion';
  if (visitante) return 'Visitante';
  return onboardingVisto ? 'Auth' : 'Onboarding';
}

// Pantalla de Auth después de cerrar la sesión: Entrada, o Login si venció (ahí está el aviso).
export function entradaTrasCierre(sesionVencida) {
  return sesionVencida ? 'Login' : 'Entrada';
}
