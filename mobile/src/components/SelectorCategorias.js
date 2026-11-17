import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { estiloTarjeta, radios } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { useEstilos, useTema } from '../theme/TemaContext';
import { tipografia } from '../theme/tipografia';
import { calcularCambioSeleccionPredefinida } from '../utils/categorias';
import Boton from './Boton';
import Etiqueta from './Etiqueta';
import HojaNombreCategoria from './HojaNombreCategoria';
import IconoCategoria from './IconoCategoria';

// Categorías de gasto del usuario (HU-89 / HU-90): predefinidas con interruptor y propias con
// «Agregar categoría». Lo usan Mis categorías y Elige tus categorías; cada pantalla decide cuándo
// guardar.
// Cada sección es una tarjeta (estiloTarjeta) con filas separadas por un hairline: ícono con el
// color de theme/categorias.js (las propias, el del servidor ya registrado), nombre y subtítulo.
// - predefinidas: [{ id, nombre, seleccionada }]. Al tocar un interruptor llama a
//   onCambioSeleccion(cambio, listaNueva, categoria) (cambio de calcularCambioSeleccionPredefinida). Si no se
//   permite (mínimo una activa), avisa con onAviso y una alerta.
// - ocupadoId: id de la predefinida que se está guardando (spinner; interruptores deshabilitados).
// - propias: [{ id, nombre, color? }]. accionesPropia(cat, { renombrar }) → botones de la fila:
//   [{ icono, etiqueta, onPress, peligro?, cargando?, disabled? }].
// - onGuardarPropia(nombre, editando): async, desde la hoja (editando: null al crear). Si lanza,
//   la hoja muestra el error.
// - aviso: { tipo: 'info' | 'error', texto } en un banner arriba. bloqueado: sin «Agregar».
export default function SelectorCategorias({
  predefinidas,
  ocupadoId = null,
  onCambioSeleccion,
  onAviso,
  propias,
  accionesPropia,
  onGuardarPropia,
  aviso,
  bloqueado = false,
}) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const [hoja, setHoja] = useState(null); // null = cerrada, { editando } = abierta

  const alternar = (categoria) => {
    if (ocupadoId != null) return;
    const cambio = calcularCambioSeleccionPredefinida(predefinidas, categoria.id);
    if (!cambio.permitido) {
      if (cambio.error) {
        onAviso?.({ tipo: 'error', texto: cambio.error });
        Alert.alert('Aviso', cambio.error);
      }
      return;
    }
    onCambioSeleccion(
      cambio,
      predefinidas.map((c) => (c === categoria ? { ...c, seleccionada: cambio.encendida } : c)),
      categoria,
    );
  };

  const renombrar = (categoria) => setHoja({ editando: categoria });
  const activas = predefinidas.filter((c) => c.seleccionada).length;

  const fila = (cat, idx, subtitulo, control) => (
    <View key={String(cat.id)} style={[styles.fila, idx > 0 && styles.filaSeparada]}>
      <IconoCategoria nombre={cat.nombre} />
      <View style={styles.filaTextos}>
        <Text style={styles.nombre} numberOfLines={1}>
          {cat.nombre}
        </Text>
        <Text style={styles.subtitulo}>{subtitulo}</Text>
      </View>
      {control}
    </View>
  );

  return (
    <View style={styles.contenedor}>
      {aviso ? (
        <View
          style={[styles.banner, aviso.tipo === 'error' && styles.bannerError]}
          accessibilityLiveRegion="polite"
        >
          <MaterialCommunityIcons
            name={aviso.tipo === 'error' ? 'alert-circle-outline' : 'information-outline'}
            size={18}
            color={aviso.tipo === 'error' ? colors.alertaTexto : colors.textSecondary}
          />
          <Text style={[styles.bannerTexto, aviso.tipo === 'error' && styles.bannerTextoError]}>
            {aviso.texto}
          </Text>
        </View>
      ) : null}

      <View style={styles.seccion}>
        <View style={styles.encabezado}>
          <Etiqueta>Tus categorías</Etiqueta>
          <Text style={styles.subtitulo}>
            {activas} de {predefinidas.length} activas
          </Text>
        </View>
        <View style={styles.tarjeta}>
          {predefinidas.map((cat, idx) =>
            fila(
              cat,
              idx,
              cat.seleccionada ? 'Activa' : 'Inactiva',
              <>
                {String(ocupadoId) === String(cat.id) ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : null}
                <Switch
                  value={Boolean(cat.seleccionada)}
                  onValueChange={() => alternar(cat)}
                  disabled={ocupadoId != null}
                  trackColor={{ false: colors.surfaceHighest, true: colors.acento }}
                  thumbColor={colors.textoSobreColor}
                  ios_backgroundColor={colors.surfaceHighest}
                  accessibilityLabel={`Categoría ${cat.nombre}`}
                />
              </>,
            ),
          )}
        </View>
      </View>

      <View style={styles.seccion}>
        <View style={styles.encabezado}>
          <Etiqueta>Personalizadas</Etiqueta>
        </View>
        {propias.length === 0 ? (
          <View style={[styles.tarjeta, styles.vacio]}>
            <Text style={styles.subtitulo}>Aún no has creado categorías propias.</Text>
          </View>
        ) : (
          <View style={styles.tarjeta}>
            {propias.map((cat, idx) =>
              fila(
                cat,
                idx,
                'Personalizada',
                <View style={styles.acciones}>
                  {(accionesPropia?.(cat, { renombrar }) || []).map((accion) => (
                    <Pressable
                      key={accion.icono}
                      onPress={accion.onPress}
                      disabled={accion.disabled || accion.cargando}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={accion.etiqueta}
                      style={({ pressed }) => [
                        styles.botonIcono,
                        accion.peligro && styles.botonIconoPeligro,
                        pressed && styles.presionado,
                      ]}
                    >
                      {accion.cargando ? (
                        <ActivityIndicator size="small" color={colors.alertaTexto} />
                      ) : (
                        <MaterialCommunityIcons
                          name={accion.icono}
                          size={18}
                          color={accion.peligro ? colors.alertaTexto : colors.text}
                        />
                      )}
                    </Pressable>
                  ))}
                </View>,
              ),
            )}
          </View>
        )}
        <Boton
          titulo="Agregar categoría"
          secundario
          onPress={() => setHoja({ editando: null })}
          disabled={bloqueado}
        />
      </View>

      {hoja ? (
        <HojaNombreCategoria
          editando={hoja.editando}
          existentes={[...predefinidas, ...propias]}
          onGuardar={(nombre) => onGuardarPropia(nombre, hoja.editando)}
          onCerrar={() => setHoja(null)}
        />
      ) : null}
    </View>
  );
}

