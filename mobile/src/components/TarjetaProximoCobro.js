import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { tipografia } from '../theme/tipografia';
import { formatearMontoCorto, MONEDA } from '../utils/formato';
import {
  estiloServicio,
  inicialServicio,
  nivelCobro,
  textoProximoCobro,
} from '../utils/membresias';

// Tarjeta "Próximo cobro" de Inicio (Stitch 07_inicio_*_fondo_1), debajo de "Gastado este mes":
// logo con el color de marca, "PRÓXIMO COBRO • en N días" (en aviso si faltan 3 o menos), nombre
// y "$X MXN / mes" (o "/ año"). `cobro` sale de proximoCobro ({ membresia, dias, mas }); con
// varias el mismo día muestra la primera y "+N más". Sin cobro no se dibuja. Al tocarla abre
// Cartera › Suscripciones (onPress).
export default function TarjetaProximoCobro({ cobro, onPress }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  if (!cobro) return null;

  const { membresia, dias, mas } = cobro;
  const { color: colorMarca, icono, predefinido } = estiloServicio(membresia.nombre);
  const aviso = nivelCobro(dias) === 'aviso';
  const periodo = membresia.frecuencia === 'anual' ? 'año' : 'mes';
  const cuando = textoProximoCobro(dias);
  const monto = formatearMontoCorto(membresia.costo);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Próximo cobro ${cuando.toLowerCase()}: ${membresia.nombre}, ${monto} ${MONEDA} al ${periodo}${
        mas > 0 ? `, y ${mas} más el mismo día` : ''
      }`}
      accessibilityHint="Abre tus suscripciones en Cartera"
      style={({ pressed }) => [styles.tarjeta, pressed ? styles.presionada : null]}
    >
      <View style={[styles.squircle, { backgroundColor: colorMarca, shadowColor: colorMarca }]}>
        {predefinido ? (
          <MaterialCommunityIcons name={icono} size={20} color={colors.textoSobreColor} />
        ) : (
          <Text style={styles.inicial}>{inicialServicio(membresia.nombre)}</Text>
        )}
      </View>

      <View style={styles.textos}>
        <View style={styles.etiquetaFila}>
          <Text style={styles.etiqueta}>PRÓXIMO COBRO</Text>
          <View style={styles.punto} />
          <Text style={[styles.cuando, aviso ? styles.cuandoAviso : null]}>{cuando}</Text>
        </View>
        <View style={styles.nombreFila}>
          <Text style={styles.nombre} numberOfLines={1}>
            {membresia.nombre}
          </Text>
          {mas > 0 ? <Text style={styles.mas}>+{mas} más</Text> : null}
        </View>
      </View>

      <View style={styles.montoColumna}>
        <Text style={styles.monto} numberOfLines={1}>
          {monto}
        </Text>
        <Text style={styles.sufijo}>
          {MONEDA} / {periodo}
        </Text>
      </View>
    </Pressable>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // Misma tarjeta de vidrio que "Gastado este mes" (TarjetaResumen); gap-3.5 entre ambas
    tarjeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 14,
      padding: 14,
      borderRadius: radios.tarjeta,
      borderTopWidth: 1,
      borderTopColor: colors.borderTop,
      backgroundColor: colors.surfaceLow70,
      shadowColor: colors.sombra,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 14,
      shadowOpacity: 0.35,
      elevation: 6,
    },
    presionada: {
      opacity: 0.7,
    },
    // w-10 h-10 rounded-xl con el color de marca
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
      minWidth: 0,
    },
    etiquetaFila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    etiqueta: {
      ...tipografia.labelCaps,
      fontSize: 10,
      color: colors.textSecondary,
    },
    punto: {
      width: 4,
      height: 4,
      borderRadius: radios.full,
      backgroundColor: colors.textSecondary,
    },
    cuando: {
      ...tipografia.labelCaps,
      fontSize: 10,
      textTransform: 'none',
      letterSpacing: 0,
      color: colors.textSecondary,
    },
    cuandoAviso: {
      fontFamily: fonts.monoSemiBold,
      color: colors.avisoTexto,
    },
    nombreFila: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
    },
    nombre: {
      ...tipografia.headlineSm,
      flexShrink: 1,
      color: colors.text,
    },
    mas: {
      ...tipografia.bodySm,
      color: colors.textSecondary,
    },
    montoColumna: {
      alignItems: 'flex-end',
      flexShrink: 0,
    },
    monto: {
      ...tipografia.financialMetricMd,
      color: colors.text,
    },
    sufijo: {
      ...tipografia.labelCaps,
      fontSize: 9,
      textTransform: 'none',
      letterSpacing: 0,
      color: colors.textSecondary,
    },
  });
