import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BarraCategorias from '../components/BarraCategorias';
import Boton from '../components/Boton';
import Etiqueta from '../components/Etiqueta';
import FilaDeslizable, { useFilasDeslizables } from '../components/FilaDeslizable';
import FondoDegradado from '../components/FondoDegradado';
import ItemMembresia from '../components/ItemMembresia';
import { useAlturaNavbar } from '../components/NavbarFlotante';
import PantallaProximamente from '../components/PantallaProximamente';
import SelectorMes from '../components/SelectorMes';
import SelectorSegmentado from '../components/SelectorSegmentado';
import TarjetaPresupuesto from '../components/TarjetaPresupuesto';
import { useMembresiasService } from '../services/membresias';
import { usePresupuestosService } from '../services/presupuestos';
import { espacios, radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { tipografia } from '../theme/tipografia';
import { mensajeError } from '../utils/errores';
import { mesActual } from '../utils/fechas';
import { formatearMonto, nombreMes } from '../utils/formato';
import { calcularTotalMensual, formatearDiaMes, tramosSuscripciones } from '../utils/membresias';
import { gastoPorCategoriaDePresupuestos, resumenPresupuestos } from '../utils/presupuestos';
import { etiquetaBarraMes, nivelPorcentaje, resumenGastoMes } from '../utils/resumenMes';

// Secciones de Cartera. Presupuestos (RF3), Suscripciones / Membresías (RF5) y Tarjetas (pronto).
const SECCIONES = [
  { valor: 'presupuestos', etiqueta: 'Presupuestos' },
  { valor: 'suscripciones', etiqueta: 'Suscripciones' },
  { valor: 'tarjetas', etiqueta: 'Tarjetas', insignia: 'Pronto' },
];

const PROXIMAMENTE = {
  tarjetas: {
    icono: 'credit-card-outline',
    titulo: 'Tarjetas',
    mensaje: 'Pronto podrás registrar tus tarjetas y ver en qué las usas.',
  },
};

// Fundido corto al cambiar de sección y al aparecer las filas.
const APARECER = FadeIn.duration(180);
// Botón píldora del encabezado: el texto entra con fundido, el ancho se ajusta con una transición
// lineal y en "Próximamente" se va con fundido. Con "Reducir movimiento" no se anima.
const TEXTO_BOTON = FadeIn.duration(180);
const SALIR_BOTON = FadeOut.duration(150);
const ANCHO_BOTON = LinearTransition.duration(220);

// Parámetros opcionales (los manda el aviso de presupuesto, HU-35): `seccion`, `mes` y `solicitud`
// (marca de tiempo para volver a aplicarlos aunque Cartera ya esté abierta).
export default function CarteraScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const alturaNavbar = useAlturaNavbar();
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const reducirMovimiento = useReducedMotion();
  const { listarPresupuestos, eliminarPresupuesto } = usePresupuestosService();
  const { listarMembresias, eliminarMembresia } = useMembresiasService();

  const [seccion, setSeccion] = useState('presupuestos');
  const enPresupuestos = seccion === 'presupuestos';
  const enSuscripciones = seccion === 'suscripciones';

  // --- Estado de Presupuestos ---
  const [mes, setMes] = useState(mesActual);
  const [presupuestos, setPresupuestos] = useState([]);
  const [mesCargado, setMesCargado] = useState(null);
  const [estadoPresupuestos, setEstadoPresupuestos] = useState('cargando');
  const [textoErrorPresupuestos, setTextoErrorPresupuestos] = useState('');
  const [refrescandoPresupuestos, setRefrescandoPresupuestos] = useState(false);
  const ultimaPeticionPresupuestos = useRef(0);

  // --- Estado de Membresías / Suscripciones ---
  const [membresias, setMembresias] = useState([]);
  const [estadoMembresias, setEstadoMembresias] = useState('cargando');
  const [textoErrorMembresias, setTextoErrorMembresias] = useState('');
  const [refrescandoMembresias, setRefrescandoMembresias] = useState(false);
  const ultimaPeticionMembresias = useRef(0);

  // Aplica los parámetros una vez por `solicitud`, durante el render (sin efecto) como recomienda
  // React para ajustar estado a partir de props.
  const { solicitud, seccion: seccionPedida, mes: mesPedido } = route?.params ?? {};
  const [solicitudAplicada, setSolicitudAplicada] = useState(null);
  if (solicitud && solicitud !== solicitudAplicada) {
    setSolicitudAplicada(solicitud);
    if (SECCIONES.some((s) => s.valor === seccionPedida)) setSeccion(seccionPedida);
    if (/^\d{4}-\d{2}$/.test(mesPedido ?? '') && mesPedido !== mes) {
      setMes(mesPedido);
      if (estadoPresupuestos === 'error') setEstadoPresupuestos('cargando');
    }
  }

  const cargarPresupuestos = useCallback(async () => {
    const peticion = ++ultimaPeticionPresupuestos.current;
    try {
      const lista = await listarPresupuestos(mes);
      if (peticion !== ultimaPeticionPresupuestos.current) return;
      setPresupuestos(lista);
      setMesCargado(mes);
      setEstadoPresupuestos('listo');
    } catch (error) {
      if (peticion !== ultimaPeticionPresupuestos.current) return;
      setTextoErrorPresupuestos(mensajeError(error?.code, error?.message));
      setEstadoPresupuestos('error');
    }
  }, [listarPresupuestos, mes]);

  const cargarMembresias = useCallback(async () => {
    const peticion = ++ultimaPeticionMembresias.current;
    try {
      const lista = await listarMembresias();
      if (peticion !== ultimaPeticionMembresias.current) return;
      setMembresias(lista);
      setEstadoMembresias('listo');
    } catch (error) {
      if (peticion !== ultimaPeticionMembresias.current) return;
      setTextoErrorMembresias(mensajeError(error?.code, error?.message));
      setEstadoMembresias('error');
    }
  }, [listarMembresias]);

  useFocusEffect(
    useCallback(() => {
      if (enPresupuestos) {
        cargarPresupuestos();
      } else if (enSuscripciones) {
        cargarMembresias();
      }
    }, [enPresupuestos, enSuscripciones, cargarPresupuestos, cargarMembresias]),
  );

  const cambiarSeccion = (nueva) => {
    setSeccion(nueva);
    if (nueva === 'suscripciones' && estadoMembresias === 'cargando') {
      cargarMembresias();
    }
  };

  const refrescar = async () => {
    if (enPresupuestos) {
      setRefrescandoPresupuestos(true);
      await cargarPresupuestos();
      setRefrescandoPresupuestos(false);
    } else if (enSuscripciones) {
      setRefrescandoMembresias(true);
      await cargarMembresias();
      setRefrescandoMembresias(false);
    }
  };

  const cambiarMes = (nuevo) => {
    setMes(nuevo);
    if (estadoPresupuestos === 'error') setEstadoPresupuestos('cargando');
  };

  const reintentar = () => {
    if (enPresupuestos) {
      setEstadoPresupuestos('cargando');
      cargarPresupuestos();
    } else if (enSuscripciones) {
      setEstadoMembresias('cargando');
      cargarMembresias();
    }
  };

  const filas = useFilasDeslizables();

  // Handlers para Presupuestos
  const crearPresupuesto = () => navigation.navigate('Presupuesto', { mes });
  const editarPresupuesto = (p) =>
    navigation.navigate('Presupuesto', { mes: p.mes, presupuesto: p });
  const presupuestoEliminado = (id) => {
    setPresupuestos((lista) => lista.filter((p) => p.id !== id));
    cargarPresupuestos();
  };

  // Handlers para Suscripciones
  const crearMembresia = () => navigation.navigate('Membresia');
  const editarMembresia = (m) => navigation.navigate('Membresia', { membresia: m });
  const membresiaEliminada = (id) => {
    setMembresias((lista) => lista.filter((m) => m.id !== id));
    cargarMembresias();
  };

  // Resumen de Presupuestos
  const resumenP = useMemo(
    () =>
      resumenGastoMes(
        gastoPorCategoriaDePresupuestos(presupuestos),
        resumenPresupuestos(presupuestos).limite,
      ),
    [presupuestos],
  );
  const nivelP = nivelPorcentaje(resumenP.porcentaje);
  const colorPorcentajeP =
    nivelP === 'alerta'
      ? colors.alerta
      : nivelP === 'aviso'
        ? colors.avisoTexto
        : colors.textSecondary;

  const listoPresupuestos = estadoPresupuestos === 'listo';
  const cambiandoMes = listoPresupuestos && mesCargado !== mes;
  const atenuadoP = cambiandoMes ? styles.atenuado : null;
  const nombreDelMes = nombreMes(mesCargado ?? mes);
  const periodo = mes === mesActual() ? 'este mes' : `en ${nombreMes(mes)}`;
  const hayPresupuestos = listoPresupuestos && presupuestos.length > 0;

  // Resumen de Suscripciones
  const totalMensualSuscripciones = useMemo(() => calcularTotalMensual(membresias), [membresias]);
  const tramosSubs = useMemo(() => tramosSuscripciones(membresias), [membresias]);
  const listaMembresiasLista = estadoMembresias === 'listo';
  const hayMembresias = listaMembresiasLista && membresias.length > 0;
  const proximaMembresia = hayMembresias ? membresias[0] : null;

  // Acción del botón píldora según la sección; null en "Próximamente" (se oculta).
  const accionEncabezado = enPresupuestos
    ? { texto: 'Nuevo', etiqueta: 'Nuevo presupuesto', onPress: crearPresupuesto }
    : enSuscripciones
      ? { texto: 'Agregar', etiqueta: 'Agregar suscripción', onPress: crearMembresia }
      : null;
  const animar = (animacion) => (reducirMovimiento ? undefined : animacion);

  const subtituloCartera = enSuscripciones
    ? 'Gestión de cobros recurrentes'
    : 'Límites de gasto y control mensual';

  const encabezado = (
    <View style={styles.encabezado}>
      {/* Fila 1: título y botón, centrados en una fila de alto fijo (el del título), así el
          botón no se mueve al cambiar el subtítulo ni al ocultarse en "Próximamente". */}
      <View style={styles.cabeceraBarra}>
        <Text style={styles.titulo} accessibilityRole="header">
          Cartera
        </Text>

        {/* La píldora lleva el fondo y anima su ancho; el Pressable va dentro (el texto nuevo
            entra con fundido gracias a `key`). */}
        {accionEncabezado ? (
          <Animated.View
            entering={animar(TEXTO_BOTON)}
            exiting={animar(SALIR_BOTON)}
            layout={animar(ANCHO_BOTON)}
            style={styles.botonAgregarTop}
          >
            <Pressable
              style={({ pressed }) => [
                styles.botonAgregarContenido,
                pressed ? styles.botonAgregarTopPresionado : null,
              ]}
              onPress={accionEncabezado.onPress}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={accionEncabezado.etiqueta}
            >
              <MaterialCommunityIcons name="plus" size={17} color={colors.text} />
              <Animated.Text
                key={accionEncabezado.texto}
                entering={animar(TEXTO_BOTON)}
                style={styles.textoBotonAgregarTop}
              >
                {accionEncabezado.texto}
              </Animated.Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>

      {/* Fila 2: subtítulo a todo el ancho, una línea y alto fijo; cambia con fundido corto. */}
      <View style={styles.filaSubtitulo}>
        <Animated.Text
          key={subtituloCartera}
          entering={animar(TEXTO_BOTON)}
          style={styles.subtitulo}
          numberOfLines={1}
        >
          {subtituloCartera}
        </Animated.Text>
      </View>

      <SelectorSegmentado
        opciones={SECCIONES}
        valor={seccion}
        onCambiar={cambiarSeccion}
        accessibilityLabel="Secciones de Cartera"
        style={styles.selectorSecciones}
      />

      {/* Sección Presupuestos */}
      {enPresupuestos ? (
        <Animated.View entering={APARECER} style={styles.seccionPresupuestos}>
          <SelectorMes mes={mes} onCambiar={cambiarMes} />

          {hayPresupuestos ? (
            <View style={[styles.resumen, atenuadoP]}>
              <View style={styles.resumenFila}>
                <Etiqueta style={styles.resumenEtiqueta}>Gastado en {nombreDelMes}</Etiqueta>
                {cambiandoMes ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : null}
              </View>
              <View style={styles.resumenMontos}>
                <Text style={styles.resumenGastado} numberOfLines={1} adjustsFontSizeToFit>
                  {formatearMonto(resumenP.gastado)}
                </Text>
                <Text style={styles.resumenLimite} numberOfLines={1}>
                  de {formatearMonto(resumenP.presupuesto)}
                </Text>
              </View>
              <View style={styles.resumenBarra}>
                <View style={styles.resumenPista}>
                  <BarraCategorias
                    tramos={resumenP.tramos}
                    porcentaje={resumenP.porcentaje}
                    etiqueta={etiquetaBarraMes(resumenP)}
                  />
                </View>
                <Text style={[styles.resumenPorcentaje, { color: colorPorcentajeP }]}>
                  {resumenP.porcentaje}%
                </Text>
              </View>
              {resumenP.excedente > 0 ? (
                <Text style={styles.resumenExcedido}>
                  Te pasaste por {formatearMonto(resumenP.excedente)}
                </Text>
              ) : null}
            </View>
          ) : null}
        </Animated.View>
      ) : null}

      {/* Sección Suscripciones: Tarjeta de Resumen Hero */}
      {enSuscripciones && hayMembresias ? (
        <Animated.View entering={APARECER} style={styles.seccionSuscripciones}>
          <View style={styles.tarjetaResumenSubs}>
            <View style={styles.resumenFila}>
              <Etiqueta style={styles.resumenEtiqueta}>TOTAL MENSUAL</Etiqueta>
              <View style={styles.pildoraMesActual}>
                <View style={styles.puntoMesVerde} />
                <Text style={styles.textoMesActual}>{nombreMes(mesActual()).toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.resumenMontosSubs}>
              <Text style={styles.resumenTotalSubs} numberOfLines={1} adjustsFontSizeToFit>
                {formatearMonto(totalMensualSuscripciones)}
              </Text>
              <Text style={styles.resumenMonedaSubs}>MXN / mes</Text>
            </View>

            {tramosSubs.length > 0 ? (
              <BarraCategorias
                tramos={tramosSubs}
                etiqueta={`Reparto del total mensual: ${tramosSubs.map((t) => t.nombre).join(', ')}`}
              />
            ) : null}

            <View style={styles.resumenDetalleFila}>
              <MaterialCommunityIcons
                name="calendar-blank-outline"
                size={14}
                color={colors.textSecondary}
              />
              <Text style={styles.resumenDetalleSubs} numberOfLines={2}>
                <Text style={styles.resumenDetalleFuerte}>
                  {membresias.length}{' '}
                  {membresias.length === 1 ? 'suscripción activa' : 'suscripciones activas'}
                </Text>
                {proximaMembresia
                  ? ` · Próximo cobro el ${formatearDiaMes(proximaMembresia.fecha_cobro)}`
                  : ''}
              </Text>
            </View>
          </View>

          <View style={styles.cabeceraListaSubs}>
            <Etiqueta>SUSCRIPCIONES ACTIVAS</Etiqueta>
            <Text style={styles.contadorServicios}>
              {membresias.length} {membresias.length === 1 ? 'SERVICIO' : 'SERVICIOS'}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );

  let contenidoVacio;
  if (!enPresupuestos && !enSuscripciones) {
    const proximamente = PROXIMAMENTE[seccion];
    contenidoVacio = (
      <Animated.View key={seccion} entering={APARECER}>
        <PantallaProximamente
          icono={proximamente.icono}
          titulo={proximamente.titulo}
          mensaje={proximamente.mensaje}
          incrustada
        />
      </Animated.View>
    );
  } else if (enPresupuestos) {
    if (estadoPresupuestos === 'cargando') {
      contenidoVacio = (
        <View style={styles.estado}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      );
    } else if (estadoPresupuestos === 'error') {
      contenidoVacio = (
        <View style={styles.estado}>
          <MaterialCommunityIcons name="wifi-off" size={40} color={colors.textSecondary} />
          <Text style={styles.estadoTitulo}>{textoErrorPresupuestos}</Text>
          <View style={styles.estadoBoton}>
            <Boton titulo="Reintentar" onPress={reintentar} />
          </View>
        </View>
      );
    } else {
      contenidoVacio = (
        <View style={[styles.estado, atenuadoP]}>
          <MaterialCommunityIcons name="wallet-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.estadoTitulo}>Sin presupuestos {periodo}</Text>
          <Text style={styles.estadoTexto}>
            Ponle un límite a cada categoría y ve cuánto llevas gastado.
          </Text>
          <View style={styles.estadoBoton}>
            <Boton titulo="Crear tu primer presupuesto" icono="plus" onPress={crearPresupuesto} />
          </View>
        </View>
      );
    }
  } else {
    // enSuscripciones
    if (estadoMembresias === 'cargando') {
      contenidoVacio = (
        <View style={styles.estado}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      );
    } else if (estadoMembresias === 'error') {
      contenidoVacio = (
        <View style={styles.estado}>
          <MaterialCommunityIcons name="wifi-off" size={40} color={colors.textSecondary} />
          <Text style={styles.estadoTitulo}>{textoErrorMembresias}</Text>
          <View style={styles.estadoBoton}>
            <Boton titulo="Reintentar" onPress={reintentar} />
          </View>
        </View>
      );
    } else {
      contenidoVacio = (
        <View style={styles.estado}>
          <MaterialCommunityIcons
            name="calendar-sync-outline"
            size={40}
            color={colors.textSecondary}
          />
          <Text style={styles.estadoTitulo}>Sin suscripciones registradas</Text>
          <Text style={styles.estadoTexto}>
            Agrega tus suscripciones para controlar tus cobros recurrentes y fechas de pago.
          </Text>
          <View style={styles.estadoBoton}>
            <Boton titulo="Agregar tu primera suscripción" icono="plus" onPress={crearMembresia} />
          </View>
        </View>
      );
    }
  }

  // Lista de datos según la sección
  const datosLista = enPresupuestos
    ? listoPresupuestos
      ? presupuestos
      : []
    : enSuscripciones
      ? listaMembresiasLista
        ? membresias
        : []
      : [];

  return (
    <View style={styles.pantalla}>
      <FondoDegradado />
      <FlatList
        data={datosLista}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          if (enPresupuestos) {
            return (
              <Animated.View entering={APARECER} style={atenuadoP}>
                <FilaDeslizable
                  filas={filas}
                  onEditar={() => editarPresupuesto(item)}
                  eliminar={() => eliminarPresupuesto(item.id)}
                  onEliminado={() => presupuestoEliminado(item.id)}
                  tituloEliminar={`¿Eliminar el presupuesto de ${item.categoria}?`}
                  codigoNoExiste="PRESUPUESTO_NO_ENCONTRADO"
                  mensajeNoExiste="Este presupuesto ya no existe"
                >
                  <TarjetaPresupuesto presupuesto={item} />
                </FilaDeslizable>
              </Animated.View>
            );
          }
          if (enSuscripciones) {
            return (
              <Animated.View entering={APARECER}>
                <FilaDeslizable
                  filas={filas}
                  onEditar={() => editarMembresia(item)}
                  eliminar={() => eliminarMembresia(item.id)}
                  onEliminado={() => membresiaEliminada(item.id)}
                  tituloEliminar={`¿Eliminar la suscripción a ${item.nombre}?`}
                  codigoNoExiste="MEMBRESIA_NO_ENCONTRADA"
                  mensajeNoExiste="Esta suscripción ya no existe"
                >
                  <Pressable
                    onPress={() => editarMembresia(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar suscripción ${item.nombre}`}
                  >
                    <ItemMembresia membresia={item} opaca />
                  </Pressable>
                </FilaDeslizable>
              </Animated.View>
            );
          }
          return null;
        }}
        ItemSeparatorComponent={Separador}
        onScrollBeginDrag={filas.cerrarAbierta}
        ListHeaderComponent={encabezado}
        ListEmptyComponent={contenidoVacio}
        contentContainerStyle={[
          styles.lista,
          { paddingTop: insets.top + 4, paddingBottom: alturaNavbar + 16 },
        ]}
        refreshControl={
          enPresupuestos || enSuscripciones ? (
            <RefreshControl
              refreshing={enPresupuestos ? refrescandoPresupuestos : refrescandoMembresias}
              onRefresh={refrescar}
              tintColor={colors.text}
            />
          ) : undefined
        }
      />
    </View>
  );
}

function Separador() {
  const styles = useEstilos(crearEstilos);
  return <View style={styles.separador} />;
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    pantalla: {
      flex: 1,
      backgroundColor: colors.background,
    },
    lista: {
      paddingHorizontal: 20,
    },
    encabezado: {
      gap: espacios.sm + 4,
      paddingTop: espacios.xs,
      marginBottom: espacios.md,
    },
    // Alto fijo = lineHeight del título; el botón (~33 px) se centra dentro.
    cabeceraBarra: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: espacios.sm + 4,
      height: tipografia.headlineLg.lineHeight,
    },
    titulo: {
      ...tipografia.headlineLg,
      flexShrink: 1,
      color: colors.text,
    },
    // El encabezado separa sus filas con gap 12; el subtítulo va pegado al título (2 px).
    filaSubtitulo: {
      height: tipografia.bodyMd.lineHeight,
      marginTop: -(espacios.sm + 2),
      justifyContent: 'center',
    },
    subtitulo: {
      ...tipografia.bodyMd,
      color: colors.textSecondary,
    },
    // Píldora "+ Agregar" de Stitch: fondo, borde y radio; overflow oculto para que el texto no se
    // salga mientras el ancho se anima.
    botonAgregarTop: {
      borderRadius: radios.full,
      backgroundColor: colors.surfaceHigh,
      borderWidth: 1,
      borderColor: colors.borderTopStrong,
      overflow: 'hidden',
    },
    botonAgregarContenido: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    botonAgregarTopPresionado: {
      backgroundColor: colors.surfaceHighest,
    },
    textoBotonAgregarTop: {
      ...tipografia.labelPill,
      fontSize: 13,
      color: colors.text,
    },
    selectorSecciones: {
      marginTop: espacios.xs,
    },
    seccionPresupuestos: {
      gap: espacios.sm + 4,
    },
    seccionSuscripciones: {
      gap: espacios.md,
      marginTop: espacios.xs,
    },
    // Misma tarjeta que el resumen de Movimientos (fondo, brillo superior, radio y sombra)
    tarjetaResumenSubs: {
      padding: espacios.md,
      borderRadius: radios.xl,
      borderTopWidth: 1,
      borderTopColor: colors.borderTop,
      backgroundColor: colors.surfaceLow,
      shadowColor: colors.sombra,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 12,
      shadowOpacity: 0.5,
      elevation: 6,
      gap: espacios.sm + 4,
    },
    pildoraMesActual: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 9999,
      backgroundColor: colors.glass05,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    puntoMesVerde: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.cobroProximo,
    },
    textoMesActual: {
      ...tipografia.labelCaps,
      fontSize: 10,
      color: colors.textSecondary,
    },
    resumenMontosSubs: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: espacios.sm,
    },
    resumenTotalSubs: {
      ...tipografia.financialMetricLg,
      flexShrink: 1,
      color: colors.text,
    },
    resumenMonedaSubs: {
      ...tipografia.bodyMd,
      color: colors.textSecondary,
    },
    resumenDetalleFila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    resumenDetalleSubs: {
      ...tipografia.bodySm,
      flex: 1,
      color: colors.textSecondary,
    },
    resumenDetalleFuerte: {
      fontFamily: fonts.sansSemiBold,
      color: colors.text,
    },
    cabeceraListaSubs: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
      paddingTop: espacios.xs,
    },
    contadorServicios: {
      ...tipografia.labelCaps,
      color: colors.textVariant,
    },
    resumen: {
      padding: 16,
      borderRadius: radios.xl,
      borderTopWidth: 1,
      borderTopColor: colors.borderTop,
      backgroundColor: colors.surfaceLow,
      shadowColor: colors.sombra,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 12,
      shadowOpacity: 0.5,
      elevation: 6,
    },
    resumenFila: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    resumenEtiqueta: {
      color: colors.outline,
    },
    resumenMontos: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
      marginTop: 6,
    },
    resumenGastado: {
      fontFamily: fonts.monoSemiBold,
      flexShrink: 1,
      fontSize: 32,
      lineHeight: 36,
      letterSpacing: -0.64,
      color: colors.text,
    },
    resumenLimite: {
      fontFamily: fonts.monoMedium,
      fontSize: 14,
      color: colors.textVariant,
    },
    resumenBarra: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 14,
    },
    resumenPista: {
      flex: 1,
    },
    resumenPorcentaje: {
      fontFamily: fonts.monoMedium,
      fontSize: 12,
      minWidth: 32,
      textAlign: 'right',
    },
    resumenExcedido: {
      fontFamily: fonts.sansMedium,
      fontSize: 12,
      lineHeight: 16,
      color: colors.alerta,
      marginTop: 8,
    },
    separador: {
      height: 8,
    },
    atenuado: {
      opacity: 0.45,
    },
    estado: {
      alignItems: 'center',
      gap: 10,
      paddingVertical: 48,
      paddingHorizontal: 12,
    },
    estadoTitulo: {
      fontFamily: fonts.sansSemiBold,
      color: colors.text,
      fontSize: 18,
      lineHeight: 24,
      textAlign: 'center',
      marginTop: 8,
    },
    estadoTexto: {
      fontFamily: fonts.sans,
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    estadoBoton: {
      alignSelf: 'stretch',
      marginTop: 12,
    },
  });
