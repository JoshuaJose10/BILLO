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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Avatar from '../components/Avatar';
import Boton from '../components/Boton';
import Etiqueta from '../components/Etiqueta';
import FilaDeslizable, { useFilasDeslizables } from '../components/FilaDeslizable';
import FondoDegradado from '../components/FondoDegradado';
import ItemGasto from '../components/ItemGasto';
import { useAlturaNavbar } from '../components/NavbarFlotante';
import TarjetaCobrosSemana from '../components/TarjetaCobrosSemana';
import TarjetaPresupuesto, { NOMBRE_ESTADO } from '../components/TarjetaPresupuesto';
import TarjetaProximoCobro from '../components/TarjetaProximoCobro';
import TarjetaResumen from '../components/TarjetaResumen';
import TarjetaSaldo from '../components/TarjetaSaldo';
import { useAuth } from '../context/AuthContext';
import { useCategorias, useReintentarCategoriasAlEnfocar } from '../context/CategoriasContext';
import { useGastosService } from '../services/gastos';
import { useMembresiasService } from '../services/membresias';
import { usePresupuestosService } from '../services/presupuestos';
import { useReportesService } from '../services/reportes';
import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { cobrosDeLaSemana } from '../utils/cobrosSemana';
import { mensajeError } from '../utils/errores';
import { mesActual } from '../utils/fechas';
import { cargarDatosInicio, MOVIMIENTOS_RECIENTES } from '../utils/inicio';
import { proximoCobro } from '../utils/membresias';
import { presupuestosEnRiesgo, resumenPresupuestos } from '../utils/presupuestos';
import { gastoPorCategoria, resumenGastoMes } from '../utils/resumenMes';
import { actualizarWidget } from '../widget/sincronizar';

// Categorías con chip en la tarjeta del mes (las de más gasto).
const CHIPS_CATEGORIA = 3;

