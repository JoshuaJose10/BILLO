import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colorCategoria } from '../theme/categorias';
import { estiloTarjeta, radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { iconoCategoria } from '../utils/categorias';
import { formatearMonto, formatearMontoCorto } from '../utils/formato';
import { etiquetaBarraMes, nivelPorcentaje } from '../utils/resumenMes';
import BarraCategorias from './BarraCategorias';

// Tarjeta de vidrio "Gastado este mes" (Stitch: Inicio, "Glass Card: Gasto Mensual"):
// "$gastado / $presupuesto", la barra dividida por categoría con el porcentaje del presupuesto y
// los chips de las categorías de mayor gasto (`principales` = [{ id, nombre, total }]), que sirven
// de leyenda de la barra.
// - `resumen`: de resumenGastoMes ({ gastado, presupuesto, porcentaje, excedente, tramos }).
//   Sin presupuesto solo se muestra "$gastado" y la barra reparte el 100% entre categorías.
// - `conPresupuestos`: false si no se pudieron cargar los presupuestos; entonces no se dibuja la
//   barra ni se ofrece "Define un presupuesto" (Inicio no muestra error por eso).
// - `gastoFijo` y `total` (GET /reportes/resumen): con gastoFijo > 0, debajo del monto aparece
//   "Suscripciones $X · Total $Y".
// - `onDefinirPresupuesto`: abre Cartera.
export default function TarjetaResumen({
  resumen,
  principales = [],
  conPresupuestos = true,
  gastoFijo = 0,
  total,
  onDefinirPresupuesto,
}) {
  const { colors, esOscuro } = useTema();
  const styles = useEstilos(crearEstilos);
  const { gastado, presupuesto, porcentaje, excedente, tramos } = resumen;
  const conLimite = presupuesto > 0;
  const nivel = conLimite ? nivelPorcentaje(porcentaje) : null;
  const colorPorcentaje =
    nivel === 'alerta'
      ? colors.alertaTexto
      : nivel === 'aviso'
        ? colors.avisoTexto
        : colors.textSecondary;
  const mostrarBarra = conPresupuestos && (conLimite || gastado > 0);

  return (
    <View style={styles.tarjeta}>
      <View style={styles.fila}>
        <Text style={styles.texto}>Gastado este mes</Text>
        <Text style={styles.montos} numberOfLines={1} adjustsFontSizeToFit>
          <Text style={styles.total}>{formatearMonto(gastado)}</Text>
          {conLimite ? (
            <Text style={styles.limite}> / {formatearMontoCorto(presupuesto)}</Text>
          ) : null}
        </Text>
      </View>

      {gastoFijo > 0 ? (
        <Text style={styles.fijos} numberOfLines={1}>
          Suscripciones {formatearMonto(gastoFijo)} · Total {formatearMonto(total ?? gastado)}
        </Text>
      ) : null}

      {mostrarBarra ? (
        <View style={styles.filaBarra}>
          <View style={styles.barra}>
            <BarraCategorias
              tramos={tramos}
              porcentaje={porcentaje}
              etiqueta={etiquetaBarraMes(resumen)}
            />
          </View>
          {conLimite ? (
            <Text style={[styles.porcentaje, { color: colorPorcentaje }]}>{porcentaje}%</Text>
          ) : null}
        </View>
      ) : null}

      {excedente > 0 ? (
        <Text style={styles.excedido}>Te pasaste por {formatearMonto(excedente)}</Text>
      ) : null}

      {!conLimite && conPresupuestos && onDefinirPresupuesto ? (
        <Pressable
          onPress={onDefinirPresupuesto}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityHint="Abre Cartera"
          style={styles.enlace}
        >
          {({ pressed }) => (
            <Text style={[styles.enlaceTexto, pressed ? styles.enlacePresionado : null]}>
              Define un presupuesto
            </Text>
          )}
        </Pressable>
      ) : null}

      {principales.length > 0 ? (
        <View style={styles.chips}>
          {principales.map((c) => (
            <View
              key={c.id}
              style={styles.chip}
              accessibilityLabel={`${c.nombre}: ${formatearMontoCorto(c.total)}`}
            >
              <View
                style={[styles.punto, { backgroundColor: colorCategoria(c.nombre, esOscuro) }]}
              />
              <MaterialCommunityIcons
                name={iconoCategoria(c.nombre)}
                size={14}
                color={colors.text}
              />
              <Text style={styles.chipMonto}>{formatearMontoCorto(c.total)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    tarjeta: estiloTarjeta(colors),
    // flex items-center justify-between
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    // font-body-md text-body-md text-on-surface font-medium
    texto: {
      fontFamily: fonts.sansMedium,
      fontSize: 14,
      lineHeight: 20,
      color: colors.onSurface,
    },
    montos: {
      flexShrink: 1,
    },
    // font-financial-metric-md text-[15px] text-primary font-semibold
    total: {
      fontFamily: fonts.monoSemiBold,
      fontSize: 15,
      letterSpacing: -0.15,
      color: colors.text,
    },
    // "/ $5,000": font-label-caps text-[11px] text-secondary (Stitch)
    limite: {
      fontFamily: fonts.monoMedium,
      fontSize: 12,
      color: colors.textSecondary,
    },
    // Línea discreta de gasto fijo y total, alineada a la derecha bajo el monto
    fijos: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textSecondary,
      textAlign: 'right',
      marginTop: 2,
    },
    // flex items-center gap-2 mb-2.5
    filaBarra: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 12,
    },
    barra: {
      flex: 1,
    },
    // font-label-caps text-[10px]
    porcentaje: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      minWidth: 30,
      textAlign: 'right',
    },
    excedido: {
      fontFamily: fonts.sansMedium,
      fontSize: 12,
      lineHeight: 16,
      color: colors.alertaTexto,
      marginTop: 6,
    },
    enlace: {
      alignSelf: 'flex-start',
      marginTop: 10,
    },
    enlaceTexto: {
      fontFamily: fonts.sansMedium,
      fontSize: 13,
      lineHeight: 18,
      color: colors.acentoTexto,
    },
    enlacePresionado: {
      opacity: 0.6,
    },
    // Solo espacio entre el total y los chips (sin línea divisoria).
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 14,
    },
    // px-2.5 py-1 rounded-full bg-surfaceChip border border-white/10 gap-1.5
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radios.full,
      backgroundColor: colors.surfaceChip,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    // Micro-punto w-1.5 h-1.5 rounded-full del color de la categoría (Stitch 07_inicio_oscuro)
    punto: {
      width: 6,
      height: 6,
      borderRadius: radios.full,
    },
    // font-financial-metric-md text-[12px] text-primary font-medium
    chipMonto: {
      fontFamily: fonts.monoMedium,
      fontSize: 12,
      color: colors.text,
    },
  });
