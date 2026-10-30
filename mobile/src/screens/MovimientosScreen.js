import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Boton from '../components/Boton';
import EncabezadoDia from '../components/EncabezadoDia';
import Etiqueta from '../components/Etiqueta';
import FiltroCategorias from '../components/FiltroCategorias';
import FondoDegradado from '../components/FondoDegradado';
import ItemGasto from '../components/ItemGasto';
import { useAlturaNavbar } from '../components/NavbarFlotante';
import SelectorMes from '../components/SelectorMes';
import { etiquetaMetodoPago, useGastosService } from '../services/gastos';
import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { mensajeError } from '../utils/errores';
import { mesActual } from '../utils/fechas';
import { formatearMonto, nombreMes, tituloDia } from '../utils/formato';

// Secciones por día para SectionList: [{ fecha, titulo, total, data }], del día más reciente
// al más antiguo y, dentro de cada día, del gasto más reciente al más antiguo (id descendente).
// `fecha` ya es "YYYY-MM-DD" local (el backend guarda DATE), así que se agrupa por el texto.
const agruparPorDia = (gastos) => {
  const ordenados = [...gastos].sort((a, b) =>
    a.fecha === b.fecha ? b.id - a.id : a.fecha < b.fecha ? 1 : -1,
  );
  const secciones = [];
  ordenados.forEach((g) => {
    const ultima = secciones[secciones.length - 1];
    if (ultima && ultima.fecha === g.fecha) {
      ultima.data.push(g);
      ultima.total += g.monto;
    } else {
      secciones.push({ fecha: g.fecha, titulo: tituloDia(g.fecha), total: g.monto, data: [g] });
    }
  });
  return secciones;
};

