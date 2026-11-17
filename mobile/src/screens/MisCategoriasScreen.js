import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Boton from '../components/Boton';
import EstadoPantalla from '../components/EstadoPantalla';
import Etiqueta from '../components/Etiqueta';
import FondoDegradado from '../components/FondoDegradado';
import IconoCategoria from '../components/IconoCategoria';
import Input from '../components/Input';
import { useCategorias } from '../context/CategoriasContext';
import { useCategoriasService } from '../services/categorias';
import { registrarColoresCategorias } from '../theme/categorias';
import { radios } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { useEstilos, useTema } from '../theme/TemaContext';
import {
  calcularCambioSeleccionPredefinida,
  combinarCategoriasConPredefinidas,
  extraerCategoriasPropias,
  LONGITUD_MAX_CATEGORIA,
  MENSAJE_CATEGORIA_EN_USO,
  validarNombreCategoria,
} from '../utils/categorias';
import { mensajeError } from '../utils/errores';

// Pantalla Perfil › «Mis categorías» (HU-90):
// - Predefinidas: lista con interruptor (GET /categorias/predefinidas → PUT /categorias/seleccion).
//   Mínimo una activa («Debes tener al menos una categoría»). Al apagar una, avisa:
//   «Tus gastos anteriores se conservan; solo dejará de ofrecerse al registrar».
// - Propias: sección aparte con «Agregar categoría» (POST /categorias, 1..40 caracteres),
//   renombrar (PUT /categorias/:id) y borrar (DELETE /categorias/:id) con confirmación.
//   Si responde 409 CATEGORIA_EN_USO, muestra «Esta categoría tiene gastos o presupuestos; no se puede borrar».
// - Al cambiar o salir, recarga CategoriasContext para actualizar Nuevo gasto y Presupuestos al momento.
export default function MisCategoriasScreen({ navigation }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const { recargar: recargarContexto } = useCategorias();
  const {
    listarCategorias,
    listarPredefinidas,
    guardarSeleccion,
    crearCategoria,
    renombrarCategoria,
    eliminarCategoria,
  } = useCategoriasService();

  const [predefinidas, setPredefinidas] = useState([]);
  const [propias, setPropias] = useState([]);
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [errorCarga, setErrorCarga] = useState(null);

  const [guardandoSeleccionId, setGuardandoSeleccionId] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [aviso, setAviso] = useState(null); // { tipo: 'info' | 'error', texto: string }

  // Modal de crear / renombrar categoría propia
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState(null); // null = crear, { id, nombre } = renombrar
  const [nombreTexto, setNombreTexto] = useState('');
  const [errorModal, setErrorModal] = useState('');
  const [guardandoModal, setGuardandoModal] = useState(false);

  const huboCambiosRef = useRef(false);
  const ultimaPeticion = useRef(0);

  const cargar = useCallback(() => {
    const peticion = ++ultimaPeticion.current;
    Promise.all([listarPredefinidas(), listarCategorias()])
      .then(([listaPredefinidas, listaActivas]) => {
        if (peticion !== ultimaPeticion.current) return;
        const predefinidasGasto = (listaPredefinidas || []).filter(
          (c) => c.tipo == null || c.tipo === 'gasto',
        );
        const propiasUsuario = extraerCategoriasPropias(listaActivas);
        registrarColoresCategorias(
          combinarCategoriasConPredefinidas(listaActivas, predefinidasGasto),
        );
        setPredefinidas(predefinidasGasto);
        setPropias(propiasUsuario);
        setErrorCarga(null);
        setEstado('listo');
      })
      .catch((err) => {
        if (peticion !== ultimaPeticion.current) return;
        setErrorCarga(err);
        setEstado('error');
      });
  }, [listarPredefinidas, listarCategorias]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Al desmontar la pantalla, si hubo cambios se asegura de refrescar la caché global.
  useEffect(
    () => () => {
      if (huboCambiosRef.current) {
        recargarContexto();
      }
    },
    [recargarContexto],
  );

  const volver = () => {
    recargarContexto();
    navigation.goBack();
  };

  const reintentar = () => {
    setEstado('cargando');
    setErrorCarga(null);
    cargar();
  };

  const alternarPredefinida = async (categoria) => {
    if (guardandoSeleccionId != null) return;
    const cambio = calcularCambioSeleccionPredefinida(predefinidas, categoria.id);
    if (!cambio.permitido) {
      if (cambio.error) {
        setAviso({ tipo: 'error', texto: cambio.error });
        Alert.alert('Aviso', cambio.error);
      }
      return;
    }

    const previas = predefinidas;
    setPredefinidas((actual) =>
      actual.map((c) =>
        String(c.id) === String(categoria.id) ? { ...c, seleccionada: cambio.encendida } : c,
      ),
    );
    setAviso(cambio.aviso ? { tipo: 'info', texto: cambio.aviso } : null);
    setGuardandoSeleccionId(categoria.id);

    try {
      await guardarSeleccion(cambio.seleccionIds);
      huboCambiosRef.current = true;
      recargarContexto();
    } catch (err) {
      setPredefinidas(previas);
      const msg = mensajeError(err?.code, err?.message);
      setAviso({ tipo: 'error', texto: msg });
    } finally {
      setGuardandoSeleccionId(null);
    }
  };

  const abrirCrear = () => {
    setEditando(null);
    setNombreTexto('');
    setErrorModal('');
    setModalVisible(true);
  };

  const abrirRenombrar = (categoria) => {
    setEditando(categoria);
    setNombreTexto(categoria.nombre || '');
    setErrorModal('');
    setModalVisible(true);
  };

  const cerrarModal = () => {
    if (guardandoModal) return;
    setModalVisible(false);
  };

  const guardarPropia = async () => {
    if (guardandoModal) return;
    const todasConocidas = [...predefinidas, ...propias];
    const validacion = validarNombreCategoria(nombreTexto, todasConocidas, editando?.id ?? null);
    if (!validacion.valido) {
      setErrorModal(validacion.error);
      return;
    }

    setGuardandoModal(true);
    setErrorModal('');
    try {
      if (editando) {
        const actualizada = await renombrarCategoria(editando.id, validacion.nombre);
        const nuevasPropias = propias.map((c) =>
          String(c.id) === String(editando.id) ? { ...c, ...actualizada } : c,
        );
        registrarColoresCategorias(nuevasPropias);
        setPropias(nuevasPropias);
      } else {
        const creada = await crearCategoria(validacion.nombre);
        const nuevasPropias = [...propias, creada];
        registrarColoresCategorias(nuevasPropias);
        setPropias(nuevasPropias);
      }
      huboCambiosRef.current = true;
      setModalVisible(false);
      recargarContexto();
    } catch (err) {
      setErrorModal(mensajeError(err?.code, err?.message));
    } finally {
      setGuardandoModal(false);
    }
  };

  const confirmarEliminar = (categoria) => {
    if (eliminandoId != null) return;
    Alert.alert('Eliminar categoría', `¿Quieres eliminar «${categoria.nombre}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => ejecutarEliminar(categoria),
      },
    ]);
  };

  const ejecutarEliminar = async (categoria) => {
    setEliminandoId(categoria.id);
    setAviso(null);
    try {
      await eliminarCategoria(categoria.id);
      const nuevasPropias = propias.filter((c) => String(c.id) !== String(categoria.id));
      registrarColoresCategorias(nuevasPropias);
      setPropias(nuevasPropias);
      huboCambiosRef.current = true;
      recargarContexto();
    } catch (err) {
      const msg =
        err?.code === 'CATEGORIA_EN_USO' || err?.status === 409
          ? MENSAJE_CATEGORIA_EN_USO
          : mensajeError(err?.code, err?.message);
      setAviso({ tipo: 'error', texto: msg });
      Alert.alert('No se puede borrar', msg);
    } finally {
      setEliminandoId(null);
    }
  };

  const longitudActual = nombreTexto.trim().length;

  return (
    <SafeAreaView style={styles.pantalla} edges={['top', 'bottom']}>
      <FondoDegradado />

      <View style={styles.cabecera}>
        <Pressable
          onPress={volver}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={({ pressed }) => [styles.botonVolver, pressed && styles.presionado]}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.cabeceraTextos}>
          <Text style={styles.titulo} accessibilityRole="header">
            Mis categorías
          </Text>
          <Text style={styles.subtitulo}>Elige las predefinidas que usas o crea las tuyas</Text>
        </View>
      </View>

      {estado !== 'listo' ? (
        <EstadoPantalla estado={estado} error={errorCarga} onReintentar={reintentar} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {aviso ? (
            <View
              style={[
                styles.bannerAviso,
                aviso.tipo === 'error' ? styles.bannerError : styles.bannerInfo,
              ]}
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
            <Text style={styles.descripcionSeccion}>
              Activa o desactiva las categorías que quieres ver en Nuevo gasto y Presupuestos.
            </Text>
            <View style={styles.tarjetaGrupo}>
              {predefinidas.map((cat, idx) => {
                const activa = Boolean(cat.seleccionada);
                const ocupado = String(guardandoSeleccionId) === String(cat.id);
                return (
                  <View
                    key={String(cat.id)}
                    style={[styles.fila, idx < predefinidas.length - 1 && styles.filaConBorde]}
                  >
                    <IconoCategoria nombre={cat.nombre} tamaño={38} />
                    <View style={styles.filaTextos}>
                      <Text style={styles.nombreCategoria} numberOfLines={1}>
                        {cat.nombre}
                      </Text>
                      <Text style={styles.estadoCategoria}>{activa ? 'Activa' : 'Inactiva'}</Text>
                    </View>
                    {ocupado ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.primary}
                        style={styles.indicadorSwitch}
                      />
                    ) : null}
                    <Switch
                      value={activa}
                      onValueChange={() => alternarPredefinida(cat)}
                      disabled={guardandoSeleccionId != null}
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
              <View style={styles.cabeceraPropiasTextos}>
                <Etiqueta>Tus categorías</Etiqueta>
                <Text style={styles.descripcionSeccion}>
                  Crea categorías propias con su propio color para tus gastos.
                </Text>
              </View>
            </View>

            <Boton
              titulo="Agregar categoría"
              variante="secundario"
              onPress={abrirCrear}
              disabled={eliminandoId != null}
            />

            {propias.length === 0 ? (
              <View style={styles.vacioPropias}>
                <MaterialCommunityIcons name="tag-outline" size={24} color={colors.textSecondary} />
                <Text style={styles.vacioPropiasTexto}>Aún no has creado categorías propias.</Text>
              </View>
            ) : (
              <View style={styles.tarjetaGrupo}>
                {propias.map((cat, idx) => {
                  const eliminando = String(eliminandoId) === String(cat.id);
                  return (
                    <View
                      key={String(cat.id)}
                      style={[styles.fila, idx < propias.length - 1 && styles.filaConBorde]}
                    >
                      <IconoCategoria nombre={cat.nombre} tamaño={38} />
                      <View style={styles.filaTextos}>
                        <Text style={styles.nombreCategoria} numberOfLines={1}>
                          {cat.nombre}
                        </Text>
                        <View style={styles.metaPropia}>
                          <View
                            style={[
                              styles.muestraColor,
                              { backgroundColor: cat.color || colors.primary },
                            ]}
                          />
                          <Text style={styles.estadoCategoria}>Personalizada</Text>
                        </View>
                      </View>

                      <View style={styles.accionesFila}>
                        <Pressable
                          onPress={() => abrirRenombrar(cat)}
                          disabled={eliminando}
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityLabel={`Renombrar ${cat.nombre}`}
                          style={({ pressed }) => [styles.botonIcono, pressed && styles.presionado]}
                        >
                          <MaterialCommunityIcons
                            name="pencil-outline"
                            size={18}
                            color={colors.textPrimary}
                          />
                        </Pressable>

                        <Pressable
                          onPress={() => confirmarEliminar(cat)}
                          disabled={eliminando}
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityLabel={`Borrar ${cat.nombre}`}
                          style={({ pressed }) => [
                            styles.botonIcono,
                            styles.botonIconoPeligro,
                            pressed && styles.presionado,
                          ]}
                        >
                          {eliminando ? (
                            <ActivityIndicator size="small" color={colors.danger} />
                          ) : (
                            <MaterialCommunityIcons
                              name="trash-can-outline"
                              size={18}
                              color={colors.danger}
                            />
                          )}
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={cerrarModal}>
        <KeyboardAvoidingView
          style={styles.modalFondo}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={cerrarModal} />
          <View style={styles.modalTarjeta}>
            <Text style={styles.modalTitulo} accessibilityRole="header">
              {editando ? 'Renombrar categoría' : 'Agregar categoría'}
            </Text>

            <Input
              label="Nombre de la categoría"
              placeholder="Ej. Gimnasio"
              value={nombreTexto}
              onChangeText={(v) => {
                setNombreTexto(v);
                if (errorModal) setErrorModal('');
              }}
              maxLength={LONGITUD_MAX_CATEGORIA}
              autoCapitalize="sentences"
              editable={!guardandoModal}
            />

            <Text style={styles.contador}>
              {longitudActual}/{LONGITUD_MAX_CATEGORIA} caracteres
            </Text>

            {errorModal ? (
              <Text style={styles.errorTexto} accessibilityLiveRegion="polite">
                {errorModal}
              </Text>
            ) : null}

            <View style={styles.modalBotones}>
              <View style={styles.modalBoton}>
                <Boton
                  titulo="Cancelar"
                  variante="fantasma"
                  onPress={cerrarModal}
                  disabled={guardandoModal}
                />
              </View>
              <View style={styles.modalBoton}>
                <Boton
                  titulo={editando ? 'Guardar' : 'Crear'}
                  onPress={guardarPropia}
                  cargando={guardandoModal}
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    pantalla: {
      flex: 1,
      backgroundColor: colors.background,
    },
    cabecera: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 12,
    },
    botonVolver: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cabeceraTextos: {
      flex: 1,
    },
    titulo: {
      fontFamily: fonts.sansBold,
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.4,
      color: colors.textPrimary,
    },
    subtitulo: {
      fontFamily: fonts.sans,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    contenido: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 36,
      gap: 22,
    },
    bannerAviso: {
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
    descripcionSeccion: {
      fontFamily: fonts.sans,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    cabeceraPropias: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cabeceraPropiasTextos: {
      flex: 1,
      gap: 4,
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
    nombreCategoria: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    estadoCategoria: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
    },
    indicadorSwitch: {
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
    accionesFila: {
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
    vacioPropias: {
      backgroundColor: colors.surface,
      borderRadius: radios.controles,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingVertical: 20,
      paddingHorizontal: 16,
      alignItems: 'center',
      gap: 6,
    },
    vacioPropiasTexto: {
      fontFamily: fonts.sans,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    presionado: {
      opacity: 0.75,
    },
    modalFondo: {
      flex: 1,
      backgroundColor: colors.backdrop,
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    modalTarjeta: {
      backgroundColor: colors.surface,
      borderRadius: radios.tarjeta,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: 20,
      gap: 14,
    },
    modalTitulo: {
      fontFamily: fonts.sansBold,
      fontSize: 18,
      lineHeight: 24,
      color: colors.textPrimary,
    },
    contador: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
      textAlign: 'right',
      marginTop: -6,
    },
    errorTexto: {
      fontFamily: fonts.sansMedium,
      fontSize: 13,
      lineHeight: 18,
      color: colors.danger,
      textAlign: 'center',
    },
    modalBotones: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    modalBoton: {
      flex: 1,
    },
  });
