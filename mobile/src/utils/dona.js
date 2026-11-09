// Geometría de los arcos de la dona de Reportes (HU-81, estilo Stitch reportes_modo_oscuro).
// Función pura y sin React Native (se prueba con node --test). Ángulos en grados, desde las 12 en
// punto y en el sentido del reloj.
//
// Cada categoría recibe un "hueco" del anillo proporcional a su monto; los huecos suman 360°.
// Dentro de su hueco, el arco visible se centra y deja `separacion` grados libres. Como el trazo
// usa strokeLinecap="round", cada extremo crece grosor/2 a lo largo del anillo: por eso al arco se
// le resta el ángulo que ocupan las dos puntas (`capGrados`), y así los tramos no se enciman.
// Si al restar no queda arco, el tramo se dibuja como punto (barrido 0: solo las puntas
// redondeadas, un círculo del ancho del trazo). Para que ese punto quepa con su separación, ningún
// hueco mide menos de capGrados + separacion; lo que falta se toma de los huecos grandes en
// proporción a su tamaño.

const GRADOS = 180 / Math.PI;

// Ángulo (grados) que ocupa una longitud `largo` sobre un círculo de radio `radio`.
export const gradosDeLargo = (largo, radio) => (largo / radio) * GRADOS;

// Reparte 360° entre `valores` (positivos) con un mínimo por hueco: los que quedarían por debajo
// se fijan en el mínimo y el resto se reparte proporcionalmente entre los demás, hasta que no
// cambie. Si el mínimo no cabe para todos, cada uno recibe 360 / n.
function repartirHuecos(valores, minimo) {
  const n = valores.length;
  if (minimo * n >= 360) return valores.map(() => 360 / n);

  const fijos = new Set();
  let huecos = [];
  for (;;) {
    const libres = valores.map((_, i) => i).filter((i) => !fijos.has(i));
    const sumaLibres = libres.reduce((s, i) => s + valores[i], 0);
    const disponible = 360 - fijos.size * minimo;
    huecos = valores.map((v, i) => (fijos.has(i) ? minimo : (v / sumaLibres) * disponible));
    const nuevos = libres.filter((i) => huecos[i] < minimo);
    if (nuevos.length === 0) return huecos;
    nuevos.forEach((i) => fijos.add(i));
  }
}

// `valores`: montos de mayor a menor (los <= 0 se ignoran). Opciones en px: `radio` (del centro a
// la mitad del trazo), `grosor` (ancho del trazo) y `separacion` (espacio libre entre puntas).
// Devuelve [{ indice, desde, hasta, inicio, barrido, punto }]:
// - desde / hasta: el hueco del tramo (los huecos suman 360°).
// - inicio / barrido: el arco que se dibuja (sin contar las puntas redondeadas).
// - punto: true si el tramo es tan chico que se dibuja como punto.
// Con una sola categoría: un tramo con `completo: true` (anillo entero, sin hueco ni puntas).
export function arcosDona(valores, { radio, grosor, separacion }) {
  const conMonto = (valores || [])
    .map((valor, indice) => ({ valor: Number(valor), indice }))
    .filter((v) => Number.isFinite(v.valor) && v.valor > 0);
  if (conMonto.length === 0) return [];
  if (conMonto.length === 1) {
    return [
      {
        indice: conMonto[0].indice,
        desde: 0,
        hasta: 360,
        inicio: 0,
        barrido: 360,
        punto: false,
        completo: true,
      },
    ];
  }

  const capGrados = gradosDeLargo(grosor, radio);
  const sepGrados = gradosDeLargo(separacion, radio);
  const huecos = repartirHuecos(
    conMonto.map((v) => v.valor),
    capGrados + sepGrados,
  );

  let desde = 0;
  return conMonto.map((v, i) => {
    const hueco = huecos[i];
    const barrido = Math.max(hueco - sepGrados - capGrados, 0);
    const arco = {
      indice: v.indice,
      desde,
      hasta: desde + hueco,
      // El arco (más sus puntas) queda centrado en el hueco.
      inicio: desde + (hueco - barrido) / 2,
      barrido,
      punto: barrido === 0,
      completo: false,
    };
    desde += hueco;
    return arco;
  });
}
