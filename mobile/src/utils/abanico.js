import { iconoCategoria } from './categorias.js';
import { mesActual, sumarMeses } from './fechas.js';

// Abanico del botón + (HU-92): geometría del arco y categorías que se ofrecen.
// Coordenadas de pantalla (y hacia abajo) y ángulos en grados en el sentido del reloj:
// 0 = derecha, 180 = izquierda, 270 = arriba. Un arco de 200 a 340 abre hacia arriba.
// arco: { ancho, base, radioMax, margen, anguloInicio, anguloFin }
// - ancho: el de la pantalla; el arco queda centrado en ancho / 2.
// - base: y del centro de las acciones más bajas (las de los extremos).
// - margen: distancia mínima del borde de la pantalla al centro de una acción.

const radianes = (grados) => (grados * Math.PI) / 180;

// radioMax, o menos si la pantalla es angosta: las acciones de los extremos respetan `margen`.
export function radioAbanico({ ancho, radioMax, margen, anguloInicio, anguloFin }) {
  const alcance = Math.max(
    Math.abs(Math.cos(radianes(anguloInicio))),
    Math.abs(Math.cos(radianes(anguloFin))),
  );
  return Math.max(0, Math.min(radioMax, (ancho / 2 - margen) / alcance));
}

// Centros de `n` acciones repartidas de anguloInicio a anguloFin (ambos incluidos), simétricas
// respecto al centro de la pantalla. Con una sola queda en medio del arco.
export function posicionesAbanico(n, arco) {
  const { ancho, base, anguloInicio, anguloFin } = arco;
  const radio = radioAbanico(arco);
  const centroY =
    base - radio * Math.max(Math.sin(radianes(anguloInicio)), Math.sin(radianes(anguloFin)));
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const angulo = radianes(anguloInicio + (anguloFin - anguloInicio) * t);
    return { x: ancho / 2 + radio * Math.cos(angulo), y: centroY + radio * Math.sin(angulo) };
  });
}

// Índice de la posición más cercana al dedo si está a `tolerancia` o menos; null si no hay
// ninguna o si el dedo sigue sobre el botón (la X), a `tolerancia` o menos de `centro`.
// Todo en las mismas coordenadas (las de la pantalla). Corre en el hilo de UI dentro del gesto.
export function accionBajoDedo(punto, posiciones, tolerancia, centro) {
  'worklet';
  const limite = tolerancia * tolerancia;
  const cx = punto.x - centro.x;
  const cy = punto.y - centro.y;
  if (cx * cx + cy * cy <= limite) return null;
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

// Por debajo de este ancho (pt) el abanico lleva una categoría menos: no caben seis.
export const ANCHO_COMPACTO = 360;

// Acciones del abanico del + en orden de izquierda a derecha: las categorías más usadas (4, o 3 en
// pantallas de menos de ANCHO_COMPACTO), «Ingreso» y «Por voz» (solo con el módulo de voz).
// Cada una lleva los params con los que se abre NuevoGasto. `tono` es el token de color del ícono.
export function accionesAbanico({ frecuentes, ancho, conVoz }) {
  const categorias = (frecuentes || []).slice(0, ancho < ANCHO_COMPACTO ? 3 : 4);
  return [
    ...categorias.map((c) => ({
      clave: `categoria-${c.id}`,
      icono: iconoCategoria(c.nombre),
      etiqueta: c.nombre,
      params: { categoriaId: c.id },
    })),
    {
      clave: 'ingreso',
      icono: 'arrow-down',
      tono: 'exito',
      etiqueta: 'Ingreso',
      params: { tipo: 'ingreso' },
    },
    ...(conVoz
      ? [{ clave: 'voz', icono: 'microphone', etiqueta: 'Por voz', params: { iniciarVoz: true } }]
      : []),
  ];
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
