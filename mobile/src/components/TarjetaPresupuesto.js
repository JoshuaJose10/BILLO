import { StyleSheet, Text, View } from 'react-native';

import { radios } from '../theme/colors';
import { useEstilos } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { formatearMonto } from '../utils/formato';
import { avanceBarra, excedente } from '../utils/presupuestos';
import BarraPresupuesto from './BarraPresupuesto';
import IconoCategoria from './IconoCategoria';

// Cómo se lee el estado de la API en voz alta.
export const NOMBRE_ESTADO = {
  ok: 'dentro del límite',
  alerta: 'alerta',
  excedido: 'excedido',
};

// Presupuesto de una categoría en Cartera: ícono, nombre, "gastado / límite", porcentaje y barra
// coloreada por `estado`. En excedido, "Te pasaste por $X". Fondo opaco para FilaDeslizable.
export default function TarjetaPresupuesto({ presupuesto }) {
  const styles = useEstilos(crearEstilos);
  const { categoria, gastado, monto_limite: limite, porcentaje, estado } = presupuesto;
  const excedido = estado === 'excedido';

  return (
    <View style={styles.fila}>
      <IconoCategoria nombre={categoria} />
      <View style={styles.cuerpo}>
        <View style={styles.cabecera}>
          <Text style={styles.nombre} numberOfLines={1}>
            {categoria}
          </Text>
          <Text style={styles.porcentaje}>{porcentaje}%</Text>
        </View>
        <Text style={styles.montos} numberOfLines={1}>
          {formatearMonto(gastado)} / {formatearMonto(limite)}
        </Text>
        <BarraPresupuesto
          fraccion={avanceBarra(porcentaje)}
          porcentaje={porcentaje}
          estado={estado}
          etiqueta={`${categoria}: ${porcentaje}% del presupuesto, ${NOMBRE_ESTADO[estado]}`}
          style={styles.barra}
        />
        {excedido ? (
          <Text style={styles.excedido}>
            Te pasaste por {formatearMonto(excedente(presupuesto))}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // Como ItemGasto: p-2.5 rounded-2xl gap-3, fondo opaco
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 10,
      paddingRight: 14,
      borderRadius: radios['2xl'],
      backgroundColor: colors.filaOpaca,
    },
    cuerpo: {
      flex: 1,
    },
    cabecera: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 8,
    },
    // font-body-md font-medium tracking-tight
    nombre: {
      fontFamily: fonts.sansMedium,
      flexShrink: 1,
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: -0.35,
      color: colors.text,
    },
    porcentaje: {
      fontFamily: fonts.monoSemiBold,
      fontSize: 13,
      color: colors.text,
    },
    // font-label-caps mono, "gastado / límite"
    montos: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      lineHeight: 14,
      color: colors.textVariant,
      marginTop: 2,
    },
    barra: {
      marginTop: 8,
    },
    excedido: {
      fontFamily: fonts.sansMedium,
      fontSize: 12,
      lineHeight: 16,
      color: colors.alerta,
      marginTop: 6,
    },
  });
