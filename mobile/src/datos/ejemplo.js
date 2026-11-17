import { MODO_VISITANTE } from '../services/api.js';
import { fechaLocalISO, mesActual, sumarMeses } from '../utils/fechas.js';
import { calcularDiasParaCobro, calcularTotalMensual, diasEnMes } from '../utils/membresias.js';
import { gastoPorCategoria } from '../utils/resumenMes.js';

// Modo exploración (HU-50, RF10; docs/api-contrato.md, "Modo exploración"): datos de ejemplo en
// memoria con la misma forma que las respuestas de la API, para que los servicios y las pantallas
// funcionen igual que con una cuenta. Nada de esto se guarda ni sale del teléfono: cada petición
// arma los datos de nuevo a partir de la fecha de hoy y las escrituras se rechazan con
// MODO_VISITANTE (la UI ya invita a crear cuenta antes de llegar aquí).
// Sin imports de React Native para poder probarlo con node --test.

const redondear2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const CATEGORIAS = [
  'Comida',
  'Transporte',
  'Entretenimiento',
  'Servicios',
  'Salud',
  'Otros',
  'Súper',
  'Café',
].map((nombre, i) => ({ id: i + 1, nombre, tipo: 'gasto', es_predefinida: true }));
const [COMIDA, TRANSPORTE, ENTRETENIMIENTO, SERVICIOS, SALUD, OTROS, SUPER, CAFE] = CATEGORIAS.map(
  (c) => c.id,
);

// [categoria_id, monto, día del mes, metodo_pago, nota]. En el mes actual el día se recorta a hoy
// para que ningún gasto quede en el futuro.
const GASTOS_MES_ANTERIOR = [
  [COMIDA, 410, 3, 'tarjeta', 'Despensa'],
  [SERVICIOS, 499, 5, 'transferencia', 'Internet'],
  [TRANSPORTE, 300, 8, 'efectivo', 'Gasolina'],
  [SALUD, 540, 12, 'tarjeta', 'Consulta dental'],
  [ENTRETENIMIENTO, 250, 15, 'tarjeta', 'Concierto'],
  [COMIDA, 275.8, 19, 'efectivo', 'Comida con amigos'],
  [SERVICIOS, 365, 22, 'transferencia', 'Luz'],
  [OTROS, 89.9, 26, 'efectivo', 'Papelería'],
];

const GASTOS_MES_ACTUAL = [
  [SUPER, 320, 1, 'tarjeta', 'Despensa'],
  [SERVICIOS, 499, 2, 'transferencia', 'Internet'],
  [TRANSPORTE, 250, 3, 'efectivo', 'Gasolina'],
  [ENTRETENIMIENTO, 420, 4, 'tarjeta', 'Boletos de cine'],
  [COMIDA, 185.5, 5, 'efectivo', 'Tacos'],
  [SALUD, 210, 6, 'tarjeta', 'Farmacia'],
  [SERVICIOS, 380, 7, 'transferencia', 'Luz'],
  [OTROS, 145, 8, 'efectivo', 'Regalo'],
  [TRANSPORTE, 120, 9, 'tarjeta', 'Uber'],
  [ENTRETENIMIENTO, 180, 10, 'tarjeta', 'Videojuego'],
  [CAFE, 96, 11, 'efectivo', 'Café'],
  [COMIDA, 248, 12, 'tarjeta', 'Cena'],
];

// Ingresos (HU-82): [monto, día del mes, fuente, descripcion]; el día se recorta igual que en
// los gastos. Con ellos el saldo de Inicio (ingresos − gastos del mes) queda en positivo.
const INGRESOS_MES_ANTERIOR = [
  [9000, 1, 'Sueldo', 'Quincena'],
  [1500, 15, 'Beca', 'Beca mensual'],
];
const INGRESOS_MES_ACTUAL = [
  [9000, 1, 'Sueldo', 'Quincena'],
  [2500, 7, 'Freelance', 'Diseño de logo'],
];

// Presupuestos del mes actual: Comida queda en 'ok', Servicios en 'alerta' y Entretenimiento en
// 'excedido' con los gastos de arriba.
const PRESUPUESTOS = [
  [COMIDA, 2000],
  [SERVICIOS, 1000],
  [ENTRETENIMIENTO, 500],
];

