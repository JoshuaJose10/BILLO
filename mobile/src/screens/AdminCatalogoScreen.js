import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Boton from '../components/Boton';
import EstadoPantalla from '../components/EstadoPantalla';
import { useCatalogoService } from '../services/catalogo';
import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { mensajeError } from '../utils/errores';
import { formatearMonto } from '../utils/formato';
import { estiloServicio, inicialServicio } from '../utils/membresias';

export default function AdminCatalogoScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const catalogoService = useCatalogoService();

  const [servicios, setServicios] = useState([]);
  const [estado, setEstado] = useState('cargando');
  const [errorCarga, setErrorCarga] = useState('');
  const [filtro, setFiltro] = useState('');

  // Estado del modal de creación / edición
  const [modalVisible, setModalVisible] = useState(false);
  const [servicioEditando, setServicioEditando] = useState(null);
  const [nombreForm, setNombreForm] = useState('');
  const [costoForm, setCostoForm] = useState('');
  const [logoForm, setLogoForm] = useState('');
  const [errorForm, setErrorForm] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Al abrir, al reintentar y tras guardar o eliminar. Recarga en silencio: el spinner solo sale
  // en la primera carga; Reintentar deja el error a la vista con el botón en cargando. Los setState
  // van en los callbacks de la promesa (nunca síncronos) para poder llamarla desde el efecto.
  const cargarCatalogo = useCallback(
    () =>
      catalogoService.listar().then(
        (lista) => {
          setServicios(lista);
          setEstado('listo');
          return true;
        },
        (err) => {
          setErrorCarga(mensajeError(err?.code, err?.message));
          setEstado('error');
          return false;
        },
      ),
    [catalogoService],
  );

  useEffect(() => {
    cargarCatalogo();
  }, [cargarCatalogo]);

  const serviciosFiltrados = useMemo(() => {
    if (!filtro.trim()) return servicios;
    const busqueda = filtro.trim().toLowerCase();
    return servicios.filter((s) => s.nombre.toLowerCase().includes(busqueda));
  }, [servicios, filtro]);

  const abrirCrear = () => {
    setServicioEditando(null);
    setNombreForm('');
    setCostoForm('');
    setLogoForm('');
    setErrorForm('');
    setModalVisible(true);
  };

  const abrirEditar = (servicio) => {
    setServicioEditando(servicio);
    setNombreForm(servicio.nombre);
    setCostoForm(String(servicio.costo_sugerido));
    setLogoForm(servicio.logo_url || '');
    setErrorForm('');
    setModalVisible(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalVisible(false);
    setErrorForm('');
  };

  const guardarServicio = async () => {
    if (guardando) return;

    const nombreLimpio = nombreForm.trim();
    if (!nombreLimpio) {
      setErrorForm('El nombre del servicio es obligatorio');
      return;
    }

    const costoLimpio = costoForm.trim();
    const costoNum = Number(costoLimpio);
    if (!costoLimpio || Number.isNaN(costoNum) || costoNum <= 0) {
      setErrorForm('El costo sugerido debe ser un número mayor a $0');
      return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(costoLimpio)) {
      setErrorForm('El costo puede tener hasta 2 decimales');
      return;
    }

    setGuardando(true);
    setErrorForm('');

    const payload = {
      nombre: nombreLimpio,
      costo_sugerido: costoNum,
      logo_url: logoForm.trim() || null,
    };

    try {
      if (servicioEditando) {
        await catalogoService.actualizar(servicioEditando.id, payload);
      } else {
        await catalogoService.crear(payload);
      }
      setGuardando(false);
      setModalVisible(false);
      cargarCatalogo();
    } catch (err) {
      setGuardando(false);
      setErrorForm(err?.message || 'Error al guardar el servicio en el catálogo');
    }
  };

  const confirmarEliminar = (servicio) => {
    Alert.alert(
      '¿Eliminar servicio?',
      `¿Deseas eliminar "${servicio.nombre}" del catálogo predefinido?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await catalogoService.eliminar(servicio.id);
              cargarCatalogo();
            } catch (err) {
              const codigo = err?.code;
              if (codigo === 'SERVICIO_EN_USO') {
                Alert.alert(
                  'No se puede eliminar',
                  'Este servicio no se puede eliminar porque está en uso por una o más suscripciones de usuarios.',
                );
              } else if (codigo === 'PROHIBIDO') {
                Alert.alert('Acceso denegado', 'No tienes permisos de administrador.');
              } else {
                Alert.alert(
                  'Error al eliminar',
                  err?.message || 'No se pudo eliminar el servicio.',
                );
              }
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.contenedor, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Barra superior */}
      <View style={styles.cabeceraBarra}>
        <Pressable
          style={styles.botonVolver}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.titulosColumna}>
          <Text style={styles.titulo}>Administrar catálogo</Text>
          <Text style={styles.subtitulo}>Gestión de servicios y precios oficiales (RF9)</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.botonAgregarTop,
            pressed ? styles.botonAgregarTopPresionado : null,
          ]}
          onPress={abrirCrear}
          accessibilityRole="button"
          accessibilityLabel="Agregar nuevo servicio al catálogo"
        >
          <MaterialCommunityIcons name="plus" size={18} color={colors.onPrimary} />
          <Text style={styles.textoBotonAgregarTop}>Nuevo</Text>
        </Pressable>
      </View>

      {/* Buscador */}
      <View style={styles.buscadorContenedor}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={colors.textSecondary}
          style={styles.buscadorIcono}
        />
        <TextInput
          style={styles.buscadorInput}
          placeholder="Buscar servicio en el catálogo..."
          placeholderTextColor={colors.textSecondary}
          value={filtro}
          onChangeText={setFiltro}
          clearButtonMode="while-editing"
        />
        {filtro.length > 0 ? (
          <Pressable onPress={() => setFiltro('')} hitSlop={8}>
            <MaterialCommunityIcons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {/* Lista de servicios */}
      {estado !== 'listo' || serviciosFiltrados.length === 0 ? (
        <EstadoPantalla
          estado={estado === 'listo' ? 'vacio' : estado}
          titulo={
            estado === 'error'
              ? errorCarga
              : estado === 'cargando'
                ? null
                : filtro.trim()
                  ? `No se encontraron servicios para "${filtro}"`
                  : 'El catálogo está vacío.'
          }
          icono={estado === 'listo' ? 'shape-outline' : undefined}
          onReintentar={cargarCatalogo}
          completa
        />
      ) : (
        <ScrollView style={styles.listaScroll} contentContainerStyle={styles.listaContenido}>
          <Text style={styles.conteoTexto}>
            {serviciosFiltrados.length} servicio{serviciosFiltrados.length === 1 ? '' : 's'}{' '}
            disponible{serviciosFiltrados.length === 1 ? '' : 's'}
          </Text>
          {serviciosFiltrados.map((item) => {
            const { color: colorMarca, icono, predefinido } = estiloServicio(item.nombre);
            return (
              <View key={item.id} style={styles.tarjetaServicio}>
                <View style={styles.servicioInfoFila}>
                  <View style={[styles.squircle, { backgroundColor: colorMarca }]}>
                    {predefinido ? (
                      <MaterialCommunityIcons
                        name={icono}
                        size={22}
                        color={colors.textoSobreColor}
                      />
                    ) : (
                      <Text style={styles.inicialServicioText}>{inicialServicio(item.nombre)}</Text>
                    )}
                  </View>
                  <View style={styles.textosColumna}>
                    <Text style={styles.nombreServicio} numberOfLines={1}>
                      {item.nombre}
                    </Text>
                    <Text style={styles.costoServicio}>
                      {formatearMonto(item.costo_sugerido)} / mes
                    </Text>
                  </View>
                </View>

                {/* Acciones */}
                <View style={styles.accionesFila}>
                  <Pressable
                    style={styles.botonAccion}
                    onPress={() => abrirEditar(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${item.nombre}`}
                    hitSlop={6}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.text} />
                  </Pressable>
                  <Pressable
                    style={[styles.botonAccion, styles.botonAccionEliminar]}
                    onPress={() => confirmarEliminar(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar ${item.nombre}`}
                    hitSlop={6}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={20}
                      color={colors.alerta}
                    />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Modal Crear / Editar */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={cerrarModal}>
        <View style={styles.modalFondo}>
          <Pressable style={styles.modalBackdropPressable} onPress={cerrarModal} />
          <View style={styles.modalCard}>
            <View style={styles.modalCabecera}>
              <Text style={styles.modalTitulo}>
                {servicioEditando ? 'Editar servicio' : 'Nuevo servicio'}
              </Text>
              <Pressable onPress={cerrarModal} hitSlop={8} disabled={guardando}>
                <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.campoGrupo}>
                <Text style={styles.campoEtiqueta}>Nombre del servicio / plan *</Text>
                <TextInput
                  style={styles.campoInput}
                  placeholder="Ej. Spotify Duo, Netflix Estándar"
                  placeholderTextColor={colors.textSecondary}
                  value={nombreForm}
                  onChangeText={setNombreForm}
                  maxLength={255}
                  editable={!guardando}
                />
              </View>

              <View style={styles.campoGrupo}>
                <Text style={styles.campoEtiqueta}>Costo sugerido (MXN) *</Text>
                <TextInput
                  style={styles.campoInput}
                  placeholder="Ej. 189.00"
                  placeholderTextColor={colors.textSecondary}
                  value={costoForm}
                  onChangeText={setCostoForm}
                  keyboardType="decimal-pad"
                  editable={!guardando}
                />
              </View>

              <View style={styles.campoGrupo}>
                <Text style={styles.campoEtiqueta}>URL del logo (opcional)</Text>
                <TextInput
                  style={styles.campoInput}
                  placeholder="https://... (SVG o PNG)"
                  placeholderTextColor={colors.textSecondary}
                  value={logoForm}
                  onChangeText={setLogoForm}
                  autoCapitalize="none"
                  keyboardType="url"
                  maxLength={500}
                  editable={!guardando}
                />
              </View>

              {errorForm ? (
                <View style={styles.errorContenedor}>
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={16}
                    color={colors.alerta}
                  />
                  <Text style={styles.errorTexto}>{errorForm}</Text>
                </View>
              ) : null}

              <View style={styles.modalBotones}>
                <Boton titulo="Cancelar" onPress={cerrarModal} secundario disabled={guardando} />
                <Boton
                  titulo="Guardar servicio"
                  onPress={guardarServicio}
                  cargando={guardando}
                  disabled={guardando}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    contenedor: {
      flex: 1,
      backgroundColor: colors.background,
    },
    cabeceraBarra: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    botonVolver: {
      padding: 4,
    },
    titulosColumna: {
      flex: 1,
    },
    titulo: {
      fontFamily: fonts.sansBold,
      fontSize: 18,
      lineHeight: 24,
      color: colors.text,
    },
    subtitulo: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
    },
    botonAgregarTop: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: radios.full,
      gap: 4,
    },
    botonAgregarTopPresionado: {
      opacity: 0.85,
    },
    textoBotonAgregarTop: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      color: colors.onPrimary,
    },
    buscadorContenedor: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceLow,
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radios.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    buscadorIcono: {
      marginLeft: 2,
    },
    buscadorInput: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.text,
      padding: 0,
    },
    conteoTexto: {
      fontFamily: fonts.monoRegular,
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    listaScroll: {
      flex: 1,
    },
    listaContenido: {
      paddingHorizontal: 16,
      paddingBottom: 24,
      gap: 8,
    },
    tarjetaServicio: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: radios.xl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    servicioInfoFila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    squircle: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inicialServicioText: {
      fontFamily: fonts.sansBold,
      fontSize: 18,
      color: '#FFFFFF',
    },
    textosColumna: {
      flex: 1,
    },
    nombreServicio: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.text,
    },
    costoServicio: {
      fontFamily: fonts.monoSemiBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
      marginTop: 2,
    },
    accionesFila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    botonAccion: {
      padding: 8,
      borderRadius: radios.md,
      backgroundColor: colors.glass05,
    },
    botonAccionEliminar: {
      backgroundColor: colors.alertaFondo || colors.glass05,
    },
    // Modal
    modalFondo: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalBackdropPressable: {
      ...StyleSheet.absoluteFillObject,
    },
    modalCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.card,
      borderRadius: radios['2xl'],
      borderWidth: 1,
      borderColor: colors.borderStrong,
      padding: 20,
      maxHeight: '90%',
    },
    modalCabecera: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 12,
    },
    modalTitulo: {
      fontFamily: fonts.sansBold,
      fontSize: 18,
      color: colors.text,
    },
    modalScroll: {
      width: '100%',
    },
    campoGrupo: {
      marginBottom: 14,
    },
    campoEtiqueta: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      color: colors.text,
      marginBottom: 6,
    },
    campoInput: {
      backgroundColor: colors.surfaceLow,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radios.lg,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.text,
    },
    errorContenedor: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.alertaFondo || colors.glass05,
      padding: 10,
      borderRadius: radios.md,
      marginBottom: 14,
      gap: 6,
    },
    errorTexto: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.alerta,
      flex: 1,
    },
    modalBotones: {
      gap: 8,
      marginTop: 8,
    },
  });
