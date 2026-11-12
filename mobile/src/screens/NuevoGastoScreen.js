import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Boton from '../components/Boton';
import BotonMicrofono from '../components/BotonMicrofono';
import ChipCategoria from '../components/ChipCategoria';
import ChipSelector from '../components/ChipSelector';
import EscuchaVoz from '../components/EscuchaVoz';
import HojaInferior from '../components/HojaInferior';
import MontoGrande from '../components/MontoGrande';
import PanelHoja from '../components/PanelHoja';
import TecladoNumerico from '../components/TecladoNumerico';
import { useAvisos } from '../context/AvisosContext';
import { useCategorias, useReintentarCategoriasAlEnfocar } from '../context/CategoriasContext';
import { useDivisasService } from '../services/divisas';
import { METODO_PAGO_DEFECTO, METODOS_PAGO, NOTA_MAX, useGastosService } from '../services/gastos';
import { useDictado } from '../services/reconocimientoVoz';
import { useActualizarWidget } from '../widget/useActualizarWidget';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { contenidoAviso } from '../utils/avisos';
import { MONEDA_DEFECTO, MONEDAS_DISPONIBLES, prepararDatosGasto } from '../utils/divisas';
import { mensajeError } from '../utils/errores';
import { fechaLocalISO, parsearFechaLocal } from '../utils/fechas';
import { fechaRelativa, formatearMonto, LOCALE, resumirTexto } from '../utils/formato';
import { aplicarTecla, montoDesdeTexto, textoDesdeMonto } from '../utils/monto';
import { avisoDictado, interpretarGasto, mensajeFalloVoz } from '../utils/voz';

