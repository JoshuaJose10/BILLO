import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
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
import FondoDegradado from '../components/FondoDegradado';
import ItemGasto from '../components/ItemGasto';
import { useAlturaNavbar } from '../components/NavbarFlotante';
import TarjetaResumen from '../components/TarjetaResumen';
import { useAuth } from '../context/AuthContext';
import { useGastosService } from '../services/gastos';
import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { mensajeError } from '../utils/errores';
import { mesActual } from '../utils/fechas';

// Las N categorías con más gasto: [{ id, nombre, total }] de mayor a menor.
const categoriasPrincipales = (gastos, nombres, n = 3) => {
  const totales = {};
  gastos.forEach((g) => {
    totales[g.categoria_id] = (totales[g.categoria_id] || 0) + g.monto;
  });
  return Object.entries(totales)
    .map(([id, total]) => ({ id, nombre: nombres[id], total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
};

// Del más reciente al más antiguo (fecha y luego id, igual que el backend).
const ordenarGastos = (gastos) =>
  [...gastos].sort((a, b) => (a.fecha === b.fecha ? b.id - a.id : a.fecha < b.fecha ? 1 : -1));

export default function InicioScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const alturaNavbar = useAlturaNavbar();
  const { usuario } = useAuth();
  const { listarCategorias, listarGastos } = useGastosService();
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);

  const [gastos, setGastos] = useState([]);
  const [gastosMes, setGastosMes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [textoError, setTextoError] = useState('');
  const [refrescando, setRefrescando] = useState(false);
  const [hayDatos, setHayDatos] = useState(false);

  const cargar = useCallback(async () => {
    // Recarga en silencio: el indicador de pantalla completa solo aparece en la primera carga
    // (estado inicial) o al reintentar desde la pantalla de error.
    try {
      const [lista, delMes, cats] = await Promise.all([
        listarGastos(),
        listarGastos({ mes: mesActual() }),
        listarCategorias(),
      ]);
      setGastos(ordenarGastos(lista));
      setGastosMes(delMes);
      setCategorias(cats || []);
      setEstado('listo');
      setHayDatos(true);
    } catch (error) {
      setTextoError(mensajeError(error?.code, error?.message));
      setEstado('error');
    }
  }, [listarCategorias, listarGastos]);

  // Recarga cada vez que Inicio gana foco (por ejemplo al cerrar la hoja de Nuevo gasto).
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

  const nombresCategoria = useMemo(
    () => Object.fromEntries(categorias.map((c) => [c.id, c.nombre])),
    [categorias],
  );

  const totalMes = useMemo(() => gastosMes.reduce((suma, g) => suma + g.monto, 0), [gastosMes]);
  const principales = useMemo(
    () => categoriasPrincipales(gastosMes, nombresCategoria),
    [gastosMes, nombresCategoria],
  );
  const primerNombre = (usuario?.nombre || '').trim().split(' ')[0];

  const abrirNuevoGasto = () => navigation.navigate('NuevoGasto');

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

      <TarjetaResumen total={totalMes} principales={principales} />
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

  if (estado === 'cargando') {
    return (
      <View style={[styles.pantalla, styles.centro]}>
        <FondoDegradado />
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  const reintentar = () => {
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
        data={gastos}
        keyExtractor={(g) => String(g.id)}
        renderItem={({ item }) => (
          <View style={styles.panelFila}>
            <ItemGasto gasto={item} nombreCategoria={nombresCategoria[item.categoria_id]} />
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
        ListFooterComponent={<View style={styles.panelPie} />}
        ListEmptyComponent={
          <View style={[styles.panelFila, styles.vacio]}>
            <MaterialCommunityIcons
              name="receipt-text-outline"
              size={40}
              color={colors.textSecondary}
            />
            <Text style={styles.estadoTitulo}>Aún no tienes gastos</Text>
            <Pressable onPress={abrirNuevoGasto} hitSlop={8} accessibilityRole="button">
              <Text style={styles.enlace}>Registra tu primer gasto</Text>
            </Pressable>
          </View>
        }
        ItemSeparatorComponent={Separador}
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
      height: 16,
      borderBottomLeftRadius: radios.panel,
      borderBottomRightRadius: radios.panel,
      backgroundColor: colors.surfaceLowest80,
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
      color: colors.alerta,
      fontSize: 14,
    },
    avisoAccion: {
      fontFamily: fonts.sansBold,
      color: colors.text,
      fontSize: 14,
    },
  });
