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
import { guardarUltimoTipoCambio, useDivisasService } from '../services/divisas';
import { useMembresiasService } from '../services/membresias';
import { espacios, radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { tipografia } from '../theme/tipografia';
import {
  calcularEquivalenteMxn,
  MONEDA_DEFECTO,
  MONEDAS_DISPONIBLES,
  prepararDatosMembresia,
} from '../utils/divisas';
import { mensajeError } from '../utils/errores';
import { vistaLista } from '../utils/estadoCarga';
import { fechaLocalISO, parsearFechaLocal } from '../utils/fechas';
import {
  fechaRelativa,
  formatearMonto,
  formatearMontoCorto,
  LOCALE,
  resumirTexto,
} from '../utils/formato';
import {
  detectarServicioRepetido,
  estiloServicio,
  fechaCobroCiclo,
  filtrarCatalogo,
  formatearDiaMes,
  inicialServicio,
  resumenPagosMembresia,
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
  const {
    listarCatalogo,
    listarMembresias,
    crearMembresia,
    actualizarMembresia,
    eliminarMembresia,
    pausarMembresia,
    reactivarMembresia,
    marcarPagada,
    listarPagos,
  } = useMembresiasService();

  const membresiaEditada = route.params?.membresia;
  const editando = Boolean(membresiaEditada);
  const estaPausada = membresiaEditada?.estado === 'pausada';

  const [membresiasExistentes, setMembresiasExistentes] = useState(
    () => route.params?.membresiasExistentes ?? [],
  );

  useEffect(() => {
    let activo = true;
    listarMembresias()
      .then((items) => {
        if (!activo) return;
        setMembresiasExistentes(items || []);
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, [listarMembresias]);

  const { obtenerTipoCambio } = useDivisasService();

  const [moneda, setMoneda] = useState(() => membresiaEditada?.moneda || MONEDA_DEFECTO);
  const [tipoCambio, setTipoCambio] = useState(() => membresiaEditada?.tipo_cambio ?? null);
  const [cargandoTipoCambio, setCargandoTipoCambio] = useState(false);
  const [avisoTipoCambio, setAvisoTipoCambio] = useState('');

  const [nombre, setNombre] = useState(() => membresiaEditada?.nombre ?? '');
  const [texto, setTexto] = useState(() => {
    if (!editando) return '';
    const valor =
      membresiaEditada.moneda &&
      membresiaEditada.moneda !== 'MXN' &&
      membresiaEditada.monto_original != null
        ? membresiaEditada.monto_original
        : membresiaEditada.costo;
    return textoDesdeMonto(valor);
  });
  const [frecuencia, setFrecuencia] = useState(() => membresiaEditada?.frecuencia ?? 'mensual');
  const [fecha, setFecha] = useState(() => {
    const fStr = fechaCobroCiclo(membresiaEditada);
    return fStr ? parsearFechaLocal(fStr) : new Date();
  });
  const [servicioId, setServicioId] = useState(() => membresiaEditada?.servicio_id ?? null);
  const [panel, setPanel] = useState(null); // 'nombre' | 'frecuencia' | 'fecha' | 'moneda'

  // Si editamos una suscripción con moneda extranjera, guardamos su tipo de cambio como último conocido
  useEffect(() => {
    if (membresiaEditada?.moneda && membresiaEditada?.tipo_cambio) {
      guardarUltimoTipoCambio(membresiaEditada.moneda, membresiaEditada.tipo_cambio);
    }
  }, [membresiaEditada]);

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
  const [pausando, setPausando] = useState(false);
  const [marcandoPagada, setMarcandoPagada] = useState(false);
  const [pagos, setPagos] = useState([]);
  const [estadoPagos, setEstadoPagos] = useState(editando ? 'cargando' : 'listo');
  const [errorPagos, setErrorPagos] = useState('');
  const [intentoPagos, setIntentoPagos] = useState(0);
  const enviando = useRef(false);
  const hojaRef = useRef(null);

  const ocupado = guardando || eliminando || pausando || marcandoPagada;

  useEffect(() => {
    if (!editando || !membresiaEditada?.id) return;
    let activo = true;
    listarPagos(membresiaEditada.id)
      .then((items) => {
        if (!activo) return;
        setPagos(items);
        setEstadoPagos('listo');
      })
      .catch((error) => {
        if (!activo) return;
        setErrorPagos(mensajeError(error?.code, error?.message));
        setEstadoPagos('error');
      });

    return () => {
      activo = false;
    };
  }, [editando, membresiaEditada?.id, listarPagos, intentoPagos]);

  const reintentarPagos = () => {
    setErrorPagos('');
    setEstadoPagos('cargando');
    setIntentoPagos((n) => n + 1);
  };

  const resumenPagos = useMemo(() => resumenPagosMembresia(pagos, 5), [pagos]);

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
    setMoneda('MXN');
    setTipoCambio(null);
    setAvisoTipoCambio('');
    limpiarError('nombre', 'costo');
  };

  const seleccionarMoneda = async (codigoMoneda) => {
    setPanel(null);
    if (codigoMoneda === 'MXN') {
      setMoneda('MXN');
      setTipoCambio(null);
      setAvisoTipoCambio('');
      return;
    }

    setMoneda(codigoMoneda);
    setCargandoTipoCambio(true);
    setAvisoTipoCambio('');

    try {
      const resp = await obtenerTipoCambio(codigoMoneda);
      // El servidor acepta máximo 6 decimales en el tipo de cambio
      setTipoCambio(Number(Number(resp.tipo_cambio).toFixed(6)));
      setCargandoTipoCambio(false);
      if (resp.desactualizado) {
        setAvisoTipoCambio('Sin conexión a la fuente: usando el último tipo de cambio conocido.');
      } else {
        setAvisoTipoCambio('');
      }
    } catch {
      setCargandoTipoCambio(false);
      setTipoCambio(null);
      setMoneda('MXN');
      setAvisoTipoCambio(
        'Tipo de cambio no disponible en este momento. Puedes continuar capturando en MXN.',
      );
    }
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

  const guardar = async (forzar = false) => {
    if (enviando.current) return;

    // El teclado deja textos como "12." o "": se validan como número (igual que Nuevo gasto).
    const fechaCobroISO = fechaLocalISO(fecha);
    const validacion = validarMembresia({
      nombre,
      costoTexto: String(montoDesdeTexto(texto)),
      fechaCobro: fechaCobroISO,
    });

    const nuevos = { ...validacion.errores };
    if (moneda !== 'MXN' && !tipoCambio) {
      nuevos.costo = 'Esperando tipo de cambio o cambia a MXN';
    }

    if (!validacion.valido || nuevos.costo) {
      setErrores(nuevos);
      setErrorApi('');
      return;
    }

    const payload = prepararDatosMembresia({
      servicioId,
      nombre: nombre.trim(),
      costoOriginal: validacion.costo,
      moneda,
      tipoCambio,
      frecuencia,
      fechaCobro: fechaCobroISO,
    });

    // Aviso de servicio repetido (HU-74)
    if (!forzar) {
      let listaActual = membresiasExistentes;
      try {
        const frescas = await listarMembresias();
        if (Array.isArray(frescas)) {
          listaActual = frescas;
          setMembresiasExistentes(frescas);
        }
      } catch {
        // En caso de corte de red, usar la lista existente
      }

      const repetido = detectarServicioRepetido(
        payload,
        listaActual,
        editando ? membresiaEditada.id : null,
      );

      if (repetido.repetido) {
        Alert.alert('Servicio repetido', `Ya tienes ${repetido.nombreServicio}, ¿es otro plan?`, [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Guardar de todos modos',
            onPress: () => guardar(true),
          },
        ]);
        return;
      }
    }

    enviando.current = true;
    setGuardando(true);
    setErrorApi('');

    try {
      if (editando) {
        await actualizarMembresia(membresiaEditada.id, payload);
      } else {
        await crearMembresia(payload);
      }
      route.params?.onGuardado?.();
      enviando.current = false;
      hojaRef.current?.cerrar();
    } catch (error) {
      enviando.current = false;
      setGuardando(false);
      setErrorApi(mensajeError(error?.code, error?.message));
    }
  };

  const alternarPausar = async () => {
    if (enviando.current || !editando) return;
    enviando.current = true;
    setPausando(true);
    setErrorApi('');

    try {
      if (estaPausada) {
        await reactivarMembresia(membresiaEditada.id);
      } else {
        await pausarMembresia(membresiaEditada.id);
      }
      enviando.current = false;
      hojaRef.current?.cerrar();
    } catch (error) {
      enviando.current = false;
      setPausando(false);
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
      route.params?.onGuardado?.();
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

  const montoIngresado = montoDesdeTexto(texto);
  const equivalenteMxn =
    moneda !== 'MXN' && tipoCambio && montoIngresado > 0
      ? calcularEquivalenteMxn(montoIngresado, tipoCambio)
      : null;

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
          icono="cash-multiple"
          etiqueta={moneda}
          chevron
          onPress={() => setPanel('moneda')}
          accessibilityLabel={`Moneda: ${moneda}`}
        />
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
        <MontoGrande
          texto={texto}
          error={!!errores.costo}
          etiqueta={moneda === 'MXN' ? 'Costo' : `Costo en ${moneda}`}
          moneda={moneda}
        />
        {cargandoTipoCambio ? (
          <View style={styles.filaEquivalente}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
            <Text style={styles.textoTasa}>Consultando tipo de cambio...</Text>
          </View>
        ) : tipoCambio && montoIngresado > 0 ? (
          <View style={styles.filaEquivalente}>
            <MaterialCommunityIcons name="swap-horizontal" size={16} color={colors.textSecondary} />
            <Text style={styles.textoEquivalente}>≈ {formatearMonto(equivalenteMxn)} MXN</Text>
            <Text style={styles.textoTasa}>
              (1 {moneda} = ${tipoCambio.toFixed(4)} MXN)
            </Text>
          </View>
        ) : tipoCambio ? (
          <View style={styles.filaEquivalente}>
            <Text style={styles.textoTasa}>
              Tipo de cambio: 1 {moneda} = ${tipoCambio.toFixed(4)} MXN
            </Text>
          </View>
        ) : null}
      </View>
      {avisoTipoCambio ? (
        <View style={styles.avisoTipoCambioContenedor}>
          <MaterialCommunityIcons name="information-outline" size={16} color={colors.alerta} />
          <Text style={styles.avisoTipoCambioTexto}>{avisoTipoCambio}</Text>
        </View>
      ) : null}
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
            onPress={() => guardar()}
            cargando={guardando}
            disabled={ocupado}
            compacto
          />
        </>
      )}
      {editando && !buscando ? (
        <View style={styles.zonaHistorial}>
          <View style={styles.historialEncabezado}>
            <Text style={styles.historialTitulo}>Historial de pagos</Text>
            {estadoPagos === 'listo' && resumenPagos.cantidad > 0 ? (
              <Text style={styles.historialTotal}>
                Total {formatearMonto(resumenPagos.totalPagado)}
              </Text>
            ) : null}
          </View>

          {estadoPagos === 'cargando' ? (
            <View style={styles.estadoCatalogo}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
              <Text style={styles.textoEstado}>Cargando pagos…</Text>
            </View>
          ) : null}

          {estadoPagos === 'error' ? (
            <Pressable
              onPress={reintentarPagos}
              style={styles.estadoCatalogo}
              accessibilityRole="button"
              accessibilityLabel="Reintentar carga de historial de pagos"
            >
              <Text style={[styles.textoEstado, styles.textoEstadoFlexible]}>
                {errorPagos || 'No se pudo cargar el historial. Toca para reintentar'}
              </Text>
              <Text style={styles.historialReintentar}>Reintentar</Text>
            </Pressable>
          ) : null}

          {estadoPagos === 'listo' && resumenPagos.cantidad === 0 ? (
            <Text style={styles.textoEstado}>Aún no hay pagos registrados</Text>
          ) : null}

          {estadoPagos === 'listo' && resumenPagos.recientes.length > 0 ? (
            <View style={styles.timelineLista}>
              {resumenPagos.recientes.map((pago, indice) => {
                const esUltimo = indice === resumenPagos.recientes.length - 1;
                return (
                  <View key={pago.id} style={styles.timelineFila}>
                    <View style={styles.timelineEje}>
                      <View
                        style={[
                          styles.timelinePunto,
                          indice === 0 ? styles.timelinePuntoReciente : null,
                        ]}
                      />
                      {!esUltimo ? <View style={styles.timelineLinea} /> : null}
                    </View>
                    <View
                      style={[
                        styles.timelineContenido,
                        !esUltimo ? styles.timelineContenidoEspacio : null,
                      ]}
                    >
                      <Text style={styles.timelineFecha}>{fechaRelativa(pago.fecha)}</Text>
                      <Text style={styles.timelineMonto}>{formatearMonto(pago.monto)}</Text>
                    </View>
                  </View>
                );
              })}
              {resumenPagos.cantidad > resumenPagos.recientes.length ? (
                <Text style={styles.timelineMas}>
                  +{resumenPagos.cantidad - resumenPagos.recientes.length} pagos anteriores
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
      {editando ? (
        <View style={styles.zonaEliminar}>
          <Boton
            titulo={estaPausada ? 'Reactivar suscripción' : 'Pausar suscripción'}
            icono={estaPausada ? 'play-circle-outline' : 'pause-circle-outline'}
            secundario
            onPress={alternarPausar}
            cargando={pausando}
            disabled={ocupado}
          />
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

      {panel === 'moneda' ? (
        <PanelHoja titulo="Moneda" onCerrar={() => setPanel(null)}>
          {MONEDAS_DISPONIBLES.map((m) => (
            <Pressable
              key={m.codigo}
              onPress={() => seleccionarMoneda(m.codigo)}
              accessibilityRole="button"
              accessibilityState={{ selected: m.codigo === moneda }}
              style={({ pressed }) => [styles.opcion, pressed ? styles.opcionPresionada : null]}
            >
              <View style={styles.simboloMonedaContenedor}>
                <Text style={styles.simboloMonedaTexto}>{m.simbolo}</Text>
              </View>
              <View style={styles.monedaInfoColumna}>
                <Text style={styles.opcionTexto}>{m.codigo}</Text>
                <Text style={styles.nombreMonedaSubtexto}>{m.nombre}</Text>
              </View>
              {m.codigo === moneda ? (
                <MaterialCommunityIcons name="check" size={22} color={colors.text} />
              ) : null}
            </Pressable>
          ))}
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
    filaEquivalente: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 8,
      flexWrap: 'wrap',
    },
    textoEquivalente: {
      fontFamily: fonts.monoMedium,
      fontSize: 14,
      color: colors.text,
    },
    textoTasa: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
    },
    avisoTipoCambioContenedor: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceLow,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radios.xl,
      marginBottom: 8,
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avisoTipoCambioTexto: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      flex: 1,
    },
    simboloMonedaContenedor: {
      width: 32,
      height: 32,
      borderRadius: radios.full,
      backgroundColor: colors.surfaceLow,
      alignItems: 'center',
      justifyContent: 'center',
    },
    simboloMonedaTexto: {
      fontFamily: fonts.monoMedium,
      fontSize: 14,
      color: colors.text,
    },
    monedaInfoColumna: {
      flex: 1,
    },
    nombreMonedaSubtexto: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
    },
    zonaHistorial: {
      marginTop: 14,
      padding: 12,
      borderRadius: radios.lg,
      backgroundColor: colors.surfaceLow,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    historialEncabezado: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    historialTitulo: {
      ...tipografia.labelCaps,
      color: colors.textSecondary,
    },
    historialTotal: {
      ...tipografia.bodySm,
      fontFamily: fonts.monoMedium,
      color: colors.exitoTexto,
    },
    historialReintentar: {
      ...tipografia.labelPill,
      color: colors.acento,
    },
    timelineLista: {
      gap: 0,
    },
    timelineFila: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 10,
    },
    timelineEje: {
      width: 12,
      alignItems: 'center',
    },
    timelinePunto: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 5,
      backgroundColor: colors.borderStrong,
    },
    timelinePuntoReciente: {
      backgroundColor: colors.exito,
    },
    timelineLinea: {
      width: 1.5,
      flex: 1,
      minHeight: 14,
      marginTop: 3,
      backgroundColor: colors.border,
    },
    timelineContenido: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    timelineContenidoEspacio: {
      paddingBottom: 10,
    },
    timelineFecha: {
      ...tipografia.bodyMd,
      color: colors.textSecondary,
    },
    timelineMonto: {
      ...tipografia.bodyMd,
      fontFamily: fonts.monoMedium,
      color: colors.text,
    },
    timelineMas: {
      ...tipografia.bodySm,
      color: colors.textSecondary,
      marginTop: 4,
    },
  });