const CATALOGO = [
  { id: 1, nombre: 'Netflix', logo_url: null, costo_sugerido: 299 },
  { id: 2, nombre: 'Spotify', logo_url: null, costo_sugerido: 129 },
  { id: 3, nombre: 'iCloud', logo_url: null, costo_sugerido: 49 },
  { id: 4, nombre: 'Duolingo', logo_url: null, costo_sugerido: 1499 },
];

// [servicio_id, frecuencia, días para el cobro]: todas cobran pronto (dos en 3 días o menos).
const MEMBRESIAS = [
  [1, 'mensual', 2],
  [2, 'mensual', 3],
  [3, 'mensual', 9],
  [4, 'anual', 20],
];

function armarGastos(filas, mes, diaMaximo, primerId) {
  const [anio, numero] = mes.split('-').map(Number);
  const tope = Math.min(diaMaximo, diasEnMes(anio, numero));
  return filas.map(([categoria_id, monto, dia, metodo_pago, nota], i) => ({
    id: primerId + i,
    monto,
    moneda: 'MXN',
    monto_original: null,
    tipo_cambio: null,
    categoria_id,
    fecha: `${mes}-${String(Math.min(dia, tope)).padStart(2, '0')}`,
    metodo_pago,
    nota,
  }));
}

function armarIngresos(filas, mes, diaMaximo, primerId) {
  return filas.map(([monto, dia, fuente, descripcion], i) => ({
    id: primerId + i,
    monto,
    fecha: `${mes}-${String(Math.min(dia, diaMaximo)).padStart(2, '0')}`,
    descripcion,
    fuente,
  }));
}

// Membresía mensual que cobra dentro de `dias` días contados desde `hoy` (misma forma que la API).
// También la usan las maquetas del onboarding (HU-93).
export function membresiaEjemplo({
  id,
  nombre,
  costo,
  dias,
  frecuencia = 'mensual',
  hoy = new Date(),
}) {
  const fecha_cobro = fechaLocalISO(
    new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias),
  );
  return {
    id,
    nombre,
    costo,
    frecuencia,
    fecha_cobro,
    dias_para_cobro: calcularDiasParaCobro(fecha_cobro, fechaLocalISO(hoy)),
  };
}

// Todos los datos de ejemplo relativos a `hoy`. Cada llamada devuelve objetos nuevos.
export function crearDatosEjemplo(hoy = new Date()) {
  const mes = mesActual(hoy);
  const anterior = sumarMeses(mes, -1);

  const gastos = [
    ...armarGastos(GASTOS_MES_ANTERIOR, anterior, 31, 1),
    ...armarGastos(GASTOS_MES_ACTUAL, mes, hoy.getDate(), GASTOS_MES_ANTERIOR.length + 1),
  ];

  const [anioAnterior, numeroAnterior] = anterior.split('-').map(Number);
  const ingresos = [
    ...armarIngresos(INGRESOS_MES_ANTERIOR, anterior, diasEnMes(anioAnterior, numeroAnterior), 1),
    ...armarIngresos(INGRESOS_MES_ACTUAL, mes, hoy.getDate(), INGRESOS_MES_ANTERIOR.length + 1),
  ];

  const presupuestos = PRESUPUESTOS.map(([categoria_id, monto_limite], i) => ({
    id: i + 1,
    categoria_id,
    mes,
    monto_limite,
  }));

  const membresias = MEMBRESIAS.map(([servicio_id, frecuencia, dias], i) => {
    const servicio = CATALOGO.find((s) => s.id === servicio_id);
    return {
      servicio_id,
      ...membresiaEjemplo({
        id: i + 1,
        nombre: servicio.nombre,
        costo: servicio.costo_sugerido,
        dias,
        frecuencia,
        hoy,
      }),
    };
  });

  return {
    categorias: CATEGORIAS.map((c) => ({ ...c })),
    gastos,
    ingresos,
    presupuestos,
    membresias,
    catalogo: CATALOGO.map((s) => ({ ...s })),
  };
}

// Gastos o ingresos del mes.
const delMes = (lista, mes) => lista.filter((m) => m.fecha.startsWith(`${mes}-`));
const sumaMes = (lista, mes) =>
  redondear2(delMes(lista, mes).reduce((suma, m) => suma + m.monto, 0));

