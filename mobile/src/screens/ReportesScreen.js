import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BarraCategorias from '../components/BarraCategorias';
import DonaCategorias from '../components/DonaCategorias';
import EstadoPantalla from '../components/EstadoPantalla';
import Etiqueta from '../components/Etiqueta';
import FondoDegradado from '../components/FondoDegradado';
import IconoCategoria from '../components/IconoCategoria';
import { useAlturaNavbar } from '../components/NavbarFlotante';
import PantallaProximamente from '../components/PantallaProximamente';
import SelectorMes from '../components/SelectorMes';
import SelectorSegmentado from '../components/SelectorSegmentado';
import { useCategorias, useReintentarCategoriasAlEnfocar } from '../context/CategoriasContext';
import { useGastosService } from '../services/gastos';
import { usePresupuestosService } from '../services/presupuestos';
import { useReportesService } from '../services/reportes';
import { espacios, radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { tipografia } from '../theme/tipografia';
import {
  compararConMesAnterior,
  consejoDelMes,
  desglosePorCategoria,
  etiquetaComparacion,
  textoComparacion,
} from '../utils/analisis';
import { mensajeError } from '../utils/errores';
import { mesActual, sumarMeses } from '../utils/fechas';
import { formatearMonto, MONEDA, nombreMes } from '../utils/formato';
import { resumenPresupuestos } from '../utils/presupuestos';
import { armarDatosDona, esMesSinDatos } from '../utils/reportes';
import { etiquetaBarraMes, nivelPorcentaje, resumenGastoMes } from '../utils/resumenMes';

// Vistas del segmentado bajo el mes. Solo hay gastos en la app: Ingresos y Balance llevan la
// insignia "Pronto" (como Tarjetas en Cartera) y muestran PantallaProximamente.
const VISTAS = [
  { valor: 'gastos', etiqueta: 'Gastos' },
  { valor: 'ingresos', etiqueta: 'Ingresos', insignia: 'Pronto' },
  { valor: 'balance', etiqueta: 'Balance', insignia: 'Pronto' },
];

const PROXIMAMENTE = {
  ingresos: {
    icono: 'cash-plus',
    titulo: 'Ingresos',
    mensaje: 'Pronto podrás registrar ingresos',
  },
  balance: {
    icono: 'scale-balance',
    titulo: 'Balance',
    mensaje: 'Pronto verás tu balance del mes',
  },
};

// Reportes (RF6, RF8; HU-37; diseño HU-81 con el Stitch reportes_modo_oscuro/_claro).
// Por mes, en paralelo: GET /reportes/resumen y /gastos del mes (obligatorios: si fallan, error con
// Reintentar), y /gastos del mes anterior y /presupuestos (opcionales: si fallan, se oculta lo que
// depende de ellos). Orden: dona con el total gastado, gasto variable / fijo / total, rendimiento
// frente al mes anterior con el avance del presupuesto, desglose por categoría y "Consejo Billo".
// Los cálculos viven en utils/analisis.js (con pruebas).
export default function ReportesScreen() {
  const insets = useSafeAreaInsets();
  const alturaNavbar = useAlturaNavbar();
  const { obtenerResumen } = useReportesService();
  const { listarGastos } = useGastosService();
  const { listarPresupuestos } = usePresupuestosService();
  const { nombrePorId } = useCategorias();
  // Los nombres del desglose salen de la caché de categorías; si falló, se reintenta al enfocar.
  useReintentarCategoriasAlEnfocar();
  const { colors, esOscuro } = useTema();
  const styles = useEstilos(crearEstilos);

  const [mes, setMes] = useState(mesActual);
  const [vista, setVista] = useState('gastos');
  // Última respuesta válida, junta para no mezclar dos meses:
  // { mes, resumen, gastos, anterior (null si falló), presupuestos (null si falló) }.
  const [datos, setDatos] = useState(null);
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [textoError, setTextoError] = useState('');
  const [refrescando, setRefrescando] = useState(false);

  // Cada petición recibe un número; si al responder ya hay una más nueva, se descarta.
  const ultimaPeticion = useRef(0);

  const cargar = useCallback(async () => {
    const peticion = ++ultimaPeticion.current;
    try {
      const [resumen, gastos, anterior, presupuestos] = await Promise.all([
        obtenerResumen(mes),
        listarGastos({ mes }),
        listarGastos({ mes: sumarMeses(mes, -1) }).catch(() => null),
        listarPresupuestos(mes).catch(() => null),
      ]);
      if (peticion !== ultimaPeticion.current) return;
      setDatos({ mes, resumen, gastos, anterior, presupuestos });
      setEstado('listo');
    } catch (error) {
      if (peticion !== ultimaPeticion.current) return;
      setTextoError(mensajeError(error?.code, error?.message));
      setEstado('error');
    }
  }, [obtenerResumen, listarGastos, listarPresupuestos, mes]);

  // Recarga al ganar foco (un gasto nuevo aparece al volver) y, como `cargar` cambia con el mes,
  // también al cambiar de mes.
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

  // Al cambiar de mes se conservan los datos anteriores (atenuados) mientras llegan los nuevos.
  // Desde el estado de error se vuelve al indicador de carga.
  const cambiarMes = (nuevo) => {
    setMes(nuevo);
    if (estado === 'error') setEstado('cargando');
  };

  // Reintentar deja el error a la vista con el botón en cargando hasta que responde.
  const reintentar = () => cargar();

  const analisis = useMemo(() => {
    if (!datos) return null;
    const { mes: mesDatos, resumen, gastos, anterior, presupuestos } = datos;
    const desglose = desglosePorCategoria(gastos, nombrePorId);
    const limite = presupuestos ? resumenPresupuestos(presupuestos).limite : 0;
    return {
      desglose,
      dona: armarDatosDona(desglose, esOscuro),
      comparacion: anterior
        ? compararConMesAnterior({ mes: mesDatos, gastosMes: gastos, gastosAnterior: anterior })
        : null,
      // Avance del presupuesto: solo si ese mes hay presupuestos.
      proyectado:
        limite > 0
          ? resumenGastoMes(
              desglose.map((c) => ({ id: c.categoria_id, nombre: c.categoria, total: c.total })),
              limite,
              resumen.gasto_variable,
            )
          : null,
      consejo: consejoDelMes({
        mes: mesDatos,
        gastosMes: gastos,
        gastosAnterior: anterior,
        presupuestos,
        nombrePorId,
      }),
    };
  }, [datos, nombrePorId, esOscuro]);

  const cambiandoMes = estado === 'listo' && datos?.mes !== mes;

  let contenido;
  if (estado !== 'listo') {
    contenido = (
      <EstadoPantalla
        estado={estado}
        titulo={estado === 'error' ? textoError : null}
        onReintentar={reintentar}
      />
    );
  } else {
    const { resumen, gastos } = datos;
    const { desglose, dona, comparacion, proyectado, consejo } = analisis;
    contenido = (
      <View style={[styles.contenido, cambiandoMes ? styles.atenuado : null]}>
        {/* c) Dona con el total gastado (gasto variable) */}
        {/* Sin tarjeta: la dona va directo sobre el fondo con brillo (Stitch). */}
        <View style={styles.zonaDona}>
          {cambiandoMes ? (
            <ActivityIndicator
              size="small"
              color={colors.textSecondary}
              style={styles.indicadorMes}
            />
          ) : null}
          {dona.length > 0 ? (
            <DonaCategorias
              datos={dona}
              total={resumen.gasto_variable}
              nombreMes={nombreMes(datos.mes)}
              animacion={datos.mes}
            />
          ) : (
            <EstadoPantalla
              estado="vacio"
              icono="chart-donut"
              titulo="Sin gastos este mes"
              mensaje={
                esMesSinDatos(resumen, gastos)
                  ? 'Registra un gasto para ver en qué se va tu dinero.'
                  : 'Aún no hay gastos; el total solo incluye tus suscripciones.'
              }
              style={styles.vacio}
            />
          )}
        </View>

        {/* d) Gasto variable, fijo (suscripciones) y total */}
        <View style={[styles.tarjeta, styles.filaDatos]}>
          <Dato etiqueta="Variable" nota="Gastos" monto={resumen.gasto_variable} />
          <View style={styles.divisor} />
          <Dato etiqueta="Fijo" nota="Suscripciones" monto={resumen.gasto_fijo} />
          <View style={styles.divisor} />
          <Dato etiqueta="Total" nota="Del mes" monto={resumen.total} />
        </View>

        {/* e) Rendimiento mensual (sin la comparación si falló el mes anterior; sin el avance si
            fallaron los presupuestos o no hay; sin tarjeta si no queda nada) */}
        {comparacion || proyectado ? (
          <TarjetaRendimiento comparacion={comparacion} proyectado={proyectado} />
        ) : null}

        {/* f) Desglose por categoría */}
        {desglose.length > 0 ? (
          <View style={styles.seccion}>
            <View style={styles.seccionCabecera}>
              <Etiqueta style={styles.seccionEtiqueta}>Desglose por categoría</Etiqueta>
              <Etiqueta style={styles.seccionContador}>
                {desglose.length} {desglose.length === 1 ? 'categoría' : 'categorías'}
              </Etiqueta>
            </View>
            {desglose.map((c) => (
              <FilaCategoria key={String(c.categoria_id)} categoria={c} />
            ))}
          </View>
        ) : null}

        {/* g) Consejo Billo (solo si hay datos suficientes) */}
        {consejo ? (
          <View style={[styles.tarjeta, styles.consejo]}>
            <View style={styles.consejoIcono}>
              <MaterialCommunityIcons name="creation" size={20} color={colors.textoSobreColor} />
            </View>
            <View style={styles.consejoTextos}>
              <Etiqueta style={styles.consejoEtiqueta}>Consejo Billo</Etiqueta>
              <Text style={styles.consejoTexto}>{consejo}</Text>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      <FondoDegradado />
      <ScrollView
        contentContainerStyle={[
          styles.lista,
          // El último bloque queda por encima de la navbar flotante con aire de sobra.
          { paddingTop: insets.top + 4, paddingBottom: alturaNavbar + espacios.xl },
        ]}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={colors.text} />
        }
      >
        {/* a) Encabezado */}
        <View style={styles.encabezado}>
          <Etiqueta style={styles.encabezadoEtiqueta}>Análisis financiero</Etiqueta>
          <Text style={styles.titulo} accessibilityRole="header">
            Reportes
          </Text>
        </View>
        {/* b) Mes, con el estilo del Stitch (calendario y flechas) */}
        <SelectorMes mes={mes} onCambiar={cambiarMes} calendario />
        {/* Gastos | Ingresos | Balance: solo Gastos tiene datos por ahora */}
        <SelectorSegmentado
          opciones={VISTAS}
          valor={vista}
          onCambiar={setVista}
          accessibilityLabel="Tipo de reporte"
          style={styles.selectorVista}
        />
        {vista === 'gastos' ? (
          contenido
        ) : (
          <PantallaProximamente
            key={vista}
            icono={PROXIMAMENTE[vista].icono}
            titulo={PROXIMAMENTE[vista].titulo}
            mensaje={PROXIMAMENTE[vista].mensaje}
            incrustada
          />
        )}
      </ScrollView>
    </View>
  );
}

// Un dato de la fila variable / fijo / total.
function Dato({ etiqueta, nota, monto }) {
  const styles = useEstilos(crearEstilos);
  const texto = formatearMonto(monto);
  return (
    <View style={styles.dato} accessible accessibilityLabel={`${etiqueta} (${nota}): ${texto}`}>
      <Etiqueta style={styles.datoEtiqueta}>{etiqueta}</Etiqueta>
      <Text style={styles.datoMonto} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {texto}
      </Text>
      <Text style={styles.datoNota} numberOfLines={1}>
        {nota}
      </Text>
    </View>
  );
}

// "Rendimiento mensual": comparación con el mes anterior y avance del presupuesto.
function TarjetaRendimiento({ comparacion, proyectado }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const disponible = comparacion?.disponible;
  const bajo = disponible && comparacion.direccion === 'bajo';
  const subio = disponible && comparacion.direccion === 'subio';
  const colorTendencia = bajo ? colors.exitoTexto : subio ? colors.alertaTexto : colors.text;
  const nivel = proyectado ? nivelPorcentaje(proyectado.porcentaje) : null;
  const colorPorcentaje =
    nivel === 'alerta'
      ? colors.alertaTexto
      : nivel === 'aviso'
        ? colors.avisoTexto
        : colors.textSecondary;

  return (
    <View style={[styles.tarjeta, styles.rendimiento]}>
      <View style={styles.rendimientoCabecera}>
        <View style={styles.rendimientoTitulo}>
          <View style={styles.rendimientoIcono}>
            <MaterialCommunityIcons
              name={subio ? 'trending-up' : 'trending-down'}
              size={18}
              color={colors.text}
            />
          </View>
          <Text style={styles.seccionTitulo} numberOfLines={1}>
            Rendimiento mensual
          </Text>
        </View>
        {disponible ? (
          <View
            style={[
              styles.insignia,
              bajo ? styles.insigniaExito : subio ? styles.insigniaAlerta : null,
            ]}
          >
            {bajo || subio ? (
              <MaterialCommunityIcons
                name={bajo ? 'arrow-down' : 'arrow-up'}
                size={14}
                color={colorTendencia}
              />
            ) : null}
            <Text style={[styles.insigniaTexto, { color: colorTendencia }]}>
              {etiquetaComparacion(comparacion)}
            </Text>
          </View>
        ) : null}
      </View>

      {comparacion ? (
        <Text style={styles.rendimientoTexto}>{textoComparacion(comparacion)}</Text>
      ) : null}

      {proyectado ? (
        <View style={styles.proyectado}>
          <BarraCategorias
            tramos={proyectado.tramos}
            porcentaje={proyectado.porcentaje}
            etiqueta={etiquetaBarraMes(proyectado)}
          />
          <View style={styles.proyectadoPie}>
            <Text style={[styles.proyectadoTexto, { color: colorPorcentaje }]}>
              {proyectado.porcentaje}% del límite proyectado
            </Text>
            <Text style={styles.proyectadoMontos} numberOfLines={1}>
              {formatearMonto(proyectado.gastado)} / {formatearMonto(proyectado.presupuesto)}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// Fila del desglose: ícono, nombre, "N% del total • M gastos" y "-$X MXN".
function FilaCategoria({ categoria }) {
  const styles = useEstilos(crearEstilos);
  const { categoria: nombre, total, cantidad, porcentaje } = categoria;
  const textoCantidad = `${cantidad} ${cantidad === 1 ? 'gasto' : 'gastos'}`;
  return (
    <View
      style={styles.fila}
      accessible
      accessibilityLabel={`${nombre}: ${formatearMonto(total)}, ${porcentaje}% del total, ${textoCantidad}`}
    >
      <IconoCategoria nombre={nombre} />
      <View style={styles.filaTextos}>
        <Text style={styles.filaNombre} numberOfLines={1}>
          {nombre}
        </Text>
        {/* Si no cabe en una línea pasa a dos (sin "…"). */}
        <Text style={styles.filaDetalle} numberOfLines={2}>
          <Text style={styles.filaPorcentaje}>{porcentaje}% del total</Text>
          {'  •  '}
          {textoCantidad}
        </Text>
      </View>
      <View style={styles.filaMontos}>
        <Text style={styles.filaMonto} numberOfLines={1}>
          -{formatearMonto(total)}
        </Text>
        <Text style={styles.filaMoneda}>{MONEDA}</Text>
      </View>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    pantalla: {
      flex: 1,
      backgroundColor: colors.background,
    },
    lista: {
      paddingHorizontal: espacios.margen,
      gap: espacios.sm + 4,
    },
    encabezado: {
      marginTop: espacios.xs,
    },
    // font-label-caps uppercase tracking-widest text-on-surface-variant
    encabezadoEtiqueta: {
      color: colors.textVariant,
    },
    titulo: {
      ...tipografia.headlineLg,
      color: colors.text,
    },
    contenido: {
      gap: espacios.md,
      marginTop: espacios.xs,
    },
    atenuado: {
      opacity: 0.45,
    },
    // La tarjeta de vidrio de Inicio (TarjetaResumen): radio 22, brillo superior y sombra suave.
    tarjeta: {
      padding: 14,
      borderRadius: radios.tarjeta,
      borderTopWidth: 1,
      borderTopColor: colors.borderTop,
      backgroundColor: colors.surfaceLow70,
      shadowColor: colors.sombra,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 14,
      shadowOpacity: 0.35,
      elevation: 6,
    },
    // Las insignias "Pronto" sobresalen 10 px por arriba del segmentado.
    selectorVista: {
      marginTop: 10,
    },
    // espacios.lg entre el selector y la dona, y entre la dona y la fila variable / fijo / total.
    // Arriba ya suman el gap de la lista (sm + 4) y el margen de `contenido` (xs); abajo, el gap
    // de `contenido` (md).
    zonaDona: {
      marginTop: espacios.lg - (espacios.sm + 4) - espacios.xs,
      marginBottom: espacios.lg - espacios.md,
    },
    indicadorMes: {
      position: 'absolute',
      top: 0,
      right: 0,
    },
    // d) tres datos con divisores verticales
    filaDatos: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    dato: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: espacios.xs,
    },
    divisor: {
      width: 1,
      backgroundColor: colors.border,
    },
    datoEtiqueta: {
      color: colors.outline,
    },
    datoMonto: {
      ...tipografia.financialMetricMd,
      fontSize: 16,
      color: colors.text,
      marginTop: 2,
    },
    datoNota: {
      ...tipografia.bodySm,
      color: colors.textSecondary,
    },
    // e) Rendimiento mensual
    rendimiento: {
      gap: espacios.sm + 4,
    },
    rendimientoCabecera: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: espacios.sm,
    },
    rendimientoTitulo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacios.sm,
      flexShrink: 1,
    },
    rendimientoIcono: {
      width: 32,
      height: 32,
      borderRadius: radios.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceHighest,
    },
    // px-space-xs py-1 rounded-full bg-surface-container-highest
    insignia: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: espacios.sm,
      paddingVertical: espacios.xs,
      borderRadius: radios.full,
      backgroundColor: colors.surfaceHighest,
    },
    insigniaExito: {
      backgroundColor: colors.exitoSuave,
    },
    insigniaAlerta: {
      backgroundColor: colors.alertaSuave,
    },
    insigniaTexto: {
      ...tipografia.labelCaps,
      fontFamily: fonts.monoSemiBold,
      textTransform: 'none',
    },
    rendimientoTexto: {
      ...tipografia.bodyMd,
      color: colors.textVariant,
    },
    proyectado: {
      gap: 6,
      paddingTop: espacios.xs,
    },
    proyectadoPie: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: espacios.sm,
    },
    proyectadoTexto: {
      ...tipografia.labelCaps,
      fontSize: 10,
      textTransform: 'none',
      letterSpacing: 0,
    },
    proyectadoMontos: {
      ...tipografia.labelCaps,
      fontSize: 10,
      textTransform: 'none',
      letterSpacing: 0,
      flexShrink: 1,
      color: colors.textSecondary,
    },
    // f) Desglose
    seccion: {
      gap: espacios.sm,
    },
    seccionCabecera: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: espacios.xs,
    },
    seccionEtiqueta: {
      color: colors.textVariant,
    },
    seccionContador: {
      color: colors.textSecondary,
    },
    seccionTitulo: {
      ...tipografia.headlineSm,
      color: colors.text,
      flexShrink: 1,
    },
    // Como las filas de Inicio (ItemGasto / TarjetaPresupuesto): rounded-2xl, fondo opaco
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacios.sm + 4,
      padding: 10,
      paddingRight: 14,
      borderRadius: radios['2xl'],
      backgroundColor: colors.filaOpaca,
    },
    filaTextos: {
      flex: 1,
    },
    filaNombre: {
      ...tipografia.bodyLg,
      fontFamily: fonts.sansSemiBold,
      color: colors.text,
    },
    filaDetalle: {
      ...tipografia.bodySm,
      color: colors.textSecondary,
    },
    filaPorcentaje: {
      fontFamily: fonts.monoMedium,
      color: colors.textVariant,
    },
    filaMontos: {
      alignItems: 'flex-end',
    },
    filaMonto: {
      ...tipografia.financialMetricMd,
      fontSize: 16,
      color: colors.text,
    },
    filaMoneda: {
      ...tipografia.labelCaps,
      fontSize: 10,
      color: colors.textSecondary,
    },
    // g) Consejo Billo: ícono de destello en el acento
    consejo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacios.sm + 4,
    },
    consejoIcono: {
      width: 40,
      height: 40,
      borderRadius: radios.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.acento,
      shadowColor: colors.acento,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 10,
      shadowOpacity: 0.45,
    },
    consejoTextos: {
      flex: 1,
      gap: 2,
    },
    consejoEtiqueta: {
      color: colors.acentoTexto,
    },
    consejoTexto: {
      ...tipografia.bodySm,
      color: colors.textVariant,
    },
    // Estados de carga, error y vacío: los de Inicio y Movimientos
    vacio: {
      paddingVertical: espacios.sm,
    },
  });
