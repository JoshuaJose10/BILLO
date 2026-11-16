import { esCategoriaPropia, ICONO_CATEGORIA_PROPIA } from '../theme/categorias.js';

// Ícono de MaterialCommunityIcons según el nombre de la categoría.
// Las predefinidas usan su ícono del diseño (restaurant, directions_car, theaters,
// bolt, health_and_safety, more_horiz); las propias usan `tag-outline` (HU-89 / HU-90).
const ICONOS = [
  { claves: ['comida', 'restaurante', 'alimento'], icono: 'silverware-fork-knife' },
  { claves: ['super', 'mercado', 'despensa'], icono: 'cart-outline' },
  { claves: ['transporte', 'gasolina', 'uber', 'taxi'], icono: 'car' },
  { claves: ['entretenimiento', 'ocio', 'cine'], icono: 'filmstrip' },
  { claves: ['servicio', 'luz', 'agua', 'internet'], icono: 'lightning-bolt' },
  { claves: ['salud', 'medic', 'farmacia'], icono: 'shield-plus-outline' },
  { claves: ['suscripcion'], icono: 'repeat' },
  { claves: ['otro'], icono: 'dots-horizontal-circle-outline' },
];

export const ICONO_GENERICO = ICONO_CATEGORIA_PROPIA;

// Minúsculas y sin acentos: "Educación" → "educacion".
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');
const normalizar = (texto) => (texto || '').toLowerCase().normalize('NFD').replace(DIACRITICOS, '');

export function iconoCategoria(nombre) {
  if (esCategoriaPropia(nombre)) return ICONO_GENERICO;
  const n = normalizar(nombre);
  const encontrado = ICONOS.find(({ claves }) => claves.some((c) => n.includes(c)));
  return encontrado ? encontrado.icono : ICONO_GENERICO;
}

// Texto de la fila de categorías de las hojas (Nuevo gasto, Presupuesto) según vistaLista.
export const TEXTO_ESTADO_CATEGORIAS = {
  cargando: 'Cargando categorías…',
  error: 'No se pudieron cargar',
  vacio: 'No hay categorías disponibles',
};

// Reglas y textos de Mis categorías (HU-90).
export const LONGITUD_MAX_CATEGORIA = 40;
export const MENSAJE_MINIMO_UNA_ACTIVA = 'Debes tener al menos una categoría';
export const MENSAJE_AVISO_PREDEFINIDA_GASTOS =
  'Tus gastos anteriores se conservan; solo dejará de ofrecerse al registrar';
export const MENSAJE_CATEGORIA_EN_USO =
  'Esta categoría tiene gastos o presupuestos; no se puede borrar';

// Valida el nombre de una categoría propia (1 a 40 caracteres, sin duplicados).
export function validarNombreCategoria(nombre, existentes = [], idEditando = null) {
  const limpio = typeof nombre === 'string' ? nombre.trim() : '';
  if (limpio.length < 1) {
    return {
      valido: false,
      nombre: '',
      error: 'Ingresa un nombre de entre 1 y 40 caracteres',
    };
  }
  if (limpio.length > LONGITUD_MAX_CATEGORIA) {
    return {
      valido: false,
      nombre: limpio,
      error: `El nombre no puede superar ${LONGITUD_MAX_CATEGORIA} caracteres`,
    };
  }
  const clave = limpio.toLowerCase();
  const duplicada = (existentes || []).some(
    (c) =>
      c &&
      typeof c.nombre === 'string' &&
      c.nombre.trim().toLowerCase() === clave &&
      (idEditando == null || String(c.id) !== String(idEditando)),
  );
  if (duplicada) {
    return {
      valido: false,
      nombre: limpio,
      error: 'Ya existe una categoría con ese nombre',
    };
  }
  return { valido: true, nombre: limpio, error: null };
}

// Ids de las categorías encendidas: el body de PUT /categorias/seleccion. «Omitir» de Elige tus
// categorías (HU-89) lo usa con la lista tal como llegó (las predefinidas por defecto).
export function idsSeleccionados(categorias) {
  return (categorias || []).filter((c) => c && Boolean(c.seleccionada)).map((c) => c.id);
}

// Calcula el siguiente estado al tocar el interruptor de una categoría predefinida.
// Regla HU-90: mínimo una activa; al apagar una, muestra el aviso de conservación de gastos.
export function calcularCambioSeleccionPredefinida(predefinidas, idCategoria) {
  const lista = Array.isArray(predefinidas) ? predefinidas : [];
  const objetivo = lista.find((c) => String(c.id) === String(idCategoria));
  const activas = idsSeleccionados(lista);

  if (!objetivo) {
    return {
      permitido: false,
      encendida: false,
      seleccionIds: activas,
      error: null,
      aviso: null,
    };
  }

  if (objetivo.seleccionada) {
    if (activas.length <= 1) {
      return {
        permitido: false,
        encendida: true,
        seleccionIds: activas,
        error: MENSAJE_MINIMO_UNA_ACTIVA,
        aviso: null,
      };
    }
    const seleccionIds = activas.filter((id) => String(id) !== String(idCategoria));
    return {
      permitido: true,
      encendida: false,
      seleccionIds,
      error: null,
      aviso: MENSAJE_AVISO_PREDEFINIDA_GASTOS,
    };
  }

  const seleccionIds = [...activas, objetivo.id];
  return {
    permitido: true,
    encendida: true,
    seleccionIds,
    error: null,
    aviso: null,
  };
}

// Filtra las categorías propias del usuario de la respuesta de GET /categorias.
export function extraerCategoriasPropias(categorias) {
  return (categorias || []).filter((c) => c && (c.propia === true || c.es_predefinida === false));
}

// Une las categorías activas con el catálogo de predefinidas para que los gastos históricos de una
// predefinida apagada sigan mostrando su nombre en Movimientos, Inicio y Reportes.
export function combinarCategoriasConPredefinidas(activas = [], predefinidas = []) {
  const mapa = new Map();
  for (const cat of predefinidas || []) {
    if (cat && cat.id != null) mapa.set(String(cat.id), cat);
  }
  for (const cat of activas || []) {
    if (cat && cat.id != null) mapa.set(String(cat.id), cat);
  }
  return Array.from(mapa.values());
}