// Saldo del mes (ingresos − gastos) y los ingresos, como en Inicio. Lo usan las maquetas del
// onboarding (HU-93).
export function saldoMesEjemplo(hoy = new Date()) {
  const { gastos, ingresos } = crearDatosEjemplo(hoy);
  const mes = mesActual(hoy);
  const totalIngresos = sumaMes(ingresos, mes);
  return { saldo: redondear2(totalIngresos - sumaMes(gastos, mes)), ingresos: totalIngresos };
}

// Mismas reglas que GET /presupuestos (backend/src/controllers/presupuestos.controller.js).
function presupuestosConEstado({ presupuestos, gastos, categorias }, mes) {
  return presupuestos
    .filter((p) => p.mes === mes)
    .map((p) => {
      const gastado = redondear2(
        delMes(gastos, mes)
          .filter((g) => g.categoria_id === p.categoria_id)
          .reduce((suma, g) => suma + g.monto, 0),
      );
      const estado =
        gastado > p.monto_limite
          ? 'excedido'
          : gastado * 100 >= p.monto_limite * 80
            ? 'alerta'
            : 'ok';
      return {
        ...p,
        categoria: categorias.find((c) => c.id === p.categoria_id)?.nombre,
        gastado,
        porcentaje: Math.round((gastado * 100) / p.monto_limite),
        estado,
      };
    });
}

// Mismas reglas que GET /reportes/resumen: gasto fijo = membresías por mes (anual ÷ 12).
function resumen({ gastos, membresias }, mes) {
  const gasto_variable = sumaMes(gastos, mes);
  const gasto_fijo = calcularTotalMensual(membresias);
  return { mes, gasto_variable, gasto_fijo, total: redondear2(gasto_variable + gasto_fijo) };
}

// Mismas reglas que GET /reportes/por-categoria: de mayor a menor y porcentajes enteros que suman
// 100 (lo que falta o sobra se ajusta en la primera).
function porCategoria({ gastos, categorias }, mes) {
  const nombres = Object.fromEntries(categorias.map((c) => [c.id, c.nombre]));
  const filas = gastoPorCategoria(delMes(gastos, mes), nombres);
  const granTotal = filas.reduce((suma, f) => suma + f.total, 0);
  const resultado = filas.map((f) => ({
    categoria_id: Number(f.id),
    categoria: f.nombre,
    total: f.total,
    porcentaje: granTotal > 0 ? Math.round((f.total * 100) / granTotal) : 0,
  }));
  if (resultado.length > 0 && granTotal > 0) {
    resultado[0].porcentaje += 100 - resultado.reduce((suma, f) => suma + f.porcentaje, 0);
  }
  return resultado;
}

// Mismas reglas que GET /reportes/ingresos (backend/src/controllers/reportes.controller.js).
function reporteIngresos({ ingresos }, mes) {
  const mesAnterior = sumarMeses(mes, -1);
  const delMesActual = delMes(ingresos, mes);
  const porFuenteMap = new Map();
  for (const item of delMesActual) {
    const fuente = item.fuente?.trim() || 'Sin fuente';
    porFuenteMap.set(fuente, redondear2((porFuenteMap.get(fuente) || 0) + item.monto));
  }
  const filas = [...porFuenteMap.entries()]
    .map(([fuente, total]) => ({ fuente, total }))
    .sort((a, b) => b.total - a.total || a.fuente.localeCompare(b.fuente, 'es'));

  const granTotal = filas.reduce((suma, f) => suma + f.total, 0);
  const total = redondear2(granTotal);
  const exactos = filas.map((f) => (granTotal > 0 ? (f.total * 100) / granTotal : 0));
  const por_fuente = filas.map((f, i) => ({
    fuente: f.fuente,
    total: f.total,
    porcentaje: Math.floor(exactos[i]),
  }));
  if (por_fuente.length > 0 && granTotal > 0) {
    const sumaPorcentajes = por_fuente.reduce((acc, item) => acc + item.porcentaje, 0);
    const prioridades = exactos
      .map((p, indice) => ({ indice, resto: p - Math.floor(p) }))
      .sort((a, b) => b.resto - a.resto || a.indice - b.indice);
    for (const { indice } of prioridades.slice(0, 100 - sumaPorcentajes)) {
      por_fuente[indice].porcentaje += 1;
    }
  }

  const total_mes_anterior = sumaMes(ingresos, mesAnterior);
  const variacion = redondear2(total - total_mes_anterior);
  const variacion_porcentaje =
    total_mes_anterior > 0
      ? redondear2(((total - total_mes_anterior) * 100) / total_mes_anterior)
      : 0;

  return {
    mes,
    total,
    por_fuente,
    mes_anterior: mesAnterior,
    total_mes_anterior,
    variacion,
    variacion_porcentaje,
  };
}

