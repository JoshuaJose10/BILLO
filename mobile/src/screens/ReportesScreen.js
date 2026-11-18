import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import BarraCategorias from '../components/BarraCategorias';
import DonaCategorias from '../components/DonaCategorias';
import EstadoPantalla from '../components/EstadoPantalla';
import Etiqueta from '../components/Etiqueta';
import FondoDegradado from '../components/FondoDegradado';
import IconoCategoria from '../components/IconoCategoria';
import ItemGasto from '../components/ItemGasto';
import { useAlturaNavbar } from '../components/NavbarFlotante';
import SelectorMes from '../components/SelectorMes';
import SelectorSegmentado from '../components/SelectorSegmentado';
import { useCategorias, useReintentarCategoriasAlEnfocar } from '../context/CategoriasContext';
import { useRecargar } from '../hooks/useRecargar';
import { useGastosService } from '../services/gastos';
import { useIngresosService } from '../services/ingresos';
import { usePresupuestosService } from '../services/presupuestos';
import { useReportesService } from '../services/reportes';
import { espacios, radios } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { useEstilos, useTema } from '../theme/TemaContext';
import { tipografia } from '../theme/tipografia';
import {
  compararConMesAnterior,
  compararIngresosConMesAnterior,
  consejoDelMes,
  desglosePorCategoria,
  etiquetaComparacion,
  textoComparacion,
  textoComparacionIngresos,
} from '../utils/analisis';
import { mesActual, sumarMeses } from '../utils/fechas';
import { fechaRelativa, formatearMonto, MONEDA, nombreMes } from '../utils/formato';
import { iconoFuente } from '../utils/ingresos';
import { resumenPresupuestos } from '../utils/presupuestos';
import {
  armarBarrasBalance,
  armarDatosDona,
  armarDatosDonaIngresos,
  colorFuenteIngreso,
  descripcionDonaIngresos,
  esMesSinDatos,
  estadoBalanceMes,
} from '../utils/reportes';
import { etiquetaBarraMes, nivelPorcentaje, resumenGastoMes } from '../utils/resumenMes';

const VISTAS = [
  { valor: 'gastos', etiqueta: 'Gastos' },
  { valor: 'ingresos', etiqueta: 'Ingresos' },
  { valor: 'balance', etiqueta: 'Balance' },
];

const ALTURA_BARRA_MAX = 116;
const ALTURA_BARRA_MIN = 6;