// Hoja inferior sobre Inicio y las tabs (ruta NuevoGasto con presentation: 'transparentModal').
// El alto lo da el contenido (~65% de la pantalla en un iPhone de 6.1").
// Con `route.params.gasto` (al tocar un movimiento) edita ese gasto: llega completo porque no
// existe GET /gastos/:id. Sin él registra uno nuevo.
export default function NuevoGastoScreen({ navigation, route }) {
  const gastoEditado = route.params?.gasto;
  const editando = !!gastoEditado;
  const { crearGasto, actualizarGasto, eliminarGasto } = useGastosService();
  const actualizarWidgetResumen = useActualizarWidget();
  const {
    categorias,
    estado: estadoCategorias,
    recargar: reintentarCategorias,
    nombrePorId,
  } = useCategorias();
  // Si la primera carga falló (backend apagado, recién iniciada la sesión), se reintenta al enfocar.
  useReintentarCategoriasAlEnfocar();
  const { mostrarAviso } = useAvisos();
  const { colors, esOscuro } = useTema();
  const styles = useEstilos(crearEstilos);

  const { obtenerTipoCambio } = useDivisasService();

  const [moneda, setMoneda] = useState(() => gastoEditado?.moneda || MONEDA_DEFECTO);
  const [tipoCambio, setTipoCambio] = useState(() => gastoEditado?.tipo_cambio ?? null);
  const [cargandoTipoCambio, setCargandoTipoCambio] = useState(false);
  const [avisoTipoCambio, setAvisoTipoCambio] = useState('');

  // Al editar se precargan los datos del gasto; si tiene moneda extranjera, se usa su monto_original.
  const [texto, setTexto] = useState(() => {
    if (!editando) return '';
    const valor =
      gastoEditado.moneda && gastoEditado.moneda !== 'MXN' && gastoEditado.monto_original != null
        ? gastoEditado.monto_original
        : gastoEditado.monto;
    return textoDesdeMonto(valor);
  });
  const [categoriaId, setCategoriaId] = useState(gastoEditado?.categoria_id ?? null);
  const [metodo, setMetodo] = useState(gastoEditado?.metodo_pago || METODO_PAGO_DEFECTO);
  const [fecha, setFecha] = useState(() =>
    editando ? parsearFechaLocal(gastoEditado.fecha) : new Date(),
  );
  const [nota, setNota] = useState(gastoEditado?.nota ?? '');
  const [panel, setPanel] = useState(null); // 'metodo' | 'fecha' | 'nota' | 'moneda'
  // Aviso del dictado por voz (permiso negado, monto no entendido…); la captura manual sigue.
  const [avisoVoz, setAvisoVoz] = useState(null);
  const [errores, setErrores] = useState({});
  const [errorApi, setErrorApi] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  // Guardar y eliminar comparten `enviando`: mientras uno corre, el otro no responde.
  const ocupado = guardando || eliminando;
  const enviando = useRef(false);
  const hojaRef = useRef(null);
  // Aviso de presupuesto (HU-35) que se muestra al terminar de cerrarse la hoja, justo antes de
  // goBack: mientras la hoja está abierta el modal nativo taparía el aviso.
  const avisoPendiente = useRef(null);

  // Las categorías vienen de la caché de la sesión (CategoriasProvider); si fallaron, la fila
  // ofrece Reintentar. Si la categoría del gasto editado ya no existe, queda sin elegir y la
  // validación la pide.
  const categoriaElegida =
    estadoCategorias === 'listo' && !categorias.some((c) => c.id === categoriaId)
      ? null
      : categoriaId;

  const alPulsarTecla = (tecla) => {
    setTexto((actual) => aplicarTecla(actual, tecla));
    if (errores.monto) setErrores((e) => ({ ...e, monto: undefined }));
    if (errorApi) setErrorApi('');
    if (avisoVoz) setAvisoVoz(null);
  };

  const elegirCategoria = (id) => {
    setCategoriaId(id);
    if (errores.categoria) setErrores((e) => ({ ...e, categoria: undefined }));
    if (errorApi) setErrorApi('');
  };

  // Dictado (HU-57, RF12): llena lo que entendió y el usuario revisa y toca Confirmar; nunca
  // guarda solo. Lo que no entendió se queda como estaba.
  const alTerminarDictado = (transcripcion) => {
    const resultado = interpretarGasto(
      transcripcion,
      categorias.map((c) => c.nombre),
    );
    const categoria = resultado.categoria
      ? (categorias.find((c) => c.nombre === resultado.categoria) ?? null)
      : null;
    if (resultado.monto != null) {
      setTexto(textoDesdeMonto(resultado.monto));
      if (errores.monto) setErrores((e) => ({ ...e, monto: undefined }));
    }
    if (categoria) elegirCategoria(categoria.id);
    if (resultado.nota && !nota.trim()) setNota(resultado.nota);
    setErrorApi('');

    const aviso = avisoDictado(transcripcion, { monto: resultado.monto, categoria });
    setAvisoVoz(aviso);
    Haptics.notificationAsync(
      aviso ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success,
    ).catch(() => {});
    const entendido = [
      resultado.monto != null ? `Monto ${formatearMonto(resultado.monto)}` : null,
      categoria ? `categoría ${categoria.nombre}` : null,
    ].filter(Boolean);
    AccessibilityInfo.announceForAccessibility(
      [entendido.join(', '), aviso ?? 'Revisa y confirma el gasto.'].filter(Boolean).join('. '),
    );
  };

  const alFallarDictado = (codigo) => {
    const aviso = mensajeFalloVoz(codigo);
    setAvisoVoz(aviso);
    if (!aviso) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    AccessibilityInfo.announceForAccessibility(aviso);
  };

  const dictado = useDictado({
    onTerminado: alTerminarDictado,
    onFallo: alFallarDictado,
    frases: categorias.map((c) => c.nombre),
  });
  const dictando = dictado.estado !== 'inactivo';

  const dictar = () => {
    setAvisoVoz(null);
    setPanel(null);
    dictado.empezar();
  };

  const abrirFecha = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: fecha,
        mode: 'date',
        maximumDate: new Date(),
        onValueChange: (_evento, nueva) => setFecha(nueva),
      });
    } else {
      setPanel('fecha');
    }
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
      setTipoCambio(resp.tipo_cambio);
      setCargandoTipoCambio(false);
    } catch {
      setCargandoTipoCambio(false);
      setTipoCambio(null);
      setMoneda('MXN');
      setAvisoTipoCambio(
        'Tipo de cambio no disponible en este momento. Puedes continuar capturando en MXN.',
      );
    }
  };

  const confirmar = async () => {
    if (enviando.current || dictando) return;

    const montoNum = montoDesdeTexto(texto);
    const nuevos = {};
    if (!(montoNum > 0)) nuevos.monto = 'Ingresa un monto mayor a $0';
    if (!categoriaElegida) nuevos.categoria = 'Elige una categoría';
    if (moneda !== 'MXN' && !tipoCambio) {
      nuevos.monto = 'Esperando tipo de cambio o cambia a MXN';
    }
    setErrores(nuevos);
    setErrorApi('');
    if (nuevos.monto || nuevos.categoria) return;

    enviando.current = true;
    setGuardando(true);
    const datos = prepararDatosGasto({
      montoOriginal: montoNum,
      moneda,
      tipoCambio,
      categoriaId: categoriaElegida,
      fecha: fechaLocalISO(fecha),
      metodoPago: metodo,
      nota,
    });
    try {
      const { alerta } = editando
        ? await actualizarGasto(gastoEditado.id, datos)
        : await crearGasto(datos);
      // Con alerta, el nombre sale de la caché de categorías; sin alerta, nada.
      const contenido = contenidoAviso(alerta, nombrePorId(alerta?.categoria_id));
      avisoPendiente.current = contenido ? { ...contenido, mes: datos.fecha.slice(0, 7) } : null;
      actualizarWidgetResumen(); // HU-58: sin esperar
      enviando.current = false;
      hojaRef.current?.cerrar();
    } catch (error) {
      enviando.current = false;
      setGuardando(false);
      setErrorApi(mensajeErrorGasto(error));
    }
  };

  const eliminar = async () => {
    if (enviando.current) return;
    enviando.current = true;
    setEliminando(true);
    setErrorApi('');
    try {
      await eliminarGasto(gastoEditado.id);
      actualizarWidgetResumen(); // HU-58: sin esperar
      enviando.current = false;
      hojaRef.current?.cerrar();
    } catch (error) {
      enviando.current = false;
      setEliminando(false);
      setErrorApi(mensajeErrorGasto(error));
    }
  };

  // Cancelar no hace nada; Eliminar borra el gasto y cierra la hoja.
  const confirmarEliminar = () => {
    if (enviando.current) return;
    Alert.alert('¿Eliminar gasto?', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: eliminar },
    ]);
  };

  const metodoActual = METODOS_PAGO.find((m) => m.valor === metodo) || METODOS_PAGO[0];
  const fechaTexto = fechaRelativa(fechaLocalISO(fecha));
  const montoIngresado = montoDesdeTexto(texto);
  const equivalenteMxn =
    moneda !== 'MXN' && tipoCambio && montoIngresado > 0
      ? Number((montoIngresado * tipoCambio).toFixed(2))
      : null;

  return (
    <HojaInferior
      ref={hojaRef}
      titulo={editando ? 'Editar gasto' : 'Nuevo gasto'}
      etiquetaFondo={editando ? 'Cerrar editar gasto' : 'Cerrar nuevo gasto'}
      onCerrada={() => {
        if (avisoPendiente.current) mostrarAviso(avisoPendiente.current);
        avisoPendiente.current = null;
        navigation.goBack();
      }}
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
          icono={metodoActual.icono}
          etiqueta={metodoActual.etiqueta}
          chevron
          onPress={() => setPanel('metodo')}
          accessibilityLabel={`Método de pago: ${metodoActual.etiqueta}`}
        />
        <ChipSelector
          icono="calendar-blank-outline"
          etiqueta={fechaTexto}
          chevron
          onPress={abrirFecha}
          accessibilityLabel={`Fecha: ${fechaTexto}`}
        />
        <ChipSelector
          icono="note-edit-outline"
          etiqueta={nota.trim() ? resumirTexto(nota) : 'Nota'}
          onPress={() => setPanel('nota')}
        />
      </ScrollView>

      <View style={styles.zonaMonto}>
        <MontoGrande
          texto={texto}
          error={!!errores.monto}
          etiqueta={moneda === 'MXN' ? 'Importe' : `Importe en ${moneda}`}
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
      {errores.monto ? <Text style={styles.errorCampo}>{errores.monto}</Text> : null}

      <View style={styles.zonaCategorias}>
        {estadoCategorias === 'cargando' ? (
          <View style={styles.estadoCategorias}>
            <ActivityIndicator color={colors.textSecondary} />
            <Text style={styles.textoEstado}>Cargando categorías…</Text>
          </View>
        ) : estadoCategorias === 'error' ? (
          <View style={styles.estadoCategorias}>
            <Text style={styles.textoEstado}>No se pudieron cargar</Text>
            <ChipSelector icono="refresh" etiqueta="Reintentar" onPress={reintentarCategorias} />
          </View>
        ) : categorias.length === 0 ? (
          <Text style={styles.textoEstado}>No hay categorías disponibles</Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filaScroll}
            contentContainerStyle={styles.filaCategorias}
          >
            {categorias.map((c) => (
              <ChipCategoria
                key={c.id}
                nombre={c.nombre}
                seleccionado={c.id === categoriaElegida}
                error={!!errores.categoria}
                onPress={() => elegirCategoria(c.id)}
              />
            ))}
          </ScrollView>
        )}
      </View>
      {errores.categoria ? <Text style={styles.errorCampo}>{errores.categoria}</Text> : null}

      <View style={styles.zonaTeclado}>
        {dictando ? (
          <EscuchaVoz
            estado={dictado.estado}
            transcripcion={dictado.transcripcion}
            onDetener={dictado.detener}
          />
        ) : (
          <TecladoNumerico onTecla={alPulsarTecla} disabled={ocupado} />
        )}
      </View>

      {avisoVoz ? (
        <View style={styles.avisoVoz} accessibilityRole="alert">
          <MaterialCommunityIcons name="microphone-off" size={16} color={colors.textSecondary} />
          <Text style={styles.avisoVozTexto}>{avisoVoz}</Text>
        </View>
      ) : null}
      {errorApi ? <Text style={styles.errorApi}>{errorApi}</Text> : null}
      <View style={styles.filaConfirmar}>
        {/* Sin el módulo nativo (Expo Go) no hay micrófono: solo la captura manual. */}
        {dictado.disponible && !dictando ? (
          <BotonMicrofono onPress={dictar} disabled={ocupado} />
        ) : null}
        <View style={styles.confirmar}>
          <Boton
            titulo={editando ? 'Guardar cambios' : 'Confirmar gasto'}
            icono={editando ? 'check' : 'arrow-right'}
            onPress={confirmar}
            cargando={guardando}
            disabled={eliminando || dictando}
            compacto
          />
        </View>
      </View>
      {editando ? (
        <View style={styles.zonaEliminar}>
          <Boton
            titulo="Eliminar gasto"
            icono="trash-can-outline"
            onPress={confirmarEliminar}
            cargando={eliminando}
            disabled={guardando}
            destructivo
          />
        </View>
      ) : null}

      {panel === 'metodo' ? (
        <PanelHoja titulo="Método de pago" onCerrar={() => setPanel(null)}>
          {METODOS_PAGO.map((m) => (
            <Pressable
              key={m.valor}
              onPress={() => {
                setMetodo(m.valor);
                setPanel(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: m.valor === metodo }}
              style={({ pressed }) => [styles.opcion, pressed ? styles.opcionPresionada : null]}
            >
              <MaterialCommunityIcons name={m.icono} size={22} color={colors.text} />
              <Text style={styles.opcionTexto}>{m.etiqueta}</Text>
              {m.valor === metodo ? (
                <MaterialCommunityIcons name="check" size={22} color={colors.text} />
              ) : null}
            </Pressable>
          ))}
        </PanelHoja>
      ) : null}

      {panel === 'fecha' ? (
        <PanelHoja titulo="Fecha del gasto" onCerrar={() => setPanel(null)}>
          <DateTimePicker
            value={fecha}
            mode="date"
            display="inline"
            themeVariant={esOscuro ? 'dark' : 'light'}
            accentColor={colors.text}
            maximumDate={new Date()}
            locale={LOCALE}
            onValueChange={(_evento, nueva) => {
              setFecha(nueva);
              setPanel(null);
            }}
          />
        </PanelHoja>
      ) : null}

      {panel === 'nota' ? (
        <PanelHoja titulo="Nota" onCerrar={() => setPanel(null)}>
          <TextInput
            value={nota}
            onChangeText={setNota}
            placeholder="Ej. Tacos con amigos"
            placeholderTextColor={colors.textSecondary}
            cursorColor={colors.acento}
            selectionColor={colors.acento}
            keyboardAppearance={esOscuro ? 'dark' : 'light'}
            maxLength={NOTA_MAX}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => setPanel(null)}
            style={styles.inputNota}
          />
          <Text style={styles.contador}>
            {nota.length}/{NOTA_MAX}
          </Text>
          <Boton titulo="Listo" onPress={() => setPanel(null)} />
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

// El gasto que se edita ya no existe (otro dispositivo lo borró): al cerrar la hoja, Inicio y
// Movimientos recargan la lista con useFocusEffect.
const mensajeErrorGasto = (error) =>
  error?.code === 'GASTO_NO_ENCONTRADO'
    ? 'Este gasto ya no existe. Cierra para actualizar la lista.'
    : mensajeError(error?.code, error?.message);

const crearEstilos = (colors) =>
  StyleSheet.create({
    // Filas con scroll horizontal hasta el borde de la hoja (px-5)
    filaScroll: {
      marginHorizontal: -20,
      flexGrow: 0,
      marginTop: 10,
    },
    // Chips de método/fecha/nota: gap-2
    filaChips: {
      gap: 8,
      paddingHorizontal: 20,
    },
    // Chips de categoría: gap-1.5 py-0.5
    filaCategorias: {
      gap: 6,
      paddingHorizontal: 20,
      paddingVertical: 2,
    },
    // my-2
    zonaMonto: {
      marginTop: 8,
      marginBottom: 8,
    },
    // mb-2
    zonaCategorias: {
      minHeight: 32,
      justifyContent: 'center',
      marginBottom: 8,
    },
    estadoCategorias: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    textoEstado: {
      fontFamily: fonts.sans,
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    errorCampo: {
      fontFamily: fonts.sans,
      color: colors.alertaTexto,
      fontSize: 12,
      lineHeight: 16,
      marginTop: -4,
      marginBottom: 8,
    },
    // gap-2.5 entre teclado y botón
    zonaTeclado: {
      marginBottom: 10,
    },
    // Micrófono a la izquierda de Confirmar (gap-2)
    filaConfirmar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    confirmar: {
      flex: 1,
    },
    avisoVoz: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    avisoVozTexto: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textVariant,
    },
    // Debajo del botón principal
    zonaEliminar: {
      marginTop: 10,
    },
    errorApi: {
      fontFamily: fonts.sans,
      color: colors.alertaTexto,
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 10,
    },
    opcion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
    },
    opcionPresionada: {
      backgroundColor: colors.border,
    },
    opcionTexto: {
      fontFamily: fonts.sans,
      flex: 1,
      color: colors.text,
      fontSize: 16,
    },
    inputNota: {
      fontFamily: fonts.sans,
      height: 48,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      fontSize: 16,
    },
    contador: {
      fontFamily: fonts.sans,
      color: colors.textSecondary,
      fontSize: 12,
      textAlign: 'right',
      marginTop: 6,
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
      borderRadius: 10,
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
      borderRadius: 16,
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
  });
