import { mesActual, sumarMeses } from './fechas.js';

// Abanico del botón + (HU-92): geometría del arco y categorías que se ofrecen.
// Coordenadas relativas al centro del +, con el eje y de la pantalla (negativo hacia arriba).
// Ángulos en grados: 0 = derecha, 90 = arriba, 180 = izquierda.

// `n` puntos repartidos de anguloInicio a anguloFin (ambos incluidos) sobre un arco de `radio`.
// Con uno solo queda en medio del arco.
export function posicionesAbanico(n, radio, anguloInicio, anguloFin) {
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const angulo = ((anguloInicio + (anguloFin - anguloInicio) * t) * Math.PI) / 180;
    return { x: radio * Math.cos(angulo), y: -radio * Math.sin(angulo) };
  });
}

// Índice de la posición más cercana al dedo si está a `tolerancia` o menos; null si no hay
// ninguna o si el dedo sigue sobre el + (la X), a `tolerancia` o menos del centro.
// Corre en el hilo de UI dentro del gesto.
export function accionBajoDedo(punto, posiciones, tolerancia) {
  'worklet';
  const limite = tolerancia * tolerancia;
  if (punto.x * punto.x + punto.y * punto.y <= limite) return null;
  let indice = null;
  let mejor = limite;
  for (let i = 0; i < posiciones.length; i++) {
    const dx = punto.x - posiciones[i].x;
    const dy = punto.y - posiciones[i].y;
    const distancia = dx * dx + dy * dy;
    if (distancia <= mejor) {
      mejor = distancia;
      indice = i;
    }
  }
  return indice;
}

// Hasta `max` categorías activas, las más usadas primero: cuenta los gastos del mes de `hoy` y del
// anterior y, a la par, gana la usada más recientemente (fecha y luego id). Si no se llega a `max`,
// completa con las primeras activas en su orden; un usuario nuevo recibe solo esas. Los gastos de
// categorías que ya no están activas no cuentan.
export function categoriasFrecuentes(gastos, categoriasActivas, max = 5, hoy = new Date()) {
  const actual = mesActual(hoy);
  const meses = new Set([actual, sumarMeses(actual, -1)]);
  const activas = new Map((categoriasActivas || []).map((c) => [c.id, c]));
  const uso = new Map();
  for (const g of gastos || []) {
    if (!activas.has(g.categoria_id) || !meses.has(String(g.fecha).slice(0, 7))) continue;
    const previo = uso.get(g.categoria_id) ?? { veces: 0, fecha: '', id: -Infinity };
    const masReciente = g.fecha > previo.fecha || (g.fecha === previo.fecha && g.id > previo.id);
    uso.set(g.categoria_id, {
      veces: previo.veces + 1,
      fecha: masReciente ? g.fecha : previo.fecha,
      id: masReciente ? g.id : previo.id,
    });
  }
  const usadas = [...uso.entries()]
    .sort(
      ([, a], [, b]) =>
        b.veces - a.veces || (a.fecha === b.fecha ? b.id - a.id : a.fecha < b.fecha ? 1 : -1),
    )
    .map(([id]) => activas.get(id));
  const resto = [...activas.values()].filter((c) => !uso.has(c.id));
  return [...usadas, ...resto].slice(0, max);
}
