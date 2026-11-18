// Qué cabe en los widgets sin cortarse. Botones y chips nunca llevan «…»: si el texto no cabe se
// simplifica o se oculta. Sin imports (ni la librería ni JSX) para probarlo con node --test.

export const PADDING = 14;
export const TACTIL = 48; // área táctil mínima (dp)
export const FUENTE_BOTON = 13;
export const FUENTE_CHIP = 11;
export const GAP = 6;
// Columna derecha del mediano: «Voz» 48, Gasto e Ingreso 36 cada uno, próximo cobro 28, con 6
// de separación entre elementos.
export const ALTO = { dictar: 48, boton: 36, cobro: 28 };
const SEPARADOR = 1 + 2 * 12; // línea fina entre columnas con su margen

// Ancho estimado (dp) de un texto: ~0.6 de la fuente por carácter (holgado para semibold).
export const anchoTexto = (texto, fuente) => Math.ceil(String(texto).length * fuente * 0.6);

// Botón de acción: ícono 16, separación 4, texto y 8 de margen por lado.
export const anchoBoton = (texto) => 16 + 4 + anchoTexto(texto, FUENTE_BOTON) + 16;
// Pastilla: 8 de padding por lado, punto o ícono, separación 6 y texto.
export const anchoPastilla = (texto, icono = 6) => 16 + icono + 6 + anchoTexto(texto, FUENTE_CHIP);

// Primeras categorías (máx. 3, en orden de gasto) que caben completas; se detiene en la primera
// que no cabe: mejor menos chips que cortar un nombre.
export function categoriasQueCaben(nombres, disponible) {
  const caben = [];
  let usado = 0;
  for (const nombre of nombres.slice(0, 3)) {
    const ancho = anchoPastilla(nombre) + (caben.length ? GAP : 0);
    if (usado + ancho > disponible) break;
    caben.push(nombre);
    usado += ancho;
  }
  return caben;
}

// Chip del mes: 'completo' («+$X este mes»), 'corto' («+$X») o null si ni así cabe.
function chipQueCabe(ingresos, disponible) {
  if (!ingresos) return null;
  if (anchoPastilla(`${ingresos} este mes`, 12) <= disponible) return 'completo';
  return anchoPastilla(ingresos, 12) <= disponible ? 'corto' : null;
}

// Columnas del mediano: izquierda ~58% y derecha ~42% del ancho útil.
const columnas = (ancho) => {
  const interior = ancho - 2 * PADDING - SEPARADOR;
  const izquierda = Math.floor(interior * 0.58);
  return { izquierda, derecha: interior - izquierda };
};

// El mediano (4×2) se usa cuando su columna derecha alcanza para «+ Ingreso» completo.
export const esMediano = (ancho) => columnas(ancho).derecha >= anchoBoton('Ingreso');

// 2×2: textos de Gasto / Ingreso / Voz solo si los tres caben completos; el chip, si hay alto.
export function medidasPequeno({ ancho, alto, ingresos }) {
  const interior = ancho - 2 * PADDING;
  const boton = (interior - 2 * GAP) / 3;
  return {
    textoBotones: ['Gasto', 'Ingreso', 'Voz'].every((t) => anchoBoton(t) <= boton),
    chip: alto >= 170 ? chipQueCabe(ingresos, interior) : null,
  };
}

// 4×2: anchos de columna, «Dictar gasto / Voz rápida» o solo «Voz», chip, categorías que caben y
// si hay alto para el próximo cobro (se oculta antes que los botones).
export function medidasMediano({ ancho, alto, ingresos, categorias = [], cobro }) {
  const { izquierda, derecha } = columnas(ancho);
  // Alto total con el cobro: los cuatro elementos, sus 3 separaciones y el padding de arriba y
  // abajo. Si no cabe completo, se oculta (nunca cortado).
  const conCobro = 2 * PADDING + ALTO.dictar + 2 * ALTO.boton + ALTO.cobro + 3 * GAP;
  return {
    izquierda,
    derecha,
    dictarCompleto: 8 + 36 + 10 + anchoTexto('Dictar gasto', FUENTE_BOTON) + 8 <= derecha,
    chip: chipQueCabe(ingresos, izquierda),
    categorias: categoriasQueCaben(categorias, izquierda),
    cobro: Boolean(cobro) && conCobro <= alto,
  };
}

// «Registrar por voz» 2×1: los textos van solo si caben junto al micrófono.
export const textoRegistrarVoz = ({ ancho, lado }) =>
  ancho - 2 * PADDING - lado - 12 >= anchoTexto('Registrar por voz', 14);