// Inicio (RF6, HU-39) con datos del servidor. Al abrir o ganar foco hace exactamente 4 peticiones
// en paralelo, todas del mes actual (cargarDatosInicio):
// - GET /reportes/resumen: "Gastado este mes" = gasto_variable (cuadra con Movimientos y Reportes);
//   con suscripciones, debajo "Suscripciones $X · Total $Y".
// - GET /gastos?mes: barra por categorías, chips y los primeros 5 movimientos recientes.
// - GET /presupuestos?mes: límite de la barra y "Presupuestos en riesgo" (alerta o excedido). Si
//   falla, Inicio sigue sin barra ni riesgo.
// - GET /membresias (HU-73): tarjeta «Esta semana cobran» con los cobros de los próximos 7 días;
//   sin cobros o si falla, no se muestra. La misma respuesta alimenta «Próximo cobro» (HU-72), sin
//   otra petición.
// "Saldo disponible" (HU-72) es el espacio reservado para los ingresos (HU-82): hoy va sin saldo.
// Los nombres de las categorías salen de la caché de la sesión (useCategorias).
export default function InicioScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const alturaNavbar = useAlturaNavbar();
  const { usuario } = useAuth();
  const { listarGastos, eliminarGasto } = useGastosService();
  const { listarPresupuestos } = usePresupuestosService();
  const { obtenerResumen } = useReportesService();
  const { listarMembresias } = useMembresiasService();
  const {
    categorias,
    estado: estadoCategorias,
    recargar: recargarCategorias,
    nombrePorId,
  } = useCategorias();
  // Si la primera carga falló (backend apagado, recién iniciada la sesión), se reintenta al enfocar.
  useReintentarCategoriasAlEnfocar();
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);

  const [resumen, setResumen] = useState(null);
  const [gastosMes, setGastosMes] = useState([]);
  // null si no se pudieron cargar los presupuestos.
  const [presupuestos, setPresupuestos] = useState(null);
  // null si no se pudieron cargar las membresías.
  const [membresias, setMembresias] = useState(null);
  const [mesCargado, setMesCargado] = useState(null);
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [textoError, setTextoError] = useState('');
  const [refrescando, setRefrescando] = useState(false);
  const [hayDatos, setHayDatos] = useState(false);

  // Cada petición recibe un número; si al responder ya hay una más nueva, se descarta.
  const ultimaPeticion = useRef(0);

  const cargar = useCallback(async () => {
    // Recarga en silencio: el indicador de pantalla completa solo aparece en la primera carga
    // (estado inicial) o al reintentar desde la pantalla de error.
    const peticion = ++ultimaPeticion.current;
    const mes = mesActual();
    try {
      const datos = await cargarDatosInicio(
        { obtenerResumen, listarGastos, listarPresupuestos, listarMembresias },
        mes,
      );
      if (peticion !== ultimaPeticion.current) return;
      setResumen(datos.resumen);
      setGastosMes(datos.gastos);
      setPresupuestos(datos.presupuestos);
      setMembresias(datos.membresias);
      setMesCargado(mes);
      setEstado('listo');
      setHayDatos(true);
      // HU-58: el widget de Android muestra el mismo total del mes que acaba de cargar Inicio.
      actualizarWidget(datos.resumen, mes);
    } catch (error) {
      if (peticion !== ultimaPeticion.current) return;
      setTextoError(mensajeError(error?.code, error?.message));
      setEstado('error');
    }
  }, [obtenerResumen, listarGastos, listarPresupuestos, listarMembresias]);

  // Recarga cada vez que Inicio gana foco (por ejemplo al cerrar la hoja de Nuevo gasto).
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  // Si las categorías fallaron, refrescar y Reintentar también las vuelven a pedir.
  const recargarCategoriasSiFallaron = () => {
    if (estadoCategorias === 'error') recargarCategorias();
  };

  const refrescar = async () => {
    recargarCategoriasSiFallaron();
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  const nombresCategoria = useMemo(
    () => Object.fromEntries(categorias.map((c) => [c.id, c.nombre])),
    [categorias],
  );
  const porCategoria = useMemo(
    () => gastoPorCategoria(gastosMes, nombresCategoria),
    [gastosMes, nombresCategoria],
  );
  const principales = useMemo(() => porCategoria.slice(0, CHIPS_CATEGORIA), [porCategoria]);
  const presupuestoTotal = presupuestos ? resumenPresupuestos(presupuestos).limite : null;
  const resumenMes = useMemo(
    () => resumenGastoMes(porCategoria, presupuestoTotal, resumen?.gasto_variable),
    [porCategoria, presupuestoTotal, resumen],
  );
  const cobrosSemana = useMemo(() => cobrosDeLaSemana(membresias), [membresias]);
  const cobroProximo = useMemo(() => proximoCobro(membresias), [membresias]);
  const enRiesgo = useMemo(() => presupuestosEnRiesgo(presupuestos), [presupuestos]);
  const recientes = useMemo(() => gastosMes.slice(0, MOVIMIENTOS_RECIENTES), [gastosMes]);
  const primerNombre = (usuario?.nombre || '').trim().split(' ')[0];

  // Cartera › Suscripciones (ver los parámetros de CarteraScreen).
  const abrirSuscripciones = () =>
    navigation.navigate('Cartera', { seccion: 'suscripciones', solicitud: Date.now() });
  const abrirNuevoGasto = () => navigation.navigate('NuevoGasto');
  // Cartera › Presupuestos en el mes de los datos (ver los parámetros de CarteraScreen).
  const abrirPresupuestos = () =>
    navigation.navigate('Cartera', {
      seccion: 'presupuestos',
      mes: mesCargado ?? mesActual(),
      solicitud: Date.now(),
    });

  // Filas deslizables: Editar abre la hoja en modo edición; al eliminar, la fila se quita al
  // momento y se recargan la lista y los totales.
  const filas = useFilasDeslizables();
  const editarGasto = (gasto) => navigation.navigate('NuevoGasto', { gasto });
  const gastoEliminado = (id) => {
    setGastosMes((lista) => lista.filter((g) => g.id !== id));
    cargar();
  };

  const encabezado = (
    <View>
      <View style={styles.cabecera}>
        <Pressable
          onPress={() => navigation.navigate('Perfil')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Abrir perfil"
          style={({ pressed }) => (pressed ? styles.avatarPresionado : null)}
        >
          <Avatar nombre={primerNombre} />
        </Pressable>
        <View style={styles.saludoTextos}>
          <Etiqueta style={styles.bienvenida}>Bienvenido de nuevo</Etiqueta>
          <Text style={styles.saludo} numberOfLines={1}>
            Hola{primerNombre ? `, ${primerNombre}` : ''}
          </Text>
        </View>
      </View>

      <TarjetaSaldo />

      <TarjetaResumen
        resumen={resumenMes}
        principales={principales}
        conPresupuestos={presupuestos != null}
        gastoFijo={resumen?.gasto_fijo ?? 0}
        total={resumen?.total}
        onDefinirPresupuesto={abrirPresupuestos}
      />

      <TarjetaProximoCobro cobro={cobroProximo} onPress={abrirSuscripciones} />

      <TarjetaCobrosSemana
        cobros={cobrosSemana.cobros}
        total={cobrosSemana.total}
        onPress={abrirSuscripciones}
      />

      {enRiesgo.length > 0 ? (
        <View style={styles.riesgo}>
          <Text style={styles.riesgoTitulo} accessibilityRole="header">
            Presupuestos en riesgo
          </Text>
          {enRiesgo.map((p) => (
            <Pressable
              key={p.id}
              onPress={abrirPresupuestos}
              accessibilityRole="button"
              accessibilityLabel={`${p.categoria}: ${p.porcentaje}% del presupuesto, ${NOMBRE_ESTADO[p.estado]}`}
              accessibilityHint="Abre tus presupuestos en Cartera"
              style={({ pressed }) => (pressed ? styles.riesgoPresionado : null)}
            >
              <TarjetaPresupuesto presupuesto={p} compacta />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );

  // Parte superior del panel "Movimientos": jalador y encabezado. Los gastos, el
  // separador y el pie usan el mismo fondo para que el panel se vea como una sola pieza.
  const panelInicio = (
    <View style={styles.panelInicio}>
      <View style={styles.panelJalador} />
      <View style={styles.seccion}>
        <Text style={styles.seccionTitulo}>Movimientos</Text>
        <View style={styles.pastilla}>
          <Text style={styles.pastillaTexto}>Recientes</Text>
        </View>
      </View>
    </View>
  );

  // Si el mes tiene más gastos que los recientes, el pie enlaza a Movimientos.
  const pieInicio = (
    <View style={styles.panelPie}>
      {gastosMes.length > recientes.length ? (
        <Pressable
          onPress={() => navigation.navigate('Movimientos')}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityHint="Abre Movimientos"
          style={styles.verTodos}
        >
          <Text style={styles.enlace}>Ver los {gastosMes.length} movimientos del mes</Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (estado === 'cargando') {
    return (
      <View style={[styles.pantalla, styles.centro]}>
        <FondoDegradado />
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  const reintentar = () => {
    recargarCategoriasSiFallaron();
    setEstado('cargando');
    cargar();
  };

  if (estado === 'error' && !hayDatos) {
    return (
      <View style={[styles.pantalla, styles.centro, styles.relleno]}>
        <FondoDegradado />
        <MaterialCommunityIcons name="wifi-off" size={40} color={colors.textSecondary} />
        <Text style={styles.estadoTitulo}>{textoError}</Text>
        <View style={styles.botonEstado}>
          <Boton titulo="Reintentar" onPress={reintentar} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      <FondoDegradado />
      <FlatList
        data={recientes}
        keyExtractor={(g) => String(g.id)}
        renderItem={({ item }) => (
          <View style={styles.panelFila}>
            <FilaDeslizable
              filas={filas}
              onEditar={() => editarGasto(item)}
              eliminar={() => eliminarGasto(item.id)}
              onEliminado={() => gastoEliminado(item.id)}
              tituloEliminar="¿Eliminar gasto?"
              codigoNoExiste="GASTO_NO_ENCONTRADO"
              mensajeNoExiste="Este gasto ya no existe"
            >
              <ItemGasto gasto={item} nombreCategoria={nombrePorId(item.categoria_id)} opaca />
            </FilaDeslizable>
          </View>
        )}
        ListHeaderComponent={
          <>
            {encabezado}
            {estado === 'error' ? (
              <View style={styles.avisoError}>
                <Text style={styles.avisoTexto}>{textoError}</Text>
                <Pressable onPress={cargar} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.avisoAccion}>Reintentar</Text>
                </Pressable>
              </View>
            ) : null}
            {panelInicio}
          </>
        }
        ListFooterComponent={pieInicio}
        ListEmptyComponent={
          <View style={[styles.panelFila, styles.vacio]}>
            <MaterialCommunityIcons
              name="receipt-text-outline"
              size={40}
              color={colors.textSecondary}
            />
            <Text style={styles.estadoTitulo}>Sin gastos este mes</Text>
            <Pressable onPress={abrirNuevoGasto} hitSlop={8} accessibilityRole="button">
              <Text style={styles.enlace}>Registra un gasto</Text>
            </Pressable>
          </View>
        }
        ItemSeparatorComponent={Separador}
        onScrollBeginDrag={filas.cerrarAbierta}
        contentContainerStyle={[
          styles.lista,
          { paddingTop: insets.top + 8, paddingBottom: alturaNavbar + 16 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={colors.text} />
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
    centro: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    relleno: {
      paddingHorizontal: 32,
    },
    // px-margin (20)
    lista: {
      paddingHorizontal: 20,
    },
    // Greeting bar: pt-2 pb-3, gap-space-sm entre avatar y textos
    cabecera: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingBottom: 12,
      marginBottom: 8,
    },
    avatarPresionado: {
      opacity: 0.7,
    },
    saludoTextos: {
      flex: 1,
    },
    // font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant
    bienvenida: {
      fontFamily: fonts.monoMedium,
      fontSize: 10,
      letterSpacing: 1,
      color: colors.saludoEtiqueta,
    },
    // font-headline-md text-headline-md tracking-tight (acento en oscuro, carbón en claro)
    saludo: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.55,
      color: colors.saludo,
    },
    // Panel: rounded-[28px] bg-surface-container-lowest/80 p-space-md pt-4; mt-1 + gap-3.5
    // El brillo superior del diseño es el borde de arriba, en todo el ancho y con el radio.
    panelInicio: {
      borderTopWidth: 1,
      borderTopColor: colors.borderTop,
      marginTop: 18,
      paddingTop: 16,
      paddingHorizontal: 16,
      borderTopLeftRadius: radios.panel,
      borderTopRightRadius: radios.panel,
      backgroundColor: colors.surfaceLowest80,
    },
    panelFila: {
      paddingHorizontal: 16,
      backgroundColor: colors.surfaceLowest80,
    },
    panelPie: {
      minHeight: 16,
      borderBottomLeftRadius: radios.panel,
      borderBottomRightRadius: radios.panel,
      backgroundColor: colors.surfaceLowest80,
    },
    // Enlace a Movimientos al pie del panel
    verTodos: {
      alignSelf: 'center',
      paddingTop: 14,
      paddingBottom: 16,
    },
    // Sección "Presupuestos en riesgo" entre la tarjeta del mes y el panel de movimientos
    riesgo: {
      marginTop: 18,
      gap: 8,
    },
    riesgoTitulo: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      lineHeight: 22,
      letterSpacing: -0.4,
      color: colors.text,
      marginBottom: 2,
    },
    riesgoPresionado: {
      opacity: 0.7,
    },
    // w-8 h-1 rounded-full bg-surface-container-highest mx-auto mb-3 opacity-60
    panelJalador: {
      alignSelf: 'center',
      width: 32,
      height: 4,
      borderRadius: radios.full,
      backgroundColor: colors.surfaceHighest,
      opacity: 0.6,
      marginBottom: 12,
    },
    // flex items-center gap-2 mb-3.5
    seccion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
    },
    // font-headline-sm text-headline-sm text-primary tracking-tight
    seccionTitulo: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.45,
      color: colors.text,
    },
    // px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-caps text-[10px]
    pastilla: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radios.full,
      backgroundColor: colors.surfaceHigh,
    },
    pastillaTexto: {
      fontFamily: fonts.monoMedium,
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 0.8,
      color: colors.text,
    },
    // gap-2.5 entre movimientos (mismo fondo que el panel)
    separador: {
      height: 10,
      backgroundColor: colors.surfaceLowest80,
    },
    vacio: {
      alignItems: 'center',
      gap: 10,
      paddingVertical: 32,
    },
    estadoTitulo: {
      fontFamily: fonts.sansSemiBold,
      color: colors.text,
      fontSize: 18,
      lineHeight: 24,
      textAlign: 'center',
      marginTop: 8,
    },
    enlace: {
      fontFamily: fonts.sansMedium,
      color: colors.text,
      fontSize: 14,
      textDecorationLine: 'underline',
    },
    botonEstado: {
      alignSelf: 'stretch',
      marginTop: 20,
    },
    avisoError: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 12,
      padding: 12,
      borderRadius: radios['2xl'],
      borderWidth: 1,
      borderColor: colors.alerta,
    },
    avisoTexto: {
      fontFamily: fonts.sans,
      flex: 1,
      color: colors.alertaTexto,
      fontSize: 14,
    },
    avisoAccion: {
      fontFamily: fonts.sansBold,
      color: colors.text,
      fontSize: 14,
    },
  });
