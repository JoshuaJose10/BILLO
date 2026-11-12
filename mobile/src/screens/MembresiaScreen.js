import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Boton from '../components/Boton';
import ChipSelector from '../components/ChipSelector';
import HojaInferior from '../components/HojaInferior';
import Input from '../components/Input';
import MontoGrande from '../components/MontoGrande';
import PanelHoja from '../components/PanelHoja';
import TecladoNumerico from '../components/TecladoNumerico';
import { useMembresiasService } from '../services/membresias';
import { espacios, radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { tipografia } from '../theme/tipografia';
import { mensajeError } from '../utils/errores';
import { vistaLista } from '../utils/estadoCarga';
import { fechaLocalISO, parsearFechaLocal } from '../utils/fechas';
import { formatearMontoCorto, LOCALE, resumirTexto } from '../utils/formato';
import {
  estiloServicio,
  filtrarCatalogo,
  formatearDiaMes,
  inicialServicio,
  validarMembresia,
} from '../utils/membresias';
import { aplicarTecla, montoDesdeTexto, textoDesdeMonto } from '../utils/monto';

const OPCIONES_FRECUENCIA = [
  { valor: 'mensual', etiqueta: 'Mensual', icono: 'calendar-month-outline' },
  { valor: 'anual', etiqueta: 'Anual', icono: 'calendar-range-outline' },
];

// Límite de la columna membresias.nombre (VARCHAR(255)).
const NOMBRE_MAX = 255;

// Alto del teclado del sistema (0 si está oculto). iOS avisa antes de mostrarlo; Android, después.
function useAlturaTeclado() {
  const [altura, setAltura] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const mostrar = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
      setAltura(e.endCoordinates?.height ?? 0),
    );
    const ocultar = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setAltura(0),
    );
    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, []);
  return altura;
}

