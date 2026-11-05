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

// Texto de la pastilla de estado.
const PASTILLA = {
  ok: 'En meta',
  alerta: 'Cerca del límite',
  excedido: 'Excedido',
};

// Presupuesto de una categoría en Cartera: ícono, nombre, pastilla de estado, porcentaje,
// "gastado / límite" y barra (color de la categoría en meta, aviso o alerta según el `estado` de
// la API). En excedido, "Te pasaste por $X". Fondo opaco para FilaDeslizable.
// `compacta` (Inicio, "Presupuestos en riesgo"): sin la línea "gastado / límite" ni "Te pasaste",
// con menos relleno; el estado y el porcentaje siguen en la pastilla y la barra.
export default function TarjetaPresupuesto({ presupuesto, compacta = false }) {
  const styles = useEstilos(crearEstilos);
  const { categoria, gastado, monto_limite: limite, porcentaje, estado } = presupuesto;
  const excedido = estado === 'excedido';

  return (
    <View style={[styles.fila, compacta ? styles.filaCompacta : null]}>
      <IconoCategoria nombre={categoria} />
      <View style={styles.cuerpo}>
        <View style={styles.cabecera}>
          <Text style={styles.nombre} numberOfLines={1}>
            {categoria}
          </Text>
          <View style={styles.estado}>
            <View style={[styles.pastilla, styles[`pastilla_${estado}`]]}>
              <Text style={[styles.pastillaTexto, styles[`pastillaTexto_${estado}`]]}>
                {PASTILLA[estado]}
              </Text>
            </View>
            <Text style={styles.porcentaje}>{porcentaje}%</Text>
          </View>
        </View>
        {compacta ? null : (
          <Text style={styles.montos} numberOfLines={1}>
            {formatearMonto(gastado)} / {formatearMonto(limite)}
          </Text>
        )}
        <BarraPresupuesto
          fraccion={avanceBarra(porcentaje)}
          porcentaje={porcentaje}
          estado={estado}
          categoria={categoria}
          etiqueta={`${categoria}: ${porcentaje}% del presupuesto, ${NOMBRE_ESTADO[estado]}`}
          style={compacta ? styles.barraCompacta : styles.barra}
        />
        {excedido && !compacta ? (
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
    filaCompacta: {
      paddingVertical: 8,
    },
    cuerpo: {
      flex: 1,
    },
    cabecera: {
      flexDirection: 'row',
      alignItems: 'center',
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
    // Pastilla y porcentaje a la derecha del nombre
    estado: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    // px-2 py-0.5 rounded-full: fondo suave del estado y texto en su tono (>= 4.5:1)
    pastilla: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: radios.full,
    },
    pastilla_ok: {
      backgroundColor: colors.exitoSuave,
    },
    pastilla_alerta: {
      backgroundColor: colors.avisoSuave,
    },
    pastilla_excedido: {
      backgroundColor: colors.alertaSuave,
    },
    pastillaTexto: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 10,
      lineHeight: 14,
    },
    pastillaTexto_ok: {
      color: colors.exitoTexto,
    },
    pastillaTexto_alerta: {
      color: colors.avisoTexto,
    },
    pastillaTexto_excedido: {
      color: colors.alertaTexto,
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
    barraCompacta: {
      marginTop: 6,
    },
    excedido: {
      fontFamily: fonts.sansMedium,
      fontSize: 12,
      lineHeight: 16,
      color: colors.alerta,
      marginTop: 6,
    },
  });