// Tarjeta, radios y tipografía de Inicio (TarjetaResumen, estiloTarjeta) y de HojaInferior.
const crearEstilos = (colors) =>
  StyleSheet.create({
    contenedor: {
      gap: 24,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: radios['2xl'],
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.glass05,
    },
    bannerError: {
      borderColor: colors.alerta,
      backgroundColor: colors.alertaSuave,
    },
    bannerTexto: {
      flex: 1,
      ...tipografia.bodyMd,
      color: colors.text,
    },
    bannerTextoError: {
      color: colors.alertaTexto,
    },
    seccion: {
      gap: 12,
    },
    encabezado: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    // Las filas dan el alto: la tarjeta solo conserva el padding lateral.
    tarjeta: {
      ...estiloTarjeta(colors),
      paddingVertical: 0,
    },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
    },
    filaSeparada: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    filaTextos: {
      flex: 1,
      gap: 2,
    },
    nombre: {
      ...tipografia.bodyLg,
      fontFamily: fonts.sansMedium,
      color: colors.text,
    },
    subtitulo: {
      ...tipografia.bodySm,
      color: colors.textSecondary,
    },
    acciones: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    // Botón de ícono redondo de HojaInferior (cerrar): vidrio con borde white/10.
    botonIcono: {
      width: 36,
      height: 36,
      borderRadius: radios.full,
      backgroundColor: colors.glass07,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    botonIconoPeligro: {
      backgroundColor: colors.alertaSuave,
    },
    vacio: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    presionado: {
      opacity: 0.75,
    },
  });