// Hoja para agregar o editar una membresía / suscripción (RF5). Mismo esquema que Nuevo gasto
// (HU-81): chips de nombre, frecuencia y fecha arriba, el costo con MontoGrande y el teclado
// numérico, y (al agregar) el catálogo de servicios en la fila donde Nuevo gasto pone las
// categorías: elegir uno llena nombre, costo sugerido y servicio_id.
export default function MembresiaScreen({ navigation, route }) {
  const { colors, esOscuro } = useTema();
  const styles = useEstilos(crearEstilos);
  const { listarCatalogo, crearMembresia, actualizarMembresia, eliminarMembresia, marcarPagada } =
    useMembresiasService();

  const membresiaEditada = route.params?.membresia;
  const editando = Boolean(membresiaEditada);

  const [nombre, setNombre] = useState(() => membresiaEditada?.nombre ?? '');
  const [texto, setTexto] = useState(() =>
    editando ? textoDesdeMonto(membresiaEditada.costo) : '',
  );
  const [frecuencia, setFrecuencia] = useState(() => membresiaEditada?.frecuencia ?? 'mensual');
  const [fecha, setFecha] = useState(() =>
    membresiaEditada?.fecha_cobro ? parsearFechaLocal(membresiaEditada.fecha_cobro) : new Date(),
  );
  const [servicioId, setServicioId] = useState(() => membresiaEditada?.servicio_id ?? null);
  const [panel, setPanel] = useState(null); // 'nombre' | 'frecuencia' | 'fecha'

  // Catálogo (solo al agregar): 'cargando' | 'listo' | 'error'. Un error ya no se traga en
  // silencio: se muestra con Reintentar, y una lista vacía dice que no hay servicios (HU-80).
  const [catalogo, setCatalogo] = useState([]);
  const [estadoCatalogo, setEstadoCatalogo] = useState('cargando');
  const [errorCatalogo, setErrorCatalogo] = useState('');
  const [intentoCatalogo, setIntentoCatalogo] = useState(0);

  const [errores, setErrores] = useState({});
  const [errorApi, setErrorApi] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [marcandoPagada, setMarcandoPagada] = useState(false);
  const enviando = useRef(false);
  const hojaRef = useRef(null);

  const ocupado = guardando || eliminando || marcandoPagada;

  // Cargar catálogo de servicios predefinidos si estamos agregando
  useEffect(() => {
    if (editando) return;
    let activo = true;
    listarCatalogo()
      .then((items) => {
        if (!activo) return;
        setCatalogo(items);
        setEstadoCatalogo('listo');
      })
      .catch((error) => {
        if (!activo) return;
        setErrorCatalogo(mensajeError(error?.code, error?.message));
        setEstadoCatalogo('error');
      });

    return () => {
      activo = false;
    };
  }, [editando, listarCatalogo, intentoCatalogo]);

  const reintentarCatalogo = () => {
    setEstadoCatalogo('cargando');
    setIntentoCatalogo((n) => n + 1);
  };

  const vistaCatalogo = vistaLista(estadoCatalogo, catalogo);

  // Buscador del catálogo (HU-72). Mientras el campo tiene el foco, el teclado del sistema ocupa
  // el lugar del teclado numérico y del botón: la hoja reserva su alto para que no tape el campo
  // ni los resultados.
  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const insets = useSafeAreaInsets();
  const alturaTeclado = useAlturaTeclado();
  const catalogoFiltrado = useMemo(() => filtrarCatalogo(catalogo, busqueda), [catalogo, busqueda]);

  const limpiarError = (...campos) => {
    if (campos.some((c) => errores[c])) {
      setErrores((prev) => {
        const siguiente = { ...prev };
        campos.forEach((c) => delete siguiente[c]);
        return siguiente;
      });
    }
    if (errorApi) setErrorApi('');
  };

  const alPulsarTecla = (tecla) => {
    setTexto((actual) => aplicarTecla(actual, tecla));
    limpiarError('costo');
  };

  const seleccionarDelCatalogo = (item) => {
    Keyboard.dismiss();
    setServicioId(item.id);
    setNombre(item.nombre);
    setTexto(textoDesdeMonto(item.costo_sugerido));
    limpiarError('nombre', 'costo');
  };

  const abrirFecha = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: fecha,
        mode: 'date',
        onValueChange: (_evento, nueva) => setFecha(nueva),
      });
    } else {
      setPanel('fecha');
    }
  };

  const guardar = async () => {
    if (enviando.current) return;

    // El teclado deja textos como "12." o "": se validan como número (igual que Nuevo gasto).
    const fechaCobroISO = fechaLocalISO(fecha);
    const validacion = validarMembresia({
      nombre,
      costoTexto: String(montoDesdeTexto(texto)),
      fechaCobro: fechaCobroISO,
    });

    if (!validacion.valido) {
      setErrores(validacion.errores);
      setErrorApi('');
      return;
    }

    enviando.current = true;
    setGuardando(true);
    setErrorApi('');

    const payload = {
      servicio_id: servicioId,
      nombre: nombre.trim(),
      costo: validacion.costo,
      frecuencia,
      fecha_cobro: fechaCobroISO,
    };

    try {
      if (editando) {
        await actualizarMembresia(membresiaEditada.id, payload);
      } else {
        await crearMembresia(payload);
      }
      enviando.current = false;
      hojaRef.current?.cerrar();
    } catch (error) {
      enviando.current = false;
      setGuardando(false);
      setErrorApi(mensajeError(error?.code, error?.message));
    }
  };

  const eliminar = async () => {
    if (enviando.current || !editando) return;
    enviando.current = true;
    setEliminando(true);
    setErrorApi('');

    try {
      await eliminarMembresia(membresiaEditada.id);
      enviando.current = false;
      hojaRef.current?.cerrar();
    } catch (error) {
      enviando.current = false;
      setEliminando(false);
      setErrorApi(mensajeError(error?.code, error?.message));
    }
  };

  const confirmarEliminar = () => {
    if (enviando.current) return;
    Alert.alert('¿Eliminar suscripción?', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: eliminar },
    ]);
  };

  const confirmarMarcarPagada = () => {
    if (enviando.current || !editando) return;
    Alert.alert('¿Marcar como pagada?', 'El próximo cobro avanzará al siguiente ciclo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Marcar pagada',
        onPress: async () => {
          enviando.current = true;
          setMarcandoPagada(true);
          setErrorApi('');
          try {
            await marcarPagada(membresiaEditada.id);
            enviando.current = false;
            hojaRef.current?.cerrar();
          } catch (error) {
            enviando.current = false;
            setMarcandoPagada(false);
            setErrorApi(mensajeError(error?.code, error?.message));
          }
        },
      },
    ]);
  };

  const frecuenciaActual =
    OPCIONES_FRECUENCIA.find((f) => f.valor === frecuencia) || OPCIONES_FRECUENCIA[0];
  const fechaTexto = `Cobro ${formatearDiaMes(fechaLocalISO(fecha))}`;
  const nombreTexto = nombre.trim() ? resumirTexto(nombre) : 'Nombre';
  const errorFormulario = errores.nombre || errores.fecha;

  return (
    <HojaInferior
      ref={hojaRef}
      titulo={editando ? 'Editar suscripción' : 'Nueva suscripción'}
      etiquetaFondo={editando ? 'Cerrar editar suscripción' : 'Cerrar nueva suscripción'}
      onCerrada={() => navigation.goBack()}
      bloqueada={ocupado}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filaScroll}
        contentContainerStyle={styles.filaChips}
      >
        <ChipSelector
          icono="card-text-outline"
          etiqueta={nombreTexto}
          onPress={() => setPanel('nombre')}
          accessibilityLabel={nombre.trim() ? `Nombre: ${nombre.trim()}` : 'Escribir nombre'}
        />
        <ChipSelector
          icono={frecuenciaActual.icono}
          etiqueta={frecuenciaActual.etiqueta}
          chevron
          onPress={() => setPanel('frecuencia')}
          accessibilityLabel={`Frecuencia de cobro: ${frecuenciaActual.etiqueta}`}
        />
        <ChipSelector
          icono="calendar-blank-outline"
          etiqueta={fechaTexto}
          chevron
          onPress={abrirFecha}
          accessibilityLabel={`Próxima fecha de cobro: ${formatearDiaMes(fechaLocalISO(fecha))}`}
        />
      </ScrollView>
      {errorFormulario ? <Text style={styles.errorCampo}>{errorFormulario}</Text> : null}

      <View style={styles.zonaMonto}>
        <MontoGrande texto={texto} error={!!errores.costo} etiqueta="Costo" />
      </View>
      {errores.costo ? <Text style={styles.errorCampo}>{errores.costo}</Text> : null}

      {/* Catálogo de servicios (solo al agregar), en el lugar de las categorías de Nuevo gasto */}
      {!editando ? (
        <View style={styles.zonaCatalogo}>
          {vistaCatalogo === 'cargando' ? (
            <View style={styles.estadoCatalogo}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
              <Text style={styles.textoEstado}>Cargando catálogo…</Text>
            </View>
          ) : vistaCatalogo === 'error' ? (
            <View style={styles.estadoCatalogo}>
              <Text style={[styles.textoEstado, styles.textoEstadoFlexible]} numberOfLines={2}>
                {errorCatalogo}
              </Text>
              <ChipSelector icono="refresh" etiqueta="Reintentar" onPress={reintentarCatalogo} />
            </View>
          ) : vistaCatalogo === 'vacio' ? (
            <Text style={styles.textoEstado}>No hay servicios en el catálogo</Text>
          ) : (
            <>
              <Input
                icono="magnify"
                value={busqueda}
                onChangeText={setBusqueda}
                limpiable
                placeholder="Buscar servicio o plan"
                accessibilityLabel="Buscar en el catálogo"
                returnKeyType="search"
                onSubmitEditing={Keyboard.dismiss}
                onFocus={() => setBuscando(true)}
                onBlur={() => setBuscando(false)}
              />
              {catalogoFiltrado.length === 0 ? (
                <Text style={styles.textoEstado} accessibilityLiveRegion="polite">
                  Sin coincidencias
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  style={styles.filaScroll}
                  contentContainerStyle={styles.filaCatalogo}
                >
                  {catalogoFiltrado.map((item) => (
                    <ChipServicio
                      key={item.id}
                      servicio={item}
                      seleccionado={servicioId === item.id}
                      onPress={() => seleccionarDelCatalogo(item)}
                    />
                  ))}
                </ScrollView>
              )}
            </>
          )}
        </View>
      ) : null}

      {buscando ? (
        // El teclado del sistema ocupa el lugar del numérico: la hoja sube por encima de él.
        <View style={{ height: Math.max(0, alturaTeclado - insets.bottom - 12) }} />
      ) : (
        <>
          <View style={styles.zonaTeclado}>
            <TecladoNumerico onTecla={alPulsarTecla} disabled={ocupado} />
          </View>

          {errorApi ? <Text style={styles.errorApi}>{errorApi}</Text> : null}
          <Boton
            titulo={editando ? 'Guardar cambios' : 'Guardar suscripción'}
            icono="check"
            onPress={guardar}
            cargando={guardando}
            disabled={ocupado}
            compacto
          />
        </>
      )}
      {editando ? (
        <View style={styles.zonaEliminar}>
          <Boton
            titulo="Marcar como pagada"
            icono="check-circle-outline"
            onPress={confirmarMarcarPagada}
            cargando={marcandoPagada}
            disabled={ocupado}
            secundario
            compacto
          />
          <Boton
            titulo="Eliminar suscripción"
            icono="trash-can-outline"
            destructivo
            onPress={confirmarEliminar}
            cargando={eliminando}
            disabled={ocupado}
          />
        </View>
      ) : null}

      {panel === 'nombre' ? (
        <PanelHoja titulo="Nombre del servicio" onCerrar={() => setPanel(null)}>
          <TextInput
            value={nombre}
            onChangeText={(valor) => {
              setNombre(valor);
              limpiarError('nombre');
            }}
            placeholder="Ej. Netflix, Spotify, Gimnasio"
            placeholderTextColor={colors.textSecondary}
            cursorColor={colors.acento}
            selectionColor={colors.acento}
            keyboardAppearance={esOscuro ? 'dark' : 'light'}
            autoCapitalize="words"
            maxLength={NOMBRE_MAX}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => setPanel(null)}
            style={styles.inputNombre}
          />
          <Boton titulo="Listo" onPress={() => setPanel(null)} />
        </PanelHoja>
      ) : null}

      {panel === 'frecuencia' ? (
        <PanelHoja titulo="Frecuencia de cobro" onCerrar={() => setPanel(null)}>
          {OPCIONES_FRECUENCIA.map((f) => (
            <Pressable
              key={f.valor}
              onPress={() => {
                setFrecuencia(f.valor);
                setPanel(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: f.valor === frecuencia }}
              style={({ pressed }) => [styles.opcion, pressed ? styles.opcionPresionada : null]}
            >
              <MaterialCommunityIcons name={f.icono} size={22} color={colors.text} />
              <Text style={styles.opcionTexto}>{f.etiqueta}</Text>
              {f.valor === frecuencia ? (
                <MaterialCommunityIcons name="check" size={22} color={colors.text} />
              ) : null}
            </Pressable>
          ))}
        </PanelHoja>
      ) : null}

      {panel === 'fecha' ? (
        <PanelHoja titulo="Próxima fecha de cobro" onCerrar={() => setPanel(null)}>
          <DateTimePicker
            value={fecha}
            mode="date"
            display="inline"
            themeVariant={esOscuro ? 'dark' : 'light'}
            accentColor={colors.text}
            locale={LOCALE}
            onValueChange={(_evento, nueva) => {
              setFecha(nueva);
              setPanel(null);
            }}
          />
        </PanelHoja>
      ) : null}
    </HojaInferior>
  );
}

