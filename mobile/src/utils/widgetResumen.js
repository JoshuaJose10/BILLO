// Datos del widget de Android (HU-58, RF13). Sin imports de React Native para poder probarlo con
// node --test. La app guarda { mes, total } (GET /reportes/resumen) y el widget lo dibuja.

// No importa utils/formato.js: ese archivo importa './fechas' sin extensión y no carga en node --test.
const MESES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
];
const formatoMoneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export const TEXTO_SIN_DATOS = 'Abre Billo';

// GET /reportes/resumen → dato que se guarda para el widget.
export function crearDatoWidget(resumen, mes) {
  const total = Number(resumen?.total);
  const mesDato = resumen?.mes ?? mes;
  if (!Number.isFinite(total) || !/^\d{4}-\d{2}$/.test(mesDato ?? '')) return null;
  return { mes: mesDato, total };
}

// Lee lo guardado (texto JSON) sin fallar con datos dañados.
export function leerDatoGuardado(texto) {
  if (!texto) return null;
  try {
    const dato = JSON.parse(texto);
    return crearDatoWidget(dato, dato?.mes);
  } catch {
    return null;
  }
}

// Qué dibuja el widget: { titulo, monto } o { titulo, monto: null } («Abre Billo») cuando no hay
// dato, o si es de otro mes (por ejemplo tras cambiar de mes sin abrir la app).
export function textoWidget(dato, mesActual) {
  if (!dato || dato.mes !== mesActual) return { titulo: 'BILLO', monto: null };
  return {
    titulo: `BILLO · ${MESES[Number(dato.mes.slice(5, 7)) - 1]}`,
    monto: formatoMoneda.format(dato.total),
  };
}
