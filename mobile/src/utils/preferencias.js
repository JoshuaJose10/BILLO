// Lógica pura de preferencias de Perfil (HU-87): tema, moneda preferida, estado de notificaciones
// e información de «Acerca de Billo». Sin dependencias de React Native ni de Expo para probarse con
// `node --test`.

import { esMonedaSoportada, MONEDA_DEFECTO, MONEDAS_DISPONIBLES } from './divisas.js';

export const MODOS_TEMA = [
  { valor: 'automatico', etiqueta: 'Automático', icono: 'brightness-auto' },
  { valor: 'claro', etiqueta: 'Claro', icono: 'white-balance-sunny' },
  { valor: 'oscuro', etiqueta: 'Oscuro', icono: 'weather-night' },
];

export const MODO_TEMA_DEFECTO = 'automatico';

export const EQUIPO_BILLO = [
  { nombre: 'Joshua José Dávalos Durán', rol: 'Líder de proyecto' },
  { nombre: 'Fernando Villafuerte Ferreyra', rol: 'Frontend y diseño' },
  { nombre: 'Luis Dorian Ferreira Calderón', rol: 'QA' },
  { nombre: 'Iker Solís Ramírez', rol: 'UX/UI y full-stack' },
  { nombre: 'Oscar Alejandro Arias Corona', rol: 'Backend' },
];

export const ENLACE_AYUDA_BILLO = 'https://github.com/JoshuaJose10/BILLO';

export function esModoTemaValido(modo) {
  return typeof modo === 'string' && MODOS_TEMA.some((m) => m.valor === modo);
}

export function normalizarModoTema(modo) {
  return esModoTemaValido(modo) ? modo : MODO_TEMA_DEFECTO;
}

// Resuelve si el tema activo debe ser oscuro según la preferencia guardada ('automatico' | 'claro' | 'oscuro')
// y el esquema reportado por el sistema operativo ('light' | 'dark' | null | undefined).
// En modo automático, si el sistema no informa 'light', se mantiene oscuro (diseño original de Billo).
export function resolverEsOscuro(modoTema, esquemaSistema) {
  const modo = normalizarModoTema(modoTema);
  if (modo === 'claro') return false;
  if (modo === 'oscuro') return true;
  return esquemaSistema !== 'light';
}

export function etiquetaModoTema(modoTema) {
  const modo = normalizarModoTema(modoTema);
  const encontrado = MODOS_TEMA.find((m) => m.valor === modo);
  return encontrado ? encontrado.etiqueta : 'Automático';
}

export function normalizarMonedaPreferida(codigo) {
  return esMonedaSoportada(codigo) ? codigo : MONEDA_DEFECTO;
}

export function descripcionMonedaPreferida(codigo) {
  const normalizada = normalizarMonedaPreferida(codigo);
  const encontrada =
    MONEDAS_DISPONIBLES.find((m) => m.codigo === normalizada) || MONEDAS_DISPONIBLES[0];
  return {
    ...encontrada,
    etiqueta: `${encontrada.codigo} · ${encontrada.nombre}`,
  };
}

// Determina la moneda inicial en Nuevo gasto:
// - Al editar un gasto existente, conserva la moneda de ese gasto (o MXN si no tiene).
// - Al crear un gasto nuevo, usa la moneda preferida guardada en el teléfono.
export function resolverMonedaInicialGasto(gastoEditado, monedaPreferida) {
  if (gastoEditado) {
    return esMonedaSoportada(gastoEditado.moneda) ? gastoEditado.moneda : MONEDA_DEFECTO;
  }
  return normalizarMonedaPreferida(monedaPreferida);
}

// Traduce el estado del permiso de notificaciones del sistema a estado visual para Perfil.
export function estadoNotificaciones(statusPermiso) {
  const activadas = statusPermiso === 'granted';
  return {
    activadas,
    etiqueta: activadas ? 'Activadas' : 'Desactivadas',
  };
}

// Estructura los datos de «Acerca de Billo» y la versión de la app.
export function obtenerInfoAcercaDe(versionConfig) {
  const version =
    typeof versionConfig === 'string' && versionConfig.trim() ? versionConfig.trim() : '1.0.0';
  return {
    nombre: 'Billo',
    version,
    descripcion: 'App móvil de gastos diarios, presupuestos y membresías digitales.',
    equipoNombre: 'Infinite Labs',
    integrantes: EQUIPO_BILLO,
    enlaceAyuda: ENLACE_AYUDA_BILLO,
  };
}