// Reportes (RF6, RF8; HU-37, HU-81 y Reportes › Ingresos y Balance):
// Vistas: Gastos, Ingresos y Balance, compartiendo el selector de mes con flechas.
export default function ReportesScreen({ navigation, route }) {
  const alturaNavbar = useAlturaNavbar();
  const { obtenerResumen, obtenerIngresos, obtenerBalance } = useReportesService();
  const { listarGastos } = useGastosService();
  const { listarIngresos } = useIngresosService();
  const { listarPresupuestos } = usePresupuestosService();
  const { nombrePorId } = useCategorias();
  // Los nombres del desglose salen de la caché de categorías; si falló, se reintenta al enfocar.
  useReintentarCategoriasAlEnfocar();
  const { colors, esOscuro } = useTema();
  const styles = useEstilos(crearEstilos);

  const [mes, setMes] = useState(mesActual);
  const [vista, setVista] = useState('gastos');
  const { solicitud, vista: vistaPedida } = route?.params ?? {};
  const [solicitudAplicada, setSolicitudAplicada] = useState(null);
  if (solicitud && solicitud !== solicitudAplicada) {
    setSolicitudAplicada(solicitud);
    if (VISTAS.some((v) => v.valor === vistaPedida)) setVista(vistaPedida);
  }
  // Última respuesta válida, junta para no mezclar dos meses:
  // { mes, resumen, gastos, reporteIngresos, ingresos, balance, anterior, presupuestos }.
  const [datos, setDatos] = useState(null);
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [errorCarga, setErrorCarga] = useState(null);

  // Cada petición recibe un número; si al responder ya hay una más nueva, se descarta.
  const ultimaPeticion = useRef(0);

  const cargar = useCallback(async () => {
    const peticion = ++ultimaPeticion.current;
    try {
      const [resumen, gastos, reporteIngresos, ingresos, balance, anterior, presupuestos] =
        await Promise.all([
          obtenerResumen(mes),
          listarGastos({ mes }),
          obtenerIngresos(mes),
          listarIngresos({ mes }),
          obtenerBalance(mes),
          listarGastos({ mes: sumarMeses(mes, -1) }).catch(() => null),
          listarPresupuestos(mes).catch(() => null),
        ]);
      if (peticion !== ultimaPeticion.current) return false;
      setDatos({
        mes,
        resumen,
        gastos,
        reporteIngresos,
        ingresos,
        balance,
        anterior,
        presupuestos,
      });
      setEstado('listo');
      return true;
    } catch (error) {
      if (peticion !== ultimaPeticion.current) return false;
      setErrorCarga(error);
      setEstado('error');
      return false;
    }
  }, [
    obtenerResumen,
    listarGastos,
    obtenerIngresos,
    listarIngresos,
    obtenerBalance,
    listarPresupuestos,
    mes,
  ]);

  // Recarga al ganar foco y al cambiar de mes.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  // Al cambiar de mes se conservan los datos anteriores (atenuados) mientras llegan los nuevos.
  // Desde el estado de error se vuelve al indicador de carga.
  const cambiarMes = (nuevo) => {
    setMes(nuevo);
    if (estado === 'error') setEstado('cargando');
  };

  const hayDatos = datos?.mes === mes;
  const recarga = useRecargar(cargar, {
    error: estado === 'error' ? errorCarga : null,
    hayDatos,
  });

  const analisis = useMemo(() => {
    if (!datos) return null;
    const {
      mes: mesDatos,
      resumen,
      gastos,
      reporteIngresos,
      balance,
      anterior,
      presupuestos,
    } = datos;
    const desglose = desglosePorCategoria(gastos, nombrePorId);
    const limite = presupuestos ? resumenPresupuestos(presupuestos).limite : 0;
    const donaIngresos = armarDatosDonaIngresos(reporteIngresos?.por_fuente, esOscuro);
    const comparacionIngresos = compararIngresosConMesAnterior(reporteIngresos);
    const barrasBalance = armarBarrasBalance(balance?.serie);

    return {
      desglose,
      dona: armarDatosDona(desglose, esOscuro),
      comparacion: anterior
        ? compararConMesAnterior({ mes: mesDatos, gastosMes: gastos, gastosAnterior: anterior })
        : null,
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
      donaIngresos,
      comparacionIngresos,
      barrasBalance,
    };
  }, [datos, nombrePorId, esOscuro]);

  const cambiandoMes = estado === 'listo' && datos?.mes !== mes;

  const abrirNuevoIngreso = () => navigation.navigate('NuevoGasto', { tipo: 'ingreso' });
  const abrirEditarIngreso = (ingreso) => navigation.navigate('NuevoGasto', { ingreso });

  let contenido;
  if (estado !== 'listo' && !hayDatos) {
    contenido = <EstadoPantalla estado={estado} error={errorCarga} onReintentar={cargar} />;
  } else if (vista === 'gastos') {
    const { resumen, gastos } = datos;
    const { desglose, dona, comparacion, proyectado, consejo } = analisis;
    contenido = (
      <View style={[styles.contenido, cambiandoMes ? styles.atenuado : null]}>
        {/* c) Dona con el total gastado (gasto variable) */}
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

        {/* e) Rendimiento mensual */}
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

        {/* g) Consejo Billo */}
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
  } else if (vista === 'ingresos') {
    const { reporteIngresos, ingresos } = datos;
    const { donaIngresos, comparacionIngresos } = analisis;
    const sinIngresos = reporteIngresos.total <= 0 && ingresos.length === 0;

    contenido = (
      <View style={[styles.contenido, cambiandoMes ? styles.atenuado : null]}>
        {cambiandoMes ? (
          <ActivityIndicator
            size="small"
            color={colors.textSecondary}
            style={styles.indicadorMes}
          />
        ) : null}

        {sinIngresos ? (
          <EstadoPantalla
            estado="vacio"
            icono="cash-plus"
            titulo="Sin ingresos este mes"
            mensaje="Registra tus ingresos para analizar tus fuentes y comparar mes a mes."
            accion={{
              titulo: 'Registrar ingreso',
              icono: 'plus',
              onPress: abrirNuevoIngreso,
            }}
            style={styles.vacio}
          />
        ) : (
          <>
            {/* Dona de ingresos por fuente con el total del mes en el centro */}
            <View style={styles.zonaDona}>
              <DonaCategorias
                datos={donaIngresos}
                total={reporteIngresos.total}
                nombreMes={nombreMes(datos.mes)}
                animacion={`${datos.mes}-ingresos`}
                etiquetaCentro="Total ingresos"
                descripcion={descripcionDonaIngresos(donaIngresos)}
              />
            </View>

            {/* Resumen del mes y mes anterior */}
            <View style={[styles.tarjeta, styles.filaDatos]}>
              <Dato
                etiqueta="Este mes"
                nota={nombreMes(datos.mes)}
                monto={reporteIngresos.total}
                colorMonto={colors.exitoTexto}
              />
              <View style={styles.divisor} />
              <Dato
                etiqueta="Mes anterior"
                nota={
                  reporteIngresos.mes_anterior
                    ? nombreMes(reporteIngresos.mes_anterior)
                    : 'Anterior'
                }
                monto={reporteIngresos.total_mes_anterior}
              />
            </View>

            {/* Comparación con el mes anterior */}
            <TarjetaComparacionIngresos comparacion={comparacionIngresos} />

            {/* Desglose por fuente */}
            {reporteIngresos.por_fuente.length > 0 ? (
              <View style={styles.seccion}>
                <View style={styles.seccionCabecera}>
                  <Etiqueta style={styles.seccionEtiqueta}>Por fuente</Etiqueta>
                  <Etiqueta style={styles.seccionContador}>
                    {reporteIngresos.por_fuente.length}{' '}
                    {reporteIngresos.por_fuente.length === 1 ? 'fuente' : 'fuentes'}
                  </Etiqueta>
                </View>
                {reporteIngresos.por_fuente.map((f) => (
                  <FilaFuente
                    key={f.fuente}
                    fuente={f}
                    color={colorFuenteIngreso(f.fuente, esOscuro)}
                  />
                ))}
              </View>
            ) : null}

            {/* Lista de ingresos del mes */}
            {ingresos.length > 0 ? (
              <View style={styles.seccion}>
                <View style={styles.seccionCabecera}>
                  <Etiqueta style={styles.seccionEtiqueta}>Ingresos del mes</Etiqueta>
                  <Etiqueta style={styles.seccionContador}>
                    {ingresos.length} {ingresos.length === 1 ? 'ingreso' : 'ingresos'}
                  </Etiqueta>
                </View>
                {ingresos.map((item) => (
                  <Pressable
                    key={String(item.id)}
                    onPress={() => abrirEditarIngreso(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.descripcion || item.fuente || 'Ingreso'}: +${formatearMonto(item.monto)}, ${fechaRelativa(item.fecha)}`}
                  >
                    <ItemGasto ingreso={item} opaca />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        )}
      </View>
    );
  } else {
    const { balance } = datos;
    const { barrasBalance } = analisis;
    contenido = (
      <View style={[styles.contenido, cambiandoMes ? styles.atenuado : null]}>
        {cambiandoMes ? (
          <ActivityIndicator
            size="small"
            color={colors.textSecondary}
            style={styles.indicadorMes}
          />
        ) : null}

        <TarjetaBalanceMensual balance={balance} />

        <TarjetaBarrasBalance barras={barrasBalance} mesActualSeleccionado={datos.mes} />
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      <FondoDegradado />
      <ScrollView
        contentContainerStyle={[
          styles.lista,
          { paddingTop: 4, paddingBottom: alturaNavbar + espacios.xl },
        ]}
        {...recarga.propsLista}
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
        {/* c) Selector Gastos | Ingresos | Balance */}
        <SelectorSegmentado
          opciones={VISTAS}
          valor={vista}
          onCambiar={setVista}
          accessibilityLabel="Tipo de reporte"
          style={styles.selectorVista}
        />
        {contenido}
      </ScrollView>
      {recarga.aviso}
    </View>
  );
}

// Un dato de la fila variable / fijo / total o ingresos / gastos.
function Dato({ etiqueta, nota, monto, colorMonto }) {
  const styles = useEstilos(crearEstilos);
  const texto = formatearMonto(monto);
  return (
    <View style={styles.dato} accessible accessibilityLabel={`${etiqueta} (${nota}): ${texto}`}>
      <Etiqueta style={styles.datoEtiqueta}>{etiqueta}</Etiqueta>
      <Text
        style={[styles.datoMonto, colorMonto ? { color: colorMonto } : null]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
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

// Comparación de ingresos frente al mes anterior (en ingresos subir es positivo y bajar es alerta).
function TarjetaComparacionIngresos({ comparacion }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const disponible = comparacion?.disponible;
  const subio = disponible && comparacion.direccion === 'subio';
  const bajo = disponible && comparacion.direccion === 'bajo';
  const colorTendencia = subio ? colors.exitoTexto : bajo ? colors.alertaTexto : colors.text;

  return (
    <View style={[styles.tarjeta, styles.rendimiento]}>
      <View style={styles.rendimientoCabecera}>
        <View style={styles.rendimientoTitulo}>
          <View style={styles.rendimientoIcono}>
            <MaterialCommunityIcons
              name={bajo ? 'trending-down' : 'trending-up'}
              size={18}
              color={colors.text}
            />
          </View>
          <Text style={styles.seccionTitulo} numberOfLines={1}>
            Comparación mensual
          </Text>
        </View>
        {disponible ? (
          <View
            style={[
              styles.insignia,
              subio ? styles.insigniaExito : bajo ? styles.insigniaAlerta : null,
            ]}
          >
            {subio || bajo ? (
              <MaterialCommunityIcons
                name={subio ? 'arrow-up' : 'arrow-down'}
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

      <Text style={styles.rendimientoTexto}>{textoComparacionIngresos(comparacion)}</Text>
    </View>
  );
}

// Fila del desglose por fuente de ingreso.
function FilaFuente({ fuente, color }) {
  const styles = useEstilos(crearEstilos);
  const { fuente: nombre, total, porcentaje } = fuente;
  return (
    <View
      style={styles.fila}
      accessible
      accessibilityLabel={`${nombre}: +${formatearMonto(total)}, ${porcentaje}% del total`}
    >
      <IconoCategoria icono={iconoFuente(nombre)} color={color} />
      <View style={styles.filaTextos}>
        <Text style={styles.filaNombre} numberOfLines={1}>
          {nombre}
        </Text>
        <Text style={styles.filaDetalle} numberOfLines={1}>
          <Text style={styles.filaPorcentaje}>{porcentaje}% del total</Text>
        </Text>
      </View>
      <View style={styles.filaMontos}>
        <Text style={[styles.filaMonto, styles.filaMontoIngreso]} numberOfLines={1}>
          +{formatearMonto(total)}
        </Text>
        <Text style={styles.filaMoneda}>{MONEDA}</Text>
      </View>
    </View>
  );
}

// Tarjeta de resumen de Balance del mes: Ingresos, Gastos y Balance (verde si positivo, rojo si negativo).
function TarjetaBalanceMensual({ balance }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const estado = estadoBalanceMes(balance?.balance);
  const esPositivo = estado === 'positivo';
  const esNegativo = estado === 'negativo';
  const colorBalance = esPositivo
    ? colors.exitoTexto
    : esNegativo
      ? colors.alertaTexto
      : colors.text;
  const signo = esPositivo ? '+' : esNegativo ? '−' : '';
  const textoBalance = `${signo}${formatearMonto(Math.abs(balance?.balance || 0))}`;
  const etiquetaEstado = esPositivo
    ? 'Balance positivo'
    : esNegativo
      ? 'Balance negativo'
      : 'En equilibrio';
  // La insignia va junto al título: si título + insignia no caben en la fila, queda solo el ícono.
  // `insignia` se mide solo con el texto visible, para volver a mostrarlo si luego hay ancho.
  const [anchos, setAnchos] = useState({ fila: 0, titulo: 0, insignia: 0 });
  const medir = (clave) => (e) => {
    const ancho = e.nativeEvent.layout.width;
    setAnchos((a) => (a[clave] === ancho ? a : { ...a, [clave]: ancho }));
  };
  const soloIcono = anchos.fila > 0 && anchos.titulo + espacios.sm + anchos.insignia > anchos.fila;

  return (
    <View style={[styles.tarjeta, styles.tarjetaBalance]}>
      <View>
        <View style={styles.balanceCabecera} onLayout={medir('fila')}>
          <Etiqueta style={styles.datoEtiqueta} onLayout={medir('titulo')}>
            Balance del mes
          </Etiqueta>
          <View
            style={[
              styles.insignia,
              esPositivo ? styles.insigniaExito : esNegativo ? styles.insigniaAlerta : null,
            ]}
            onLayout={soloIcono ? undefined : medir('insignia')}
            accessible
            accessibilityLabel={etiquetaEstado}
          >
            <MaterialCommunityIcons
              name={
                esPositivo ? 'check-circle-outline' : esNegativo ? 'alert-circle-outline' : 'equal'
              }
              size={14}
              color={colorBalance}
            />
            {soloIcono ? null : (
              <Text style={[styles.insigniaTexto, { color: colorBalance }]} numberOfLines={1}>
                {etiquetaEstado}
              </Text>
            )}
          </View>
        </View>
        <Text
          style={[styles.balanceHeroMonto, { color: colorBalance }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
        >
          {textoBalance} <Text style={styles.balanceHeroMoneda}>{MONEDA}</Text>
        </Text>
      </View>

      <View style={styles.divisorHorizontal} />

      <View style={styles.filaDatos}>
        <Dato
          etiqueta="Ingresos"
          nota="Entradas"
          monto={balance?.ingresos || 0}
          colorMonto={colors.exitoTexto}
        />
        <View style={styles.divisor} />
        <Dato
          etiqueta="Gastos"
          nota={balance?.gasto_fijo > 0 ? 'Var. + fijo' : 'Del mes'}
          monto={balance?.gastos || 0}
        />
        <View style={styles.divisor} />
        <View
          style={styles.dato}
          accessible
          accessibilityLabel={`Balance (${etiquetaEstado}): ${textoBalance}`}
        >
          <Etiqueta style={styles.datoEtiqueta}>Balance</Etiqueta>
          <Text
            style={[styles.datoMonto, { color: colorBalance }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {textoBalance}
          </Text>
          <Text style={styles.datoNota} numberOfLines={1}>
            Ingresos − gastos
          </Text>
        </View>
      </View>

      {balance?.gasto_fijo > 0 ? (
        <Text style={styles.balanceSubdetalle}>
          Gastos variables {formatearMonto(balance.gasto_variable)} · Suscripciones{' '}
          {formatearMonto(balance.gasto_fijo)}
        </Text>
      ) : null}
    </View>
  );
}

// Gráfica de barras comparativa de los últimos 6 meses (Ingresos vs Gastos).
function TarjetaBarrasBalance({ barras, mesActualSeleccionado }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);

  return (
    <View style={[styles.tarjeta, styles.tarjetaBarras]}>
      <View style={styles.barrasCabecera}>
        <Text style={styles.seccionTitulo}>Últimos 6 meses</Text>
        <View style={styles.leyendaFila}>
          <View style={styles.leyendaItem}>
            <View style={[styles.leyendaPunto, { backgroundColor: colors.exito }]} />
            <Text style={styles.leyendaTexto}>Ingresos</Text>
          </View>
          <View style={styles.leyendaItem}>
            <View style={[styles.leyendaPunto, { backgroundColor: colors.alerta }]} />
            <Text style={styles.leyendaTexto}>Gastos</Text>
          </View>
        </View>
      </View>

      <View style={styles.barrasLienzo}>
        {barras.map((item) => {
          const alturaIngreso =
            item.ingresos > 0
              ? Math.max(Math.round(item.fraccionIngresos * ALTURA_BARRA_MAX), ALTURA_BARRA_MIN)
              : 2;
          const alturaGasto =
            item.gastos > 0
              ? Math.max(Math.round(item.fraccionGastos * ALTURA_BARRA_MAX), ALTURA_BARRA_MIN)
              : 2;
          const activo = item.mes === mesActualSeleccionado;
          const colorNeto =
            item.estadoBalance === 'positivo'
              ? colors.exitoTexto
              : item.estadoBalance === 'negativo'
                ? colors.alertaTexto
                : colors.textSecondary;

          return (
            <View
              key={item.mes}
              style={[styles.columnaMes, activo ? styles.columnaMesActiva : null]}
              accessible
              accessibilityLabel={`${item.etiqueta}: ingresos ${formatearMonto(item.ingresos)}, gastos ${formatearMonto(item.gastos)}, balance ${formatearMonto(item.balance)}`}
            >
              <View style={styles.parBarras}>
                <View
                  style={[
                    styles.barra,
                    {
                      height: alturaIngreso,
                      backgroundColor: item.ingresos > 0 ? colors.exito : colors.outlineVariant30,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.barra,
                    {
                      height: alturaGasto,
                      backgroundColor: item.gastos > 0 ? colors.alerta : colors.outlineVariant30,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.etiquetaMesBarra, activo ? styles.etiquetaMesActiva : null]}>
                {item.etiqueta}
              </Text>
              <Text style={[styles.balanceMini, { color: colorNeto }]} numberOfLines={1}>
                {item.balance > 0 ? '+' : item.balance < 0 ? '−' : ''}
                {Math.round(Math.abs(item.balance))}
              </Text>
            </View>
          );
        })}
      </View>
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
    selectorVista: {
      marginTop: espacios.xs,
    },
    zonaDona: {
      marginTop: espacios.lg - (espacios.sm + 4) - espacios.xs,
      marginBottom: espacios.lg - espacios.md,
    },
    indicadorMes: {
      position: 'absolute',
      top: 0,
      right: 0,
    },
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
    divisorHorizontal: {
      height: 1,
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
    insignia: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
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
    filaMontoIngreso: {
      color: colors.exitoTexto,
    },
    filaMoneda: {
      ...tipografia.labelCaps,
      fontSize: 10,
      color: colors.textSecondary,
    },
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
    // Balance
    tarjetaBalance: {
      gap: espacios.md,
    },
    balanceCabecera: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: espacios.sm,
    },
    balanceHeroMonto: {
      ...tipografia.financialMetricLg,
      flexShrink: 1,
      fontSize: 28,
      lineHeight: 34,
      marginTop: 4,
    },
    balanceHeroMoneda: {
      ...tipografia.labelCaps,
      fontSize: 12,
      color: colors.textSecondary,
    },
    balanceSubdetalle: {
      ...tipografia.bodySm,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    tarjetaBarras: {
      gap: espacios.md,
    },
    barrasCabecera: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: espacios.sm,
    },
    leyendaFila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacios.md,
    },
    leyendaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    leyendaPunto: {
      width: 8,
      height: 8,
      borderRadius: radios.full,
    },
    leyendaTexto: {
      ...tipografia.bodySm,
      color: colors.textSecondary,
    },
    barrasLienzo: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingTop: espacios.sm,
      gap: espacios.xs,
    },
    columnaMes: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 2,
      borderRadius: radios.xl,
      gap: 4,
    },
    columnaMesActiva: {
      backgroundColor: colors.glass05,
    },
    parBarras: {
      height: ALTURA_BARRA_MAX,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'center',
      gap: 4,
    },
    barra: {
      width: 10,
      borderRadius: radios.sm,
    },
    etiquetaMesBarra: {
      ...tipografia.labelCaps,
      fontSize: 10,
      color: colors.textSecondary,
    },
    etiquetaMesActiva: {
      color: colors.text,
      fontFamily: fonts.sansBold,
    },
    balanceMini: {
      fontFamily: fonts.monoMedium,
      fontSize: 9,
      lineHeight: 12,
    },
    vacio: {
      paddingVertical: espacios.sm,
    },
  });
