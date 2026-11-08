import { repartirPorcentajes } from './reportes.js';

// Cálculos de la pantalla de Reportes (HU-81): desglose por categoría, comparación con el mes
// anterior y el "Consejo Billo". Funciones puras, deterministas y sin React Native (se prueban con
// node --test). Los gastos son los de GET /gastos ya normalizados:
// { id, monto (número), categoria_id, fecha: 'YYYY-MM-DD' }.

const MESES_CORTOS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

// Igual que formatearMonto (utils/formato.js), que no se puede importar aquí: importa './fechas'
// sin extensión y node --test no lo resuelve.
const formatoMoneda = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const redondear2 = (n) => Math.round(n * 100) / 100;
const numero = (valor) => {
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) ? n : 0;
};
const dosDigitos = (n) => String(n).padStart(2, '0');
const diaDe = (fecha) => Number(String(fecha).slice(8, 10));

// "YYYY-MM" del mes anterior.
function mesAnteriorDe(mes) {
  const [anio, numeroMes] = mes.split('-').map(Number);
  const fecha = new Date(anio, numeroMes - 2, 1);
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}`;
}

const mesDe = (fecha) => `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}`;

// Gastos con fecha hasta el día `hastaDia` del mes (todos si es null).
const hastaElDia = (gastos, hastaDia) =>
  (gastos || []).filter((g) => hastaDia == null || diaDe(g.fecha) <= hastaDia);

const sumar = (gastos) => redondear2((gastos || []).reduce((s, g) => s + numero(g.monto), 0));

// Periodo de comparación: en el mes en curso, del día 1 a hoy en ambos meses ("a esta misma
// fecha"); en un mes pasado, meses completos.
export function periodoComparacion(mes, hoy = new Date()) {
  const enCurso = mes === mesDe(hoy);
  return {
    mesAnterior: mesAnteriorDe(mes),
    hastaDia: enCurso ? hoy.getDate() : null,
    mismaFecha: enCurso,
  };
}

// Desglose del mes: [{ categoria_id, categoria, total, cantidad, porcentaje }] de mayor a menor
// total (empate: por nombre). `porcentaje` con un decimal, sumando exactamente 100 (el mismo
// reparto que la dona). La forma sirve directo para armarDatosDona.
export function desglosePorCategoria(gastos, nombrePorId = () => undefined) {
  const porId = new Map();
  (gastos || []).forEach((g) => {
    const clave = String(g.categoria_id);
    const fila = porId.get(clave) || { categoria_id: g.categoria_id, total: 0, cantidad: 0 };
    fila.total += numero(g.monto);
    fila.cantidad += 1;
    porId.set(clave, fila);
  });

  const filas = [...porId.values()]
    .map((f) => ({
      ...f,
      total: redondear2(f.total),
      categoria: nombrePorId(f.categoria_id) ?? 'Sin categoría',
    }))
    .filter((f) => f.total > 0)
    .sort((a, b) => b.total - a.total || a.categoria.localeCompare(b.categoria, 'es'));
  if (filas.length === 0) return [];

  const porcentajes = repartirPorcentajes(filas.map((f) => Math.round(f.total * 100)));
  return filas.map((f, i) => ({ ...f, porcentaje: porcentajes[i] }));
}

// Comparación del gasto del mes con el anterior (tarjeta "Rendimiento mensual").
// `gastosAnterior` null (no se pudo pedir) o sin gastos en el periodo → { disponible: false }.
// Si no: { disponible, actual, anterior, diferencia, porcentaje (entero, con signo), direccion
// ('bajo' | 'subio' | 'igual'), mismaFecha, mesAnterior }.
export function compararConMesAnterior({ mes, gastosMes, gastosAnterior, hoy = new Date() }) {
  const { mesAnterior, hastaDia, mismaFecha } = periodoComparacion(mes, hoy);
  if (!Array.isArray(gastosAnterior)) return { disponible: false, mesAnterior, mismaFecha };

  const actual = sumar(hastaElDia(gastosMes, hastaDia));
  const anterior = sumar(hastaElDia(gastosAnterior, hastaDia));
  if (anterior <= 0) return { disponible: false, mesAnterior, mismaFecha };

  const diferencia = redondear2(actual - anterior);
  const porcentaje = Math.round((diferencia * 100) / anterior);
  return {
    disponible: true,
    actual,
    anterior,
    diferencia,
    porcentaje,
    direccion: diferencia < 0 ? 'bajo' : diferencia > 0 ? 'subio' : 'igual',
    mismaFecha,
    mesAnterior,
  };
}

// "vs Oct -12%" / "vs Oct +8%" / "vs Oct 0%".
export function etiquetaComparacion(comparacion) {
  const { porcentaje, mesAnterior } = comparacion;
  const signo = porcentaje > 0 ? '+' : porcentaje < 0 ? '-' : '';
  const mesCorto = MESES_CORTOS[Number(mesAnterior.slice(5, 7)) - 1];
  return `vs ${mesCorto} ${signo}${Math.abs(porcentaje)}%`;
}

// Frase de la tarjeta: "Has gastado $168.80 menos que el mes pasado a esta misma fecha."
// En un mes pasado se quita "a esta misma fecha".
export function textoComparacion(comparacion) {
  if (!comparacion?.disponible) return 'Sin datos del mes anterior para comparar';
  const cuando = comparacion.mismaFecha ? ' a esta misma fecha' : '';
  if (comparacion.direccion === 'igual') {
    return `Has gastado lo mismo que el mes pasado${cuando}.`;
  }
  const monto = formatoMoneda.format(Math.abs(comparacion.diferencia));
  const sentido = comparacion.direccion === 'bajo' ? 'menos' : 'más';
  return `Has gastado ${monto} ${sentido} que el mes pasado${cuando}.`;
}

// "Consejo Billo": una frase calculada con reglas fijas, o null si no hay datos suficientes.
// 1. Si alguna categoría se pasó de su presupuesto, la que más se pasó (es la que empuja el gasto).
// 2. Si no, la categoría con mayor cambio % frente al mes anterior en el mismo periodo que la
//    comparación (solo las que tuvieron gasto el mes anterior; empate: más gasto, luego nombre).
// 3. Sin presupuestos excedidos ni cambios → null (la tarjeta no aparece).
export function consejoDelMes({
  mes,
  gastosMes,
  gastosAnterior,
  presupuestos,
  nombrePorId = () => undefined,
  hoy = new Date(),
}) {
  const excedidos = (presupuestos || [])
    .map((p) => ({ ...p, exceso: redondear2(numero(p.gastado) - numero(p.monto_limite)) }))
    .filter((p) => numero(p.monto_limite) > 0 && p.exceso > 0)
    .sort((a, b) => b.exceso - a.exceso || String(a.categoria).localeCompare(b.categoria, 'es'));
  if (excedidos.length > 0) {
    const { categoria, exceso } = excedidos[0];
    return `${categoria} te sacó del presupuesto: va ${formatoMoneda.format(exceso)} arriba de su límite.`;
  }

  if (!Array.isArray(gastosAnterior)) return null;
  const { hastaDia } = periodoComparacion(mes, hoy);
  const actual = desglosePorCategoria(hastaElDia(gastosMes, hastaDia), nombrePorId);
  const anterior = desglosePorCategoria(hastaElDia(gastosAnterior, hastaDia), nombrePorId);
  const actualPorId = new Map(actual.map((c) => [String(c.categoria_id), c.total]));

  const cambios = anterior
    .map((c) => {
      const ahora = actualPorId.get(String(c.categoria_id)) ?? 0;
      return {
        categoria: c.categoria,
        cambio: Math.round(((ahora - c.total) * 100) / c.total),
        volumen: ahora + c.total,
      };
    })
    .filter((c) => c.cambio !== 0)
    .sort(
      (a, b) =>
        Math.abs(b.cambio) - Math.abs(a.cambio) ||
        b.volumen - a.volumen ||
        a.categoria.localeCompare(b.categoria, 'es'),
    );
  if (cambios.length === 0) return null;

  const { categoria, cambio } = cambios[0];
  const verbo = cambio < 0 ? 'bajaron' : 'subieron';
  return `Tus gastos en ${categoria} ${verbo} ${Math.abs(cambio)}% respecto al mes pasado.`;
}
