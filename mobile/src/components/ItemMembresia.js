import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { espacios, radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { tipografia } from '../theme/tipografia';
import { formatearCostoMembresia } from '../utils/divisas';
import { estiloServicio, inicialServicio, nivelCobro, textoCobro } from '../utils/membresias';

// Tarjeta de una membresía / suscripción en Cartera (HU-05; diseño HU-81, Stitch
// 13_cartera_subs_oscuro_brillo / _claro_brillo): logo en squircle del color de marca (o la
// inicial si el servicio no tiene ícono propio), nombre, plan, precio "/ mes" en mono y la pastilla
// "Cobra en N días (D mmm)" con un punto: verde si faltan más de 3 días, ámbar si 3 o menos.
// `opaca`: fondo sólido para permitir swipe con FilaDeslizable sin transparencia.
export default function ItemMembresia({ membresia, opaca = false }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);

  const { nombre, costo, frecuencia, fecha_cobro, dias_para_cobro, moneda, monto_original } =
    membresia;
  const { color: colorMarca, icono, predefinido } = estiloServicio(nombre);
  const nivel = nivelCobro(dias_para_cobro);
  const colorPunto =
    nivel === 'aviso' ? colors.aviso : nivel === 'exito' ? colors.exito : colors.outline;
  const anual = frecuencia === 'anual';

  return (
    <View style={[styles.tarjeta, opaca ? styles.tarjetaOpaca : null]}>
      <View style={styles.filaSuperior}>
        <View style={[styles.squircle, { backgroundColor: colorMarca, shadowColor: colorMarca }]}>
          {predefinido ? (
            <MaterialCommunityIcons name={icono} size={22} color={colors.textoSobreColor} />
          ) : (
            <Text style={styles.inicial}>{inicialServicio(nombre)}</Text>
          )}
        </View>
        <View style={styles.textos}>
          <Text style={styles.nombre} numberOfLines={1}>
            {nombre}
          </Text>
          <Text style={styles.plan} numberOfLines={1}>
            {anual ? 'Plan anual' : 'Plan mensual'}
          </Text>
        </View>
        <Text style={styles.montoContenedor} numberOfLines={1}>
          <Text style={styles.monto}>{formatearCostoMembresia(costo, moneda, monto_original)}</Text>
          <Text style={styles.sufijo}>{anual ? ' / año' : ' / mes'}</Text>
        </Text>
      </View>

      <View style={styles.filaInferior}>
        <View style={[styles.pildora, nivel === 'aviso' ? styles.pildoraAviso : null]}>
          <View style={[styles.punto, { backgroundColor: colorPunto }]} />
          <Text
            style={[styles.textoCobro, nivel === 'aviso' ? styles.textoCobroAviso : null]}
            numberOfLines={1}
          >
            {textoCobro(dias_para_cobro, fecha_cobro)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // rounded-2xl p-4 con borde sutil y brillo superior, como las tarjetas de Inicio
    tarjeta: {
      borderRadius: radios['2xl'],
      padding: espacios.md,
      backgroundColor: colors.surfaceLow,
      borderWidth: 1,
      borderColor: colors.border,
      borderTopColor: colors.borderTop,
      gap: espacios.sm + 4,
    },
    tarjetaOpaca: {
      backgroundColor: colors.card,
    },
    filaSuperior: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacios.sm + 4,
    },
    squircle: {
      width: 40,
      height: 40,
      borderRadius: radios.xl,
      alignItems: 'center',
      justifyContent: 'center',
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      shadowOpacity: 0.35,
      elevation: 4,
    },
    inicial: {
      ...tipografia.headlineSm,
      color: colors.textoSobreColor,
    },
    textos: {
      flex: 1,
    },
    nombre: {
      ...tipografia.bodyLg,
      fontFamily: fonts.sansSemiBold,
      color: colors.text,
    },
    plan: {
      ...tipografia.bodySm,
      color: colors.textSecondary,
    },
    montoContenedor: {
      flexShrink: 0,
    },
    monto: {
      ...tipografia.financialMetricMd,
      color: colors.text,
    },
    sufijo: {
      ...tipografia.bodySm,
      color: colors.textSecondary,
    },
    // Separador fino y la pastilla de cobro a la izquierda
    filaInferior: {
      flexDirection: 'row',
      paddingTop: espacios.sm + 4,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    pildora: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: espacios.xs,
      borderRadius: radios.full,
      backgroundColor: colors.glass05,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    pildoraAviso: {
      backgroundColor: colors.avisoSuave,
    },
    punto: {
      width: 6,
      height: 6,
      borderRadius: radios.full,
    },
    // label-caps sin mayúsculas ni tracking: "Cobra en 9 días (17 oct)"
    textoCobro: {
      ...tipografia.labelCaps,
      textTransform: 'none',
      letterSpacing: 0,
      color: colors.textSecondary,
    },
    textoCobroAviso: {
      fontFamily: fonts.monoSemiBold,
      color: colors.text,
    },
  });