export default function MovimientosScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const alturaNavbar = useAlturaNavbar();
  const { listarCategorias, listarGastos } = useGastosService();
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);

  // Filtro elegido en pantalla.
  const [mes, setMes] = useState(mesActual);
  const [categoriaId, setCategoriaId] = useState(null);

  // Datos de la última respuesta válida y el filtro con el que se pidieron.
  const [gastos, setGastos] = useState([]);
  const [filtroCargado, setFiltroCargado] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [textoError, setTextoError] = useState('');
  const [refrescando, setRefrescando] = useState(false);

  // Cada petición recibe un número; si al responder ya hay una más nueva, se descarta.
  const ultimaPeticion = useRef(0);

  const cargar = useCallback(async () => {
    const peticion = ++ultimaPeticion.current;
    try {
      const [lista, cats] = await Promise.all([
        listarGastos({ mes, categoria_id: categoriaId }),
        listarCategorias(),
      ]);
      if (peticion !== ultimaPeticion.current) return;
      setGastos(lista);
      setCategorias(cats || []);
      setFiltroCargado({ mes, categoriaId });
      setEstado('listo');
    } catch (error) {
      if (peticion !== ultimaPeticion.current) return;
      setTextoError(mensajeError(error?.code, error?.message));
      setEstado('error');
    }
  }, [listarCategorias, listarGastos, mes, categoriaId]);

  // Recarga al ganar foco (un gasto nuevo aparece al volver de NuevoGasto) y, como `cargar`
  // cambia con el filtro, también al cambiar de mes o de categoría.
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

  // Al cambiar de filtro se conserva la lista anterior (atenuada) mientras llega la nueva.
  // Desde el estado de error se vuelve al indicador de carga.
  const cambiarFiltro = (aplicar) => {
    aplicar();
    if (estado === 'error') setEstado('cargando');
  };

  const reintentar = () => {
    setEstado('cargando');
    cargar();
  };

  const nombresCategoria = useMemo(
    () => Object.fromEntries(categorias.map((c) => [c.id, c.nombre])),
    [categorias],
  );

  const secciones = useMemo(() => agruparPorDia(gastos), [gastos]);
  const total = useMemo(() => gastos.reduce((suma, g) => suma + g.monto, 0), [gastos]);

  // Textos del resumen y del estado vacío: describen lo que se está mostrando.
  const mesMostrado = filtroCargado?.mes ?? mes;
  const categoriaMostrada =
    filtroCargado?.categoriaId != null ? nombresCategoria[filtroCargado.categoriaId] : null;
  const nombreDelMes = nombreMes(mesMostrado);
  const etiquetaResumen = categoriaMostrada
    ? `Gastado en ${categoriaMostrada} · ${nombreDelMes}`
    : `Gastado en ${nombreDelMes}`;
  const periodo = mesMostrado === mesActual() ? 'este mes' : `en ${nombreDelMes}`;
  const textoVacio = categoriaMostrada
    ? `Sin gastos de ${categoriaMostrada} ${periodo}`
    : `Sin gastos ${periodo}`;

  const listo = estado === 'listo';
  // Se eligió otro mes o categoría y la respuesta aún no llega: la lista anterior se atenúa.
  const cambiandoFiltro =
    listo && (filtroCargado?.mes !== mes || filtroCargado?.categoriaId !== categoriaId);
  const atenuado = cambiandoFiltro ? styles.atenuado : null;
  const cantidad = gastos.length;

  const encabezado = (
    <View style={styles.encabezado}>
      <Text style={styles.titulo} accessibilityRole="header">
        Movimientos
      </Text>

      <SelectorMes mes={mes} onCambiar={(nuevo) => cambiarFiltro(() => setMes(nuevo))} />

      <View style={[styles.resumen, atenuado]}>
        <View style={styles.resumenTextos}>
          <Etiqueta style={styles.resumenEtiqueta}>{etiquetaResumen}</Etiqueta>
          <Text style={styles.resumenTotal} numberOfLines={1} adjustsFontSizeToFit>
            {listo ? formatearMonto(total) : '—'}
          </Text>
          <Text style={styles.resumenConteo}>
            {listo ? `${cantidad} ${cantidad === 1 ? 'movimiento' : 'movimientos'}` : ' '}
          </Text>
        </View>
        {cambiandoFiltro ? <ActivityIndicator size="small" color={colors.textSecondary} /> : null}
      </View>

      {categorias.length > 0 ? (
        <FiltroCategorias
          categorias={categorias}
          seleccionada={categoriaId}
          onSeleccionar={(id) => cambiarFiltro(() => setCategoriaId(id))}
        />
      ) : null}
    </View>
  );

  let contenidoVacio;
  if (estado === 'cargando') {
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
        <MaterialCommunityIcons
          name="receipt-text-outline"
          size={40}
          color={colors.textSecondary}
        />
        <Text style={styles.estadoTitulo}>{textoVacio}</Text>
        <View style={styles.estadoBoton}>
          <Boton
            titulo="Registrar gasto"
            icono="plus"
            onPress={() => navigation.navigate('NuevoGasto')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      <FondoDegradado />
      <SectionList
        sections={listo ? secciones : []}
        keyExtractor={(g) => String(g.id)}
        renderSectionHeader={({ section }) => (
          <EncabezadoDia
            titulo={section.titulo}
            total={section.total}
            style={[styles.encabezadoDia, atenuado]}
          />
        )}
        renderItem={({ item }) => (
          <View style={atenuado}>
            <ItemGasto
              gasto={item}
              nombreCategoria={nombresCategoria[item.categoria_id]}
              metodoPago={etiquetaMetodoPago(item.metodo_pago)}
            />
          </View>
        )}
        ItemSeparatorComponent={Separador}
        ListHeaderComponent={encabezado}
        ListEmptyComponent={contenidoVacio}
        ListFooterComponent={listo && secciones.length > 0 ? <FinDeLista /> : null}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[
          styles.lista,
          { paddingTop: insets.top + 4, paddingBottom: alturaNavbar + 16 },
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

function FinDeLista() {
  const styles = useEstilos(crearEstilos);
  return (
    <View style={styles.fin}>
      <View style={styles.finBarra} />
      <Text style={styles.finTexto}>Fin de los movimientos del periodo</Text>
    </View>
  );
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
    // flex flex-col gap-space-sm pt-space-xs
    encabezado: {
      gap: 12,
      paddingTop: 4,
    },
    // headline-lg (28/34, -0.02em) en bold
    titulo: {
      fontFamily: fonts.sansBold,
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.56,
      color: colors.text,
    },
    // p-space-md bg-surface-container-low rounded-xl shadow-[0_8px_24px_-6px] negro al 50%
    resumen: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
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
    resumenTextos: {
      flex: 1,
    },
    // font-label-caps text-outline uppercase tracking-wider
    resumenEtiqueta: {
      color: colors.outline,
    },
    // financial-metric-lg: JetBrains Mono 600 32/36, -0.02em
    resumenTotal: {
      fontFamily: fonts.monoSemiBold,
      fontSize: 32,
      lineHeight: 36,
      letterSpacing: -0.64,
      color: colors.text,
      marginTop: 6,
    },
    // body-sm text-on-surface-variant
    resumenConteo: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.12,
      color: colors.textVariant,
      marginTop: 4,
    },
    // mt-space-lg entre grupos, gap-space-sm entre encabezado y gastos
    encabezadoDia: {
      marginTop: 24,
      marginBottom: 8,
    },
    // gap-2 entre gastos
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
    estadoBoton: {
      alignSelf: 'stretch',
      marginTop: 12,
    },
    // mt-space-xl flex flex-col items-center py-4
    fin: {
      alignItems: 'center',
      marginTop: 32,
      paddingVertical: 16,
    },
    // w-8 h-1 rounded-full bg-surface-container-high mb-2
    finBarra: {
      width: 32,
      height: 4,
      borderRadius: radios.full,
      backgroundColor: colors.surfaceHigh,
      marginBottom: 8,
    },
    // font-label-caps text-outline uppercase tracking-widest
    finTexto: {
      fontFamily: fonts.monoMedium,
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 1,
      textTransform: 'uppercase',
      textAlign: 'center',
      color: colors.outline,
    },
  });