// Mismas reglas que GET /reportes/balance: serie de 6 meses y totales del mes pedido.
function reporteBalance({ ingresos, gastos, membresias }, mes) {
  const gasto_fijo = calcularTotalMensual(membresias);
  const mesesSerie = [-5, -4, -3, -2, -1, 0].map((d) => sumarMeses(mes, d));
  const serie = mesesSerie.map((m) => {
    const ingresosMes = sumaMes(ingresos, m);
    const gasto_variable = sumaMes(gastos, m);
    const gastosMes = redondear2(gasto_variable + gasto_fijo);
    return {
      mes: m,
      ingresos: ingresosMes,
      gasto_variable,
      gasto_fijo,
      gastos: gastosMes,
      balance: redondear2(ingresosMes - gastosMes),
    };
  });
  const actual = serie[serie.length - 1];
  return {
    mes,
    ingresos: actual.ingresos,
    gasto_variable: actual.gasto_variable,
    gasto_fijo: actual.gasto_fijo,
    gastos: actual.gastos,
    balance: actual.balance,
    serie,
  };
}

// Fecha descendente y, en la misma fecha, id descendente (gastos e ingresos).
const ordenarPorFecha = (a, b) => (a.fecha === b.fecha ? b.id - a.id : a.fecha < b.fecha ? 1 : -1);

function leerQuery(query) {
  const params = {};
  for (const par of (query || '').split('&')) {
    if (!par) continue;
    const [clave, valor = ''] = par.split('=');
    params[decodeURIComponent(clave)] = decodeURIComponent(valor);
  }
  return params;
}

const rechazar = (code) => Promise.reject({ code, message: '', status: 0 });

// Responde una ruta de la API con los datos de ejemplo, como lo haría apiFetch: devuelve una
// promesa con el cuerpo de la respuesta o la rechaza con { code, message, status }.
export function responderEjemplo(ruta, { method = 'GET' } = {}, hoy = new Date()) {
  if (method !== 'GET') return rechazar(MODO_VISITANTE);

  const [camino, query] = ruta.split('?');
  const params = leerQuery(query);
  const datos = crearDatosEjemplo(hoy);

  switch (camino) {
    case '/categorias':
      return Promise.resolve(datos.categorias);
    case '/categorias/predefinidas':
      return Promise.resolve({
        categorias: datos.categorias.map((c) => ({
          ...c,
          propia: false,
          color: null,
          seleccionada: true,
        })),
      });
    case '/gastos': {
      const categoriaId = params.categoria_id ? Number(params.categoria_id) : null;
      const lista = (params.mes ? delMes(datos.gastos, params.mes) : datos.gastos)
        .filter((g) => categoriaId == null || g.categoria_id === categoriaId)
        .sort(ordenarPorFecha);
      return Promise.resolve(lista);
    }
    case '/ingresos':
      return Promise.resolve(
        (params.mes ? delMes(datos.ingresos, params.mes) : datos.ingresos).sort(ordenarPorFecha),
      );
    case '/presupuestos':
      return Promise.resolve(presupuestosConEstado(datos, params.mes));
    case '/membresias':
      return Promise.resolve(
        [...datos.membresias].sort((a, b) => a.dias_para_cobro - b.dias_para_cobro),
      );
    case '/catalogo':
      return Promise.resolve(datos.catalogo);
    case '/reportes/resumen':
      return Promise.resolve(resumen(datos, params.mes));
    case '/reportes/por-categoria':
      return Promise.resolve(porCategoria(datos, params.mes));
    case '/reportes/ingresos':
      return Promise.resolve(reporteIngresos(datos, params.mes));
    case '/reportes/balance':
      return Promise.resolve(reporteBalance(datos, params.mes));
    default:
      return rechazar('RUTA_NO_ENCONTRADA');
  }
}