// Chip de un servicio del catálogo: mini squircle con el color de marca (ícono o inicial),
// nombre y costo sugerido. Seleccionado toma el acento, como el chip "Todas" de categorías.
function ChipServicio({ servicio, seleccionado, onPress }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const { color, icono, predefinido } = estiloServicio(servicio.nombre);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: seleccionado }}
      accessibilityLabel={`${servicio.nombre}, ${formatearMontoCorto(servicio.costo_sugerido)}`}
      style={({ pressed }) => [
        styles.chipServicio,
        seleccionado ? styles.chipServicioSeleccionado : null,
        pressed && !seleccionado ? styles.chipServicioPresionado : null,
      ]}
    >
      <View style={[styles.miniSquircle, { backgroundColor: color }]}>
        {predefinido ? (
          <MaterialCommunityIcons name={icono} size={12} color={colors.textoSobreColor} />
        ) : (
          <Text style={styles.miniInicial}>{inicialServicio(servicio.nombre)}</Text>
        )}
      </View>
      <Text
        style={[styles.chipServicioTexto, seleccionado ? styles.chipServicioTextoActivo : null]}
        numberOfLines={1}
      >
        {servicio.nombre}
      </Text>
      <Text style={styles.chipServicioCosto}>{formatearMontoCorto(servicio.costo_sugerido)}</Text>
    </Pressable>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // Filas con scroll horizontal hasta el borde de la hoja (px-5), como Nuevo gasto
    filaScroll: {
      marginHorizontal: -espacios.margen,
      flexGrow: 0,
    },
    filaChips: {
      gap: espacios.sm,
      paddingHorizontal: espacios.margen,
      paddingTop: 10,
    },
    filaCatalogo: {
      gap: 6,
      paddingHorizontal: espacios.margen,
      paddingVertical: 2,
    },
    zonaMonto: {
      marginTop: espacios.sm,
      marginBottom: espacios.sm,
    },
    zonaCatalogo: {
      minHeight: 32,
      justifyContent: 'center',
      marginBottom: espacios.sm,
    },
    estadoCatalogo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    textoEstado: {
      ...tipografia.bodyMd,
      color: colors.textSecondary,
    },
    textoEstadoFlexible: {
      flex: 1,
    },
    errorCampo: {
      ...tipografia.bodySm,
      color: colors.alertaTexto,
      marginTop: espacios.xs,
    },
    zonaTeclado: {
      marginBottom: 10,
    },
    zonaEliminar: {
      marginTop: 10,
      gap: 10,
    },
    errorApi: {
      ...tipografia.bodyMd,
      color: colors.alertaTexto,
      textAlign: 'center',
      marginBottom: 10,
    },
    // Chip de servicio: mismas medidas que ChipCategoria (px-3 py-1.5 rounded-xl)
    chipServicio: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radios.xl,
      backgroundColor: colors.glass05,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    chipServicioSeleccionado: {
      backgroundColor: colors.acentoSuave,
      borderColor: colors.acento,
    },
    chipServicioPresionado: {
      borderColor: colors.borderPressed,
    },
    miniSquircle: {
      width: 20,
      height: 20,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    miniInicial: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      lineHeight: 14,
      color: colors.textoSobreColor,
    },
    chipServicioTexto: {
      ...tipografia.labelPill,
      color: colors.textChip,
      maxWidth: 120,
    },
    chipServicioTextoActivo: {
      fontFamily: fonts.sansSemiBold,
      color: colors.text,
    },
    chipServicioCosto: {
      ...tipografia.labelCaps,
      textTransform: 'none',
      letterSpacing: 0,
      color: colors.textSecondary,
    },
    // Opciones del panel de frecuencia (como el de método de pago)
    opcion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 12,
      paddingHorizontal: espacios.sm,
      borderRadius: radios.xl,
    },
    opcionPresionada: {
      backgroundColor: colors.border,
    },
    opcionTexto: {
      ...tipografia.bodyLg,
      flex: 1,
      color: colors.text,
    },
    inputNombre: {
      ...tipografia.bodyLg,
      height: 48,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      marginBottom: 14,
    },
  });
