import { ERROR_DESCONOCIDO, SIN_CONEXION } from '../services/api';

// Mensaje para el usuario de cada `code` de docs/api-contrato.md (v1.1), más los que genera
// la app (SIN_CONEXION y ERROR_DESCONOCIDO).
const MENSAJES = {
  // Cualquier ruta
  JSON_INVALIDO: 'La solicitud no es válida. Intenta de nuevo.',
  NO_AUTORIZADO: 'Tu sesión expiró. Inicia sesión de nuevo.',
  RUTA_NO_ENCONTRADA: 'Esta función no está disponible por ahora.',
  ERROR_SERVIDOR: 'Hubo un problema en el servidor. Intenta más tarde.',
  PROHIBIDO: 'No tienes permiso para hacer esto.',

  // Autenticación
  NOMBRE_REQUERIDO: 'Ingresa tu nombre.',
  EMAIL_INVALIDO: 'Ingresa un correo válido.',
  PASSWORD_MUY_CORTA: 'La contraseña debe tener al menos 8 caracteres.',
  EMAIL_DUPLICADO: 'Ese correo ya está registrado. Inicia sesión o usa otro.',
  CAMPOS_REQUERIDOS: 'Completa todos los campos.',
  CREDENCIALES_INVALIDAS: 'Correo o contraseña incorrectos.',
  USUARIO_NO_ENCONTRADO: 'No encontramos tu cuenta. Inicia sesión de nuevo.',

  // Categorías y gastos
  TIPO_INVALIDO: 'El tipo de categoría no es válido.',
  MONTO_INVALIDO: 'Ingresa un monto mayor a $0 con hasta 2 decimales.',
  CATEGORIA_INEXISTENTE: 'La categoría elegida ya no existe. Elige otra.',
  FECHA_INVALIDA: 'La fecha no es válida.',
  METODO_PAGO_INVALIDO: 'Elige un método de pago válido.',
  NOTA_INVALIDA: 'La nota puede tener hasta 200 caracteres.',
  MES_INVALIDO: 'El mes no es válido.',
  GASTO_NO_ENCONTRADO: 'Ese gasto ya no existe.',

  // Presupuestos, catálogo, membresías y notificaciones (S2/S3)
  PRESUPUESTO_DUPLICADO: 'Ya tienes un presupuesto para esa categoría en este mes.',
  PRESUPUESTO_NO_ENCONTRADO: 'Ese presupuesto ya no existe.',
  NOMBRE_INVALIDO: 'Ingresa un nombre válido.',
  COSTO_INVALIDO: 'Ingresa un costo mayor a $0.',
  SERVICIO_NO_ENCONTRADO: 'Ese servicio ya no existe.',
  SERVICIO_EN_USO: 'No se puede borrar: hay membresías que usan ese servicio.',
  FRECUENCIA_INVALIDA: 'Elige una frecuencia válida.',
  SERVICIO_INEXISTENTE: 'El servicio elegido ya no existe.',
  MEMBRESIA_NO_ENCONTRADA: 'Esa membresía ya no existe.',
  TOKEN_PUSH_INVALIDO: 'No se pudieron activar las notificaciones.',

  // Generados por la app
  [SIN_CONEXION]: 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
  [ERROR_DESCONOCIDO]: 'Ocurrió un error inesperado. Intenta de nuevo.',
};

// Mensaje claro para un error de la API. Con un código desconocido usa el `message`
// del servidor y, si no hay, el genérico.
export function mensajeError(code, mensajeServidor) {
  return MENSAJES[code] || mensajeServidor || MENSAJES[ERROR_DESCONOCIDO];
}
