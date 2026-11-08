import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import Boton from '../components/Boton';
import ChipSelector from '../components/ChipSelector';
import Etiqueta from '../components/Etiqueta';
import HojaInferior from '../components/HojaInferior';
import Input from '../components/Input';
import SelectorSegmentado from '../components/SelectorSegmentado';
import { useMembresiasService } from '../services/membresias';
import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { mensajeError } from '../utils/errores';
import { fechaLocalISO, parsearFechaLocal } from '../utils/fechas';
import { formatearMonto } from '../utils/formato';
import { vistaLista } from '../utils/estadoCarga';
import { estiloServicio, inicialServicio, validarMembresia } from '../utils/membresias';

const OPCIONES_FRECUENCIA = [
  { valor: 'mensual', etiqueta: 'Mensual' },
  { valor: 'anual', etiqueta: 'Anual' },
];

// Hoja modal para agregar o editar una membresía / suscripción (RF5)
// Soporta seleccionar desde el catálogo de servicios (con costo sugerido) o crear personalizada.
export default function MembresiaScreen({ navigation, route }) {
  const { colors, esOscuro } = useTema();
  const styles = useEstilos(crearEstilos);
  const { listarCatalogo, crearMembresia, actualizarMembresia, eliminarMembresia } =
    useMembresiasService();

  const membresiaEditada = route.params?.membresia;
  const editando = Boolean(membresiaEditada);

  const [nombre, setNombre] = useState(() => membresiaEditada?.nombre ?? '');
  const [costo, setCosto] = useState(() =>
    membresiaEditada?.costo !== undefined ? String(membresiaEditada.costo) : '',
  );
  const [frecuencia, setFrecuencia] = useState(() => membresiaEditada?.frecuencia ?? 'mensual');
  const [fecha, setFecha] = useState(() =>
    membresiaEditada?.fecha_cobro ? parsearFechaLocal(membresiaEditada.fecha_cobro) : new Date(),
  );
  const [servicioId, setServicioId] = useState(() => membresiaEditada?.servicio_id ?? null);

  // Catálogo (solo al agregar): 'cargando' | 'listo' | 'error'. Un error ya no se traga en
  // silencio: se muestra con Reintentar, y una lista vacía dice que no hay servicios (HU-80).
  const [catalogo, setCatalogo] = useState([]);
  const [estadoCatalogo, setEstadoCatalogo] = useState('cargando');
  const [errorCatalogo, setErrorCatalogo] = useState('');
  const [intentoCatalogo, setIntentoCatalogo] = useState(0);
  const [mostrarPickerIos, setMostrarPickerIos] = useState(false);

  const [errores, setErrores] = useState({});
  const [errorApi, setErrorApi] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const enviando = useRef(false);
  const hojaRef = useRef(null);

  const ocupado = guardando || eliminando;

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

  const limpiarError = (campo) => {
    if (errores[campo]) {
      setErrores((prev) => ({ ...prev, [campo]: undefined }));
    }
    if (errorApi) setErrorApi('');
  };

  const seleccionarDelCatalogo = (item) => {
    setServicioId(item.id);
    setNombre(item.nombre);
    setCosto(String(item.costo_sugerido));
    limpiarError('nombre');
    limpiarError('costo');
  };

  const abrirDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: fecha,
        mode: 'date',
        onValueChange: (_evento, nueva) => setFecha(nueva),
      });
    } else {
      setMostrarPickerIos((v) => !v);
    }
  };

  const guardar = async () => {
    if (enviando.current) return;

    const fechaCobroISO = fechaLocalISO(fecha);
    const validacion = validarMembresia({
      nombre,
      costoTexto: costo,
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

  return (
    <HojaInferior
      ref={hojaRef}
      titulo={editando ? 'Editar suscripción' : 'Nueva suscripción'}
      etiquetaFondo={editando ? 'Cerrar editar suscripción' : 'Cerrar nueva suscripción'}
      onCerrada={() => navigation.goBack()}
      bloqueada={ocupado}
    >
      <ScrollView
        contentContainerStyle={styles.formulario}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Catálogo de sugerencias (solo en modo agregar) */}
        {!editando ? (
          <View style={styles.seccionCatalogo}>
            <Etiqueta style={styles.etiquetaCatalogo}>Elegir del catálogo</Etiqueta>
            {vistaCatalogo === 'cargando' ? (
              <View style={styles.estadoCatalogo}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
                <Text style={styles.textoEstado}>Cargando catálogo…</Text>
              </View>
            ) : vistaCatalogo === 'error' ? (
              <View style={styles.estadoCatalogo}>
                <Text style={[styles.textoEstado, styles.textoEstadoFlexible]}>
                  {errorCatalogo}
                </Text>
                <ChipSelector icono="refresh" etiqueta="Reintentar" onPress={reintentarCatalogo} />
              </View>
            ) : vistaCatalogo === 'vacio' ? (
              <Text style={styles.textoEstado}>No hay servicios en el catálogo</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollCatalogo}
              >
                {catalogo.map((item) => {
                  // logo_url no se dibuja (son SVG/PNG remotos que <Image> no siempre carga); el
                  // ícono sale del nombre y, sin ícono propio, se usa la inicial del servicio.
                  const { color, icono, predefinido } = estiloServicio(item.nombre);
                  const seleccionado = servicioId === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => seleccionarDelCatalogo(item)}
                      style={({ pressed }) => [
                        styles.itemCatalogo,
                        seleccionado ? styles.itemCatalogoSeleccionado : null,
                        pressed ? styles.itemCatalogoPresionado : null,
                      ]}
                    >
                      <View style={[styles.iconoCatalogo, { backgroundColor: color }]}>
                        {predefinido ? (
                          <MaterialCommunityIcons
                            name={icono}
                            size={20}
                            color={colors.textoSobreColor}
                          />
                        ) : (
                          <Text style={styles.inicialCatalogo}>{inicialServicio(item.nombre)}</Text>
                        )}
                      </View>
                      <Text style={styles.nombreCatalogo} numberOfLines={1}>
                        {item.nombre}
                      </Text>
                      <Text style={styles.costoCatalogo} numberOfLines={1}>
                        {formatearMonto(item.costo_sugerido)}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        ) : null}

        {/* Campos del formulario */}
        <Input
          etiqueta="NOMBRE DEL SERVICIO"
          icono="card-text-outline"
          placeholder="Ej. Netflix, Spotify, Gimnasio"
          value={nombre}
          onChangeText={(texto) => {
            setNombre(texto);
            limpiarError('nombre');
          }}
          error={errores.nombre}
          autoCapitalize="words"
        />

        <Input
          etiqueta="COSTO"
          icono="currency-usd"
          placeholder="0.00"
          value={costo}
          onChangeText={(texto) => {
            setCosto(texto);
            limpiarError('costo');
          }}
          keyboardType="numeric"
          error={errores.costo}
        />

        <View style={styles.grupoCampo}>
          <Etiqueta>FRECUENCIA DE COBRO</Etiqueta>
          <SelectorSegmentado
            opciones={OPCIONES_FRECUENCIA}
            valor={frecuencia}
            onCambiar={setFrecuencia}
            accessibilityLabel="Frecuencia de cobro"
            style={styles.selectorFrecuencia}
          />
        </View>

        <View style={styles.grupoCampo}>
          <Etiqueta>PRÓXIMA FECHA DE COBRO</Etiqueta>
          <Pressable
            onPress={abrirDatePicker}
            accessibilityRole="button"
            accessibilityLabel="Elegir fecha de cobro"
            style={({ pressed }) => [
              styles.botonFecha,
              pressed ? styles.botonFechaPresionado : null,
            ]}
          >
            <MaterialCommunityIcons name="calendar-outline" size={20} color={colors.outline} />
            <Text style={styles.textoFecha}>{fechaLocalISO(fecha)}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
          </Pressable>
          {errores.fecha ? <Text style={styles.errorTexto}>{errores.fecha}</Text> : null}
        </View>

        {mostrarPickerIos && Platform.OS === 'ios' ? (
          <View style={styles.contenedorPickerIos}>
            <DateTimePicker
              value={fecha}
              mode="date"
              display="spinner"
              onValueChange={(_evento, nueva) => setFecha(nueva)}
              textColor={colors.text}
              themeVariant={esOscuro ? 'dark' : 'light'}
            />
          </View>
        ) : null}

        {errorApi ? <Text style={styles.errorApi}>{errorApi}</Text> : null}

        <View style={styles.botonesAccion}>
          <Boton
            titulo={editando ? 'Guardar cambios' : 'Guardar suscripción'}
            icono="check"
            onPress={guardar}
            cargando={guardando}
            disabled={ocupado}
          />

          {editando ? (
            <Boton
              titulo="Eliminar suscripción"
              icono="delete-outline"
              destructivo
              onPress={confirmarEliminar}
              cargando={eliminando}
              disabled={ocupado}
            />
          ) : null}
        </View>
      </ScrollView>
    </HojaInferior>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    formulario: {
      gap: 16,
      paddingTop: 8,
      paddingBottom: 24,
    },
    seccionCatalogo: {
      gap: 8,
      marginBottom: 4,
    },
    etiquetaCatalogo: {
      marginBottom: 2,
    },
    scrollCatalogo: {
      gap: 10,
      paddingVertical: 4,
    },
    itemCatalogo: {
      width: 100,
      padding: 10,
      borderRadius: radios.xl,
      backgroundColor: colors.surfaceLow,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      gap: 6,
    },
    itemCatalogoSeleccionado: {
      borderColor: colors.acento,
      backgroundColor: colors.surfaceHigh,
    },
    itemCatalogoPresionado: {
      opacity: 0.8,
    },
    iconoCatalogo: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nombreCatalogo: {
      fontFamily: fonts.sansMedium,
      fontSize: 12,
      color: colors.text,
      textAlign: 'center',
    },
    costoCatalogo: {
      fontFamily: fonts.monoMedium,
      fontSize: 11,
      color: colors.textSecondary,
    },
    inicialCatalogo: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      color: colors.textoSobreColor,
    },
    estadoCatalogo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
    },
    textoEstado: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
    },
    textoEstadoFlexible: {
      flex: 1,
    },
    grupoCampo: {
      gap: 6,
    },
    selectorFrecuencia: {
      marginTop: 2,
    },
    botonFecha: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      height: 52,
      borderRadius: radios.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    botonFechaPresionado: {
      backgroundColor: colors.surfaceHigh,
    },
    textoFecha: {
      flex: 1,
      fontFamily: fonts.monoMedium,
      fontSize: 15,
      color: colors.text,
    },
    contenedorPickerIos: {
      backgroundColor: colors.surfaceLow,
      borderRadius: radios.xl,
      overflow: 'hidden',
    },
    errorTexto: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.alerta,
      marginTop: 4,
    },
    errorApi: {
      fontFamily: fonts.sansMedium,
      fontSize: 13,
      color: colors.alerta,
      textAlign: 'center',
      marginTop: 4,
    },
    botonesAccion: {
      gap: 10,
      marginTop: 12,
    },
  });
