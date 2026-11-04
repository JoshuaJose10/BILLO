import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BarraCategorias from '../components/BarraCategorias';
import Boton from '../components/Boton';
import Etiqueta from '../components/Etiqueta';
import FilaDeslizable, { useFilasDeslizables } from '../components/FilaDeslizable';
import FondoDegradado from '../components/FondoDegradado';
import { useAlturaNavbar } from '../components/NavbarFlotante';
import PantallaProximamente from '../components/PantallaProximamente';
import SelectorMes from '../components/SelectorMes';
import SelectorSegmentado from '../components/SelectorSegmentado';
import TarjetaPresupuesto from '../components/TarjetaPresupuesto';
import { usePresupuestosService } from '../services/presupuestos';
import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { mensajeError } from '../utils/errores';
import { mesActual } from '../utils/fechas';
import { formatearMonto, nombreMes } from '../utils/formato';
import { gastoPorCategoriaDePresupuestos, resumenPresupuestos } from '../utils/presupuestos';
import { etiquetaBarraMes, nivelPorcentaje, resumenGastoMes } from '../utils/resumenMes';

// Secciones de Cartera. Suscripciones y Tarjetas aún no existen (badge "Pronto").
const SECCIONES = [
  { valor: 'presupuestos', etiqueta: 'Presupuestos' },
  { valor: 'suscripciones', etiqueta: 'Suscripciones', insignia: 'Pronto' },
  { valor: 'tarjetas', etiqueta: 'Tarjetas', insignia: 'Pronto' },
];

const PROXIMAMENTE = {
  suscripciones: {
    icono: 'calendar-sync-outline',
    titulo: 'Suscripciones',
    mensaje: 'Pronto podrás ver tus suscripciones y su próximo cobro.',
  },
  tarjetas: {
    icono: 'credit-card-outline',
    titulo: 'Tarjetas',
    mensaje: 'Pronto podrás registrar tus tarjetas y ver en qué las usas.',
  },
};

// Fundido corto al cambiar de sección y al aparecer las filas.
const APARECER = FadeIn.duration(180);

