// Datos del widget «Billo» de Android (HU-58, RF13). Sin imports de React Native para poder
// probarlo con node --test. La app guarda el dato al cargar Inicio y el widget lo dibuja sin red.
import { colorCategoria } from '../theme/categorias.js';
import { formatearMontoCorto, MONEDA, partesMonto } from './formato.js';
import { saldoDelMes, totalIngresos } from './ingresos.js';
import { proximoCobro, textoProximoCobro } from './membresias.js';
import { gastoPorCategoria } from './resumenMes.js';

export const TEXTO_SIN_DATOS = 'Abre Billo para ver tu saldo';
export const OCULTO = '••••';
const TOP_CATEGORIAS = 3;
const esNumero = (n) => typeof n === 'number' && Number.isFinite(n);

// Lo mismo que muestra Inicio → dato que se guarda: { mes, saldo, ingresos, categorias, cobro }.
// - saldo e ingresos: TarjetaSaldo (saldoDelMes y totalIngresos; saldo null sin movimientos).
// - categorias: las 3 de más gasto del mes, con el color del punto en cada tema.
// - cobro: el próximo cobro de suscripción (proximoCobro) o null.
export function crearDatoWidget({ resumen, gastos, ingresos, membresias, categorias }, mes) {
  if (!/^\d{4}-\d{2}$/.test(mes ?? '')) return null;
  const nombres = Object.fromEntries((categorias || []).map((c) => [c.id, c.nombre]));
  const proximo = proximoCobro(membresias);
  return {
    mes,
    saldo: saldoDelMes(ingresos, resumen?.gasto_variable),
    ingresos: totalIngresos(ingresos),
    categorias: gastoPorCategoria(gastos, nombres)
      .filter((c) => c.nombre)
      .slice(0, TOP_CATEGORIAS)
      .map(({ nombre }) => ({
        nombre,
        claro: colorCategoria(nombre, false),
        oscuro: colorCategoria(nombre, true),
      })),
    cobro: proximo
      ? {
          nombre: proximo.membresia.nombre,
          dias: proximo.dias,
          monto: Number(proximo.membresia.costo),
        }
      : null,
  };
}

// Lee lo guardado (texto JSON) sin fallar con datos dañados o de una versión anterior.
export function leerDatoGuardado(texto) {
  if (!texto) return null;
  try {
    const dato = JSON.parse(texto);
    const valido =
      /^\d{4}-\d{2}$/.test(dato?.mes ?? '') &&
      (dato.saldo === null || esNumero(dato.saldo)) &&
      esNumero(dato.ingresos) &&
      Array.isArray(dato.categorias);
    return valido ? dato : null;
  } catch {
    return null;
  }
}

// Qué dibuja el widget, o null («Abre Billo para ver tu saldo») sin dato o si es de otro mes.
// Con `oculto` (ojito de Inicio, HU-82) el saldo es «••••» y no se muestran los ingresos.
//   { saldo: { entero, centavos } | null, ingresos: '+$X' | null, categorias, cobro: { texto, monto } | null }
export function vistaWidget(dato, mesActual, oculto) {
  if (!dato || dato.mes !== mesActual) return null;
  let saldo = null;
  if (oculto) {
    saldo = { entero: OCULTO, centavos: '' };
  } else if (esNumero(dato.saldo)) {
    const partes = partesMonto(Math.abs(dato.saldo));
    saldo = { ...partes, entero: dato.saldo < 0 ? `−${partes.entero}` : partes.entero };
  }
  return {
    saldo,
    ingresos: !oculto && dato.ingresos > 0 ? `+${formatearMontoCorto(dato.ingresos)}` : null,
    categorias: dato.categorias,
    cobro: dato.cobro
      ? {
          texto: `${dato.cobro.nombre} ${textoProximoCobro(dato.cobro.dias).toLowerCase()}`,
          monto: `${formatearMontoCorto(dato.cobro.monto)} ${MONEDA}`,
        }
      : null,
  };
}
