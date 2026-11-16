import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { radios } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { useEstilos, useTema } from '../theme/TemaContext';
import { calcularCambioSeleccionPredefinida } from '../utils/categorias';
import Boton from './Boton';
import Etiqueta from './Etiqueta';
import HojaNombreCategoria from './HojaNombreCategoria';
import IconoCategoria from './IconoCategoria';

// Categorías de gasto del usuario (HU-89 / HU-90): predefinidas con interruptor y propias con
// «Agregar categoría». Lo usan Mis categorías y Elige tus categorías; cada pantalla decide cuándo
// guardar.
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

  return (
    <View style={styles.contenedor}>
      {aviso ? (
        <View
          style={[styles.banner, aviso.tipo === 'error' ? styles.bannerError : styles.bannerInfo]}
          accessibilityLiveRegion="polite"
        >
          <MaterialCommunityIcons
            name={aviso.tipo === 'error' ? 'alert-circle-outline' : 'information-outline'}
            size={18}
            color={aviso.tipo === 'error' ? colors.danger : colors.primary}
          />
          <Text
            style={[
              styles.bannerTexto,
              aviso.tipo === 'error' ? styles.bannerTextoError : styles.bannerTextoInfo,
            ]}
          >
            {aviso.texto}
          </Text>
        </View>
      ) : null}

      <View style={styles.seccion}>
        <Etiqueta>Categorías predefinidas</Etiqueta>
        <Text style={styles.descripcion}>
          Activa o desactiva las categorías que quieres ver en Nuevo gasto y Presupuestos.
        </Text>
        <View style={styles.tarjetaGrupo}>
          {predefinidas.map((cat, idx) => {
            const activa = Boolean(cat.seleccionada);
            return (
              <View
                key={String(cat.id)}
                style={[styles.fila, idx < predefinidas.length - 1 && styles.filaConBorde]}
              >
                <IconoCategoria nombre={cat.nombre} tamaño={38} />
                <View style={styles.filaTextos}>
                  <Text style={styles.nombre} numberOfLines={1}>
                    {cat.nombre}
                  </Text>
                  <Text style={styles.estado}>{activa ? 'Activa' : 'Inactiva'}</Text>
                </View>
                {String(ocupadoId) === String(cat.id) ? (
                  <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
                ) : null}
                <Switch
                  value={activa}
                  onValueChange={() => alternar(cat)}
                  disabled={ocupadoId != null}
                  trackColor={{ false: colors.surfaceHigh, true: colors.primary }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel={`Categoría ${cat.nombre}`}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.seccion}>
        <View style={styles.cabeceraPropias}>
          <Etiqueta>Tus categorías</Etiqueta>
          <Text style={styles.descripcion}>
            Crea categorías propias con su propio color para tus gastos.
          </Text>
        </View>

        <Boton
          titulo="Agregar categoría"
          secundario
          onPress={() => setHoja({ editando: null })}
          disabled={bloqueado}
        />

        {propias.length === 0 ? (
          <View style={[styles.tarjetaGrupo, styles.vacio]}>
            <MaterialCommunityIcons name="tag-outline" size={24} color={colors.textSecondary} />
            <Text style={styles.vacioTexto}>Aún no has creado categorías propias.</Text>
          </View>
        ) : (
          <View style={styles.tarjetaGrupo}>
            {propias.map((cat, idx) => (
              <View
                key={String(cat.id)}
                style={[styles.fila, idx < propias.length - 1 && styles.filaConBorde]}
              >
                <IconoCategoria nombre={cat.nombre} tamaño={38} />
                <View style={styles.filaTextos}>
                  <Text style={styles.nombre} numberOfLines={1}>
                    {cat.nombre}
                  </Text>
                  <View style={styles.metaPropia}>
                    <View
                      style={[
                        styles.muestraColor,
                        { backgroundColor: cat.color || colors.primary },
                      ]}
                    />
                    <Text style={styles.estado}>Personalizada</Text>
                  </View>
                </View>

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
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <MaterialCommunityIcons
                          name={accion.icono}
                          size={18}
                          color={accion.peligro ? colors.danger : colors.textPrimary}
                        />
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
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

const crearEstilos = (colors) =>
  StyleSheet.create({
    contenedor: {
      gap: 22,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: radios.controles,
      borderWidth: 1,
    },
    bannerInfo: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.borderSubtle,
    },
    bannerError: {
      backgroundColor: colors.dangerSoft,
      borderColor: colors.danger,
    },
    bannerTexto: {
      flex: 1,
      fontFamily: fonts.sansMedium,
      fontSize: 13,
      lineHeight: 18,
    },
    bannerTextoInfo: {
      color: colors.textPrimary,
    },
    bannerTextoError: {
      color: colors.danger,
    },
    seccion: {
      gap: 10,
    },
    cabeceraPropias: {
      gap: 4,
    },
    descripcion: {
      fontFamily: fonts.sans,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    tarjetaGrupo: {
      backgroundColor: colors.surface,
      borderRadius: radios.controles,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      overflow: 'hidden',
    },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    filaConBorde: {
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    filaTextos: {
      flex: 1,
      gap: 2,
    },
    nombre: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    estado: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
    },
    spinner: {
      marginRight: 4,
    },
    metaPropia: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    muestraColor: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    acciones: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    botonIcono: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surfaceLow,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    botonIconoPeligro: {
      backgroundColor: colors.dangerSoft,
    },
    vacio: {
      paddingVertical: 20,
      paddingHorizontal: 16,
      alignItems: 'center',
      gap: 6,
    },
    vacioTexto: {
      fontFamily: fonts.sans,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    presionado: {
      opacity: 0.75,
    },
  });
