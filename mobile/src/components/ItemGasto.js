import { StyleSheet, Text, View } from 'react-native';

import { radios } from '../theme/colors';
import { useEstilos } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { fechaRelativa, formatearMonto } from '../utils/formato';
import { iconoFuente } from '../utils/ingresos';
import IconoCategoria from './IconoCategoria';

// Movimiento de la lista (Stitch: Inicio, panel "Movimientos"): ícono de la categoría en color,
// título (nota o categoría), fecha relativa en mono y el monto con "-".
// El backend solo guarda la fecha, sin hora, así que el subtítulo no lleva hora.
// Con `metodoPago` (etiqueta, p. ej. "Efectivo") el subtítulo es "Categoría · Método", para
// listas donde la fecha ya va en el encabezado del día (Movimientos).
// `opaca`: fondo sólido (`filaOpaca`) en vez del translúcido, para FilaDeslizable: así las
// acciones que van detrás no se ven a través de la fila.
// Con `ingreso` en lugar de `gasto` (HU-82): ícono de la fuente en verde, título = descripción o
// fuente, subtítulo "Fuente · Ingreso" y el monto en verde con "+".
export default function ItemGasto({ gasto, ingreso, nombreCategoria, metodoPago, opaca = false }) {
  const styles = useEstilos(crearEstilos);
  if (ingreso) {
    const fuente = ingreso.fuente?.trim() || 'Ingreso';
    const descripcion = ingreso.descripcion?.trim();
    return (
      <View style={[styles.fila, opaca ? styles.filaOpaca : null]}>
        <IconoCategoria icono={iconoFuente(ingreso.fuente)} />
        <View style={styles.textos}>
          <Text style={styles.titulo} numberOfLines={1}>
            {descripcion || fuente}
          </Text>
          <Text style={styles.subtitulo} numberOfLines={1}>
            {descripcion ? `${fuente} · Ingreso` : 'Ingreso'}
          </Text>
        </View>
        <Text style={[styles.monto, styles.montoIngreso]}>+{formatearMonto(ingreso.monto)}</Text>
      </View>
    );
  }
  const categoria = nombreCategoria || 'Sin categoría';
  const nota = gasto.nota?.trim();
  const titulo = nota || categoria;
  const fecha = fechaRelativa(gasto.fecha);
  const subtitulo = metodoPago
    ? `${categoria} · ${metodoPago}`
    : nota
      ? `${categoria} · ${fecha}`
      : fecha;

  const tieneMonedaExtranjera = gasto.moneda && gasto.moneda !== 'MXN';
  const textoMonedaOriginal = tieneMonedaExtranjera
    ? `${gasto.monto_original != null ? gasto.monto_original : ''} ${gasto.moneda}`.trim()
    : null;

  return (
    <View style={[styles.fila, opaca ? styles.filaOpaca : null]}>
      <IconoCategoria nombre={nombreCategoria} />
      <View style={styles.textos}>
        <Text style={styles.titulo} numberOfLines={1}>
          {titulo}
        </Text>
        <Text style={styles.subtitulo} numberOfLines={1}>
          {subtitulo}
        </Text>
      </View>
      <View style={styles.columnaMonto}>
        <Text style={styles.monto}>-{formatearMonto(gasto.monto)}</Text>
        {tieneMonedaExtranjera ? (
          <Text style={styles.monedaOriginal} numberOfLines={1}>
            {textoMonedaOriginal}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // flex items-center justify-between p-2.5 rounded-2xl bg-surface-container-low/50; gap-3
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 10,
      borderRadius: radios['2xl'],
      backgroundColor: colors.surfaceLow50,
    },
    filaOpaca: {
      backgroundColor: colors.filaOpaca,
    },
    textos: {
      flex: 1,
    },
    // font-body-md text-body-md text-primary font-medium tracking-tight
    titulo: {
      fontFamily: fonts.sansMedium,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: -0.35,
      color: colors.text,
    },
    // font-label-caps text-[10px] text-on-surface-variant
    subtitulo: {
      fontFamily: fonts.monoMedium,
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 0.8,
      color: colors.textVariant,
    },
    columnaMonto: {
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    // font-financial-metric-md text-body-lg text-secondary-fixed font-semibold
    monto: {
      fontFamily: fonts.monoSemiBold,
      fontSize: 16,
      letterSpacing: -0.16,
      color: colors.amount,
    },
    montoIngreso: {
      color: colors.exitoTexto,
    },
    monedaOriginal: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      lineHeight: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
