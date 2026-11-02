import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BarraPresupuesto from '../components/BarraPresupuesto';
import Boton from '../components/Boton';
import Etiqueta from '../components/Etiqueta';
import FilaDeslizable, { useFilasDeslizables } from '../components/FilaDeslizable';
import FondoDegradado from '../components/FondoDegradado';
import { useAlturaNavbar } from '../components/NavbarFlotante';
import SelectorMes from '../components/SelectorMes';
import TarjetaPresupuesto, { NOMBRE_ESTADO } from '../components/TarjetaPresupuesto';
import { usePresupuestosService } from '../services/presupuestos';
import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { mensajeError } from '../utils/errores';
import { mesActual } from '../utils/fechas';
import { formatearMonto, nombreMes } from '../utils/formato';
import { avanceBarra, resumenPresupuestos } from '../utils/presupuestos';

// Cartera (RF3): presupuestos del mes por categoría con su avance. El estado y el porcentaje de
// cada uno los calcula la API. Tocar un presupuesto lo edita; deslizarlo muestra Editar y
// Eliminar. Crear y editar abren la hoja Presupuesto.
export default function CarteraScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const alturaNavbar = useAlturaNavbar();
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const { listarPresupuestos, eliminarPresupuesto } = usePresupuestosService();

  const [mes, setMes] = useState(mesActual);
  // Datos de la última respuesta válida y el mes con el que se pidieron.
  const [presupuestos, setPresupuestos] = useState([]);
  const [mesCargado, setMesCargado] = useState(null);
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [textoError, setTextoError] = useState('');
  const [refrescando, setRefrescando] = useState(false);

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

  const resumen = useMemo(() => resumenPresupuestos(presupuestos), [presupuestos]);

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
      <Text style={styles.seccion} accessibilityRole="header">
        Presupuestos
      </Text>

      <SelectorMes mes={mes} onCambiar={cambiarMes} />

      {hayPresupuestos ? (
        <View style={[styles.resumen, atenuado]}>
          <View style={styles.resumenFila}>
            <Etiqueta style={styles.resumenEtiqueta}>Gastado en {nombreDelMes}</Etiqueta>
            {cambiandoMes ? <ActivityIndicator size="small" color={colors.textSecondary} /> : null}
          </View>
          <View style={styles.resumenMontos}>
            <Text style={styles.resumenGastado} numberOfLines={1} adjustsFontSizeToFit>
              {formatearMonto(resumen.gastado)}
            </Text>
            <Text style={styles.resumenLimite} numberOfLines={1}>
              de {formatearMonto(resumen.limite)}
            </Text>
          </View>
          <BarraPresupuesto
            fraccion={avanceBarra(resumen.porcentaje)}
            porcentaje={resumen.porcentaje}
            estado={resumen.estado}
            etiqueta={`Total: ${resumen.porcentaje}% del presupuesto, ${NOMBRE_ESTADO[resumen.estado]}`}
            style={styles.resumenBarra}
          />
          <Text style={styles.resumenPorcentaje}>{resumen.porcentaje}% de lo presupuestado</Text>
        </View>
      ) : null}

      {hayPresupuestos ? (
        <Boton titulo="Agregar presupuesto" icono="plus" onPress={crearPresupuesto} compacto />
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
        data={listo ? presupuestos : []}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => (
          <View style={atenuado}>
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
          </View>
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
    // headline-sm
    seccion: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.18,
      color: colors.text,
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
    resumenBarra: {
      marginTop: 14,
    },
    // body-sm text-on-surface-variant
    resumenPorcentaje: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.12,
      color: colors.textVariant,
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