// Cartera: selector de secciones (Presupuestos, Suscripciones, Tarjetas; empieza en Presupuestos y
// no se recuerda entre sesiones).
// Presupuestos (RF3): los del mes por categoría con su avance. El estado y el porcentaje de cada
// uno los calcula la API. Tocar un presupuesto lo edita; deslizarlo muestra Editar y Eliminar.
// Crear y editar abren la hoja Presupuesto.
// Parámetros opcionales (los manda el aviso de presupuesto, HU-35): `seccion`, `mes` y `solicitud`
// (marca de tiempo para volver a aplicarlos aunque Cartera ya esté abierta).
export default function CarteraScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const alturaNavbar = useAlturaNavbar();
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const { listarPresupuestos, eliminarPresupuesto } = usePresupuestosService();

  const [seccion, setSeccion] = useState('presupuestos');
  const enPresupuestos = seccion === 'presupuestos';
  const [mes, setMes] = useState(mesActual);
  // Datos de la última respuesta válida y el mes con el que se pidieron.
  const [presupuestos, setPresupuestos] = useState([]);
  const [mesCargado, setMesCargado] = useState(null);
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [textoError, setTextoError] = useState('');
  const [refrescando, setRefrescando] = useState(false);

  // Aplica los parámetros una vez por `solicitud`, durante el render (sin efecto) como recomienda
  // React para ajustar estado a partir de props.
  const { solicitud, seccion: seccionPedida, mes: mesPedido } = route.params ?? {};
  const [solicitudAplicada, setSolicitudAplicada] = useState(null);
  if (solicitud && solicitud !== solicitudAplicada) {
    setSolicitudAplicada(solicitud);
    if (SECCIONES.some((s) => s.valor === seccionPedida)) setSeccion(seccionPedida);
    if (/^\d{4}-\d{2}$/.test(mesPedido ?? '') && mesPedido !== mes) {
      setMes(mesPedido);
      if (estado === 'error') setEstado('cargando');
    }
  }

  // Cada petición recibe un número; si al responder ya hay una más nueva, se descarta.
  const ultimaPeticion = useRef(0);

  const cargar = useCallback(async () => {
    const peticion = ++ultimaPeticion.current;
    try {
      const lista = await listarPresupuestos(mes);
      if (peticion !== ultimaPeticion.current) return;
      setPresupuestos(lista);
      setMesCargado(mes);
      setEstado('listo');
    } catch (error) {
      if (peticion !== ultimaPeticion.current) return;
      setTextoError(mensajeError(error?.code, error?.message));
      setEstado('error');
    }
  }, [listarPresupuestos, mes]);

  // Recarga al ganar foco (un gasto nuevo o un presupuesto editado mueve las barras) y, como
  // `cargar` cambia con el mes, también al cambiar de mes.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const refrescar = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  const cambiarMes = (nuevo) => {
    setMes(nuevo);
    if (estado === 'error') setEstado('cargando');
  };

  const reintentar = () => {
    setEstado('cargando');
    cargar();
  };

  const filas = useFilasDeslizables();
  const crearPresupuesto = () => navigation.navigate('Presupuesto', { mes });
  const editarPresupuesto = (presupuesto) =>
    navigation.navigate('Presupuesto', { mes: presupuesto.mes, presupuesto });
  const presupuestoEliminado = (id) => {
    setPresupuestos((lista) => lista.filter((p) => p.id !== id));
    cargar();
  };

  // Mismo resumen que la tarjeta de Inicio: lo gastado en cada categoría con presupuesto sobre el
  // total presupuestado.
  const resumen = useMemo(
    () =>
      resumenGastoMes(
        gastoPorCategoriaDePresupuestos(presupuestos),
        resumenPresupuestos(presupuestos).limite,
      ),
    [presupuestos],
  );
  const nivel = nivelPorcentaje(resumen.porcentaje);
  const colorPorcentaje =
    nivel === 'alerta'
      ? colors.alerta
      : nivel === 'aviso'
        ? colors.avisoTexto
        : colors.textSecondary;

  const listo = estado === 'listo';
  // Se eligió otro mes y la respuesta aún no llega: la lista anterior se atenúa.
  const cambiandoMes = listo && mesCargado !== mes;
  const atenuado = cambiandoMes ? styles.atenuado : null;
  const nombreDelMes = nombreMes(mesCargado ?? mes);
  const periodo = mes === mesActual() ? 'este mes' : `en ${nombreMes(mes)}`;
  const hayPresupuestos = listo && presupuestos.length > 0;

  const encabezado = (
    <View style={styles.encabezado}>
      <Text style={styles.titulo} accessibilityRole="header">
        Cartera
      </Text>

      <SelectorSegmentado
        opciones={SECCIONES}
        valor={seccion}
        onCambiar={setSeccion}
        accessibilityLabel="Secciones de Cartera"
        style={styles.selectorSecciones}
      />

      {enPresupuestos ? (
        <Animated.View entering={APARECER} style={styles.seccionPresupuestos}>
          <SelectorMes mes={mes} onCambiar={cambiarMes} />

          {hayPresupuestos ? (
            <View style={[styles.resumen, atenuado]}>
              <View style={styles.resumenFila}>
                <Etiqueta style={styles.resumenEtiqueta}>Gastado en {nombreDelMes}</Etiqueta>
                {cambiandoMes ? (
                  <ActivityIndicator size="small" color={colors.textSecondary} />
                ) : null}
              </View>
              <View style={styles.resumenMontos}>
                <Text style={styles.resumenGastado} numberOfLines={1} adjustsFontSizeToFit>
                  {formatearMonto(resumen.gastado)}
                </Text>
                <Text style={styles.resumenLimite} numberOfLines={1}>
                  de {formatearMonto(resumen.presupuesto)}
                </Text>
              </View>
              <View style={styles.resumenBarra}>
                <View style={styles.resumenPista}>
                  <BarraCategorias
                    tramos={resumen.tramos}
                    porcentaje={resumen.porcentaje}
                    etiqueta={etiquetaBarraMes(resumen)}
                  />
                </View>
                <Text style={[styles.resumenPorcentaje, { color: colorPorcentaje }]}>
                  {resumen.porcentaje}%
                </Text>
              </View>
              {resumen.excedente > 0 ? (
                <Text style={styles.resumenExcedido}>
                  Te pasaste por {formatearMonto(resumen.excedente)}
                </Text>
              ) : null}
            </View>
          ) : null}

          {hayPresupuestos ? (
            <Boton titulo="Agregar presupuesto" icono="plus" onPress={crearPresupuesto} compacto />
          ) : null}
        </Animated.View>
      ) : null}
    </View>
  );

  let contenidoVacio;
  if (!enPresupuestos) {
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
  } else if (estado === 'cargando') {
    contenidoVacio = (
      <View style={styles.estado}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  } else if (estado === 'error') {
    contenidoVacio = (
      <View style={styles.estado}>
        <MaterialCommunityIcons name="wifi-off" size={40} color={colors.textSecondary} />
        <Text style={styles.estadoTitulo}>{textoError}</Text>
        <View style={styles.estadoBoton}>
          <Boton titulo="Reintentar" onPress={reintentar} />
        </View>
      </View>
    );
  } else {
    contenidoVacio = (
      <View style={[styles.estado, atenuado]}>
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

  return (
    <View style={styles.pantalla}>
      <FondoDegradado />
      <FlatList
        data={enPresupuestos && listo ? presupuestos : []}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => (
          <Animated.View entering={APARECER} style={atenuado}>
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
        )}
        ItemSeparatorComponent={Separador}
        onScrollBeginDrag={filas.cerrarAbierta}
        ListHeaderComponent={encabezado}
        ListEmptyComponent={contenidoVacio}
        contentContainerStyle={[
          styles.lista,
          { paddingTop: insets.top + 4, paddingBottom: alturaNavbar + 16 },
        ]}
        refreshControl={
          enPresupuestos ? (
            <RefreshControl
              refreshing={refrescando}
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
    // px-margin (20)
    lista: {
      paddingHorizontal: 20,
    },
    // Como Movimientos: gap-space-sm pt-space-xs, y espacio antes de la lista
    encabezado: {
      gap: 12,
      paddingTop: 4,
      marginBottom: 16,
    },
    // headline-lg (28/34, -0.02em) en bold
    titulo: {
      fontFamily: fonts.sansBold,
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.56,
      color: colors.text,
    },
    // Espacio para las insignias "Pronto", que sobresalen 10 px por arriba
    selectorSecciones: {
      marginTop: 8,
    },
    // Selector de mes, resumen y botón de agregar (mismo espaciado que el encabezado)
    seccionPresupuestos: {
      gap: 12,
    },
    // Como el resumen de Movimientos: p-space-md bg-surface-container-low rounded-xl
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
    // financial-metric-lg: JetBrains Mono 600 32/36, -0.02em
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
    // Barra por categorías con el porcentaje a la derecha (como en Inicio)
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
    // gap-2 entre presupuestos
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
