import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { espacios, radios } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { useEstilos, useTema } from '../theme/TemaContext';
import { tipografia } from '../theme/tipografia';
import { formatearMonto, formatearMontoCorto, MONEDA } from '../utils/formato';
import { estiloServicio, inicialServicio } from '../utils/membresias';
import { colorTarjeta } from '../utils/tarjetas';

const MAX_AVATARES = 3;

// Fila resumen bajo la cara de la tarjeta en Cartera → Tarjetas (HU-89, Stitch
// 14_cartera_tarjetas_*): avatares de las suscripciones vinculadas (o el squircle de la tarjeta si
// no hay), nombre, «N suscripciones · $X gastado» del mes y el total de suscripciones al mes.
// `suscripciones` sale de suscripcionesDeTarjeta (utils/tarjetas.js).
export default function ItemTarjeta({ tarjeta, suscripciones, opaca = false }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);

  const colorMarca = colorTarjeta(tarjeta);
  const icono = tarjeta?.tipo === 'credito' ? 'credit-card-chip-outline' : 'credit-card-outline';
  const vinculadas = suscripciones?.vinculadas ?? [];
  const gastado = `${formatearMontoCorto(Number(tarjeta?.total_mes) || 0)} gastado`;

  return (
    <View style={[styles.tarjeta, opaca ? styles.tarjetaOpaca : null]}>
      {vinculadas.length > 0 ? (
        <View style={styles.avatares}>
          {vinculadas.slice(0, MAX_AVATARES).map((m, i) => {
            const { color, icono: iconoServicio, predefinido } = estiloServicio(m.nombre);
            return (
              <View
                key={m.id}
                style={[styles.avatar, i > 0 && styles.avatarEncimado, { backgroundColor: color }]}
              >
                {predefinido ? (
                  <MaterialCommunityIcons
                    name={iconoServicio}
                    size={14}
                    color={colors.textoSobreColor}
                  />
                ) : (
                  <Text style={styles.inicial}>{inicialServicio(m.nombre)}</Text>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={[styles.squircle, { backgroundColor: colorMarca, shadowColor: colorMarca }]}>
          <MaterialCommunityIcons name={icono} size={22} color={colors.textoSobreColor} />
        </View>
      )}
      <View style={styles.textos}>
        <Text style={styles.nombre} numberOfLines={1}>
          {tarjeta?.nombre}
        </Text>
        <Text style={styles.subtitulo} numberOfLines={1}>
          {[suscripciones?.texto, gastado].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {vinculadas.length > 0 ? (
        <View style={styles.columnaMonto}>
          <Text style={styles.monto} numberOfLines={1}>
            {formatearMonto(suscripciones.totalMensual)}
          </Text>
          <Text style={styles.etiquetaMes}>{MONEDA} / mes</Text>
        </View>
      ) : null}
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    tarjeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacios.sm + 4,
      borderRadius: radios['2xl'],
      padding: espacios.md,
      backgroundColor: colors.surfaceLow,
      borderWidth: 1,
      borderColor: colors.border,
      borderTopColor: colors.borderTop,
    },
    tarjetaOpaca: {
      backgroundColor: colors.card,
    },
    squircle: {
      width: 42,
      height: 42,
      borderRadius: radios.xl,
      alignItems: 'center',
      justifyContent: 'center',
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      shadowOpacity: 0.35,
      elevation: 4,
    },
    // Avatares encimados (-space-x-1.5 de Stitch) con borde del color de la fila
    avatares: {
      flexDirection: 'row',
    },
    avatar: {
      width: 30,
      height: 30,
      borderRadius: radios.full,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.card,
    },
    avatarEncimado: {
      marginLeft: -8,
    },
    inicial: {
      fontFamily: fonts.sansBold,
      fontSize: 11,
      color: colors.textoSobreColor,
    },
    textos: {
      flex: 1,
      gap: 2,
    },
    nombre: {
      ...tipografia.bodyLg,
      fontFamily: fonts.sansSemiBold,
      color: colors.text,
    },
    subtitulo: {
      ...tipografia.bodySm,
      color: colors.textSecondary,
    },
    columnaMonto: {
      alignItems: 'flex-end',
      flexShrink: 0,
    },
    monto: {
      ...tipografia.financialMetricMd,
      color: colors.text,
    },
    etiquetaMes: {
      ...tipografia.bodySm,
      fontFamily: fonts.mono,
      fontSize: 11,
      color: colors.textSecondary,
    },
  });
