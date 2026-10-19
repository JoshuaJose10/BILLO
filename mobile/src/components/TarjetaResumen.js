import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radios } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { iconoCategoria } from '../utils/categorias';
import { formatearMonto, formatearMontoCorto } from '../utils/formato';

// Tarjeta de vidrio "Gastado este mes" (Stitch: Inicio, "Glass Card: Gasto Mensual"):
// texto a la izquierda y total a la derecha; debajo, chips con las categorías de mayor
// gasto (`principales` = [{ id, nombre, total }]). Sin meta ni barra de progreso.
export default function TarjetaResumen({ total, principales = [] }) {
  return (
    <View style={styles.tarjeta}>
      <View style={styles.fila}>
        <Text style={styles.texto}>Gastado este mes</Text>
        <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
          {formatearMonto(total)}
        </Text>
      </View>

      {principales.length > 0 ? (
        <View style={styles.chips}>
          {principales.map((c) => (
            <View
              key={c.id}
              style={styles.chip}
              accessibilityLabel={`${c.nombre}: ${formatearMontoCorto(c.total)}`}
            >
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

const styles = StyleSheet.create({
  // rounded-[22px] bg-surface-container-low/70 p-3.5 shadow-[0_8px_28px_rgba(0,0,0,0.35)]
  // El brillo superior del diseño es el borde de arriba, en todo el ancho y con el radio.
  tarjeta: {
    padding: 14,
    borderRadius: radios.tarjeta,
    borderTopWidth: 1,
    borderTopColor: colors.borderTop,
    backgroundColor: 'rgba(27, 27, 27, 0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    shadowOpacity: 0.35,
    elevation: 6,
  },
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
  // font-financial-metric-md text-[15px] text-primary font-semibold
  total: {
    fontFamily: fonts.monoSemiBold,
    flexShrink: 1,
    fontSize: 15,
    letterSpacing: -0.15,
    color: colors.text,
  },
  // Solo espacio entre el total y los chips (sin línea divisoria).
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  // px-2.5 py-1 rounded-full bg-[#1c1c1e] border border-white/10 gap-1.5
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radios.full,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  // font-financial-metric-md text-[12px] text-primary font-medium
  chipMonto: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    color: colors.text,
  },
});
