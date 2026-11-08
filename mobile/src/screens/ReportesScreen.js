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

import Boton from '../components/Boton';
import DonaCategorias from '../components/DonaCategorias';
import Etiqueta from '../components/Etiqueta';
import FondoDegradado from '../components/FondoDegradado';
import { useAlturaNavbar } from '../components/NavbarFlotante';
import SelectorMes from '../components/SelectorMes';
import { useReportesService } from '../services/reportes';
import { espacios, radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { tipografia } from '../theme/tipografia';
import { mensajeError } from '../utils/errores';
import { mesActual } from '../utils/fechas';
import { formatearMonto } from '../utils/formato';
import { armarDatosDona, esMesSinDatos } from '../utils/reportes';

// Reportes (RF6, RF8; HU-37). Por mes, GET /reportes/resumen y /reportes/por-categoria en paralelo:
// tarjetas de gasto variable, fijo y total, y la dona por categoría. Las tarjetas se muestran
// siempre (un mes vacío da $0, CP-RF6-02); sin gastos, la dona se cambia por "Sin datos este mes".
export default function ReportesScreen() {
  const insets = useSafeAreaInsets();
  const alturaNavbar = useAlturaNavbar();
  const { obtenerResumen, obtenerPorCategoria } = useReportesService();
  const { colors, esOscuro } = useTema();
  const styles = useEstilos(crearEstilos);

  const [mes, setMes] = useState(mesActual);
  // Última respuesta válida: { mes, resumen, categorias }. Va junta para no mezclar dos meses.
  const [datos, setDatos] = useState(null);
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [textoError, setTextoError] = useState('');
  const [refrescando, setRefrescando] = useState(false);

  // Cada petición recibe un número; si al responder ya hay una más nueva, se descarta.
  const ultimaPeticion = useRef(0);

  const cargar = useCallback(async () => {
    const peticion = ++ultimaPeticion.current;
    try {
      const [resumen, categorias] = await Promise.all([
        obtenerResumen(mes),
        obtenerPorCategoria(mes),
      ]);
      if (peticion !== ultimaPeticion.current) return;
      setDatos({ mes, resumen, categorias });
      setEstado('listo');
    } catch (error) {
      if (peticion !== ultimaPeticion.current) return;
      setTextoError(mensajeError(error?.code, error?.message));
      setEstado('error');
    }
  }, [obtenerResumen, obtenerPorCategoria, mes]);

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

  const reintentar = () => {
    setEstado('cargando');
    cargar();
  };

  const datosDona = useMemo(() => armarDatosDona(datos?.categorias, esOscuro), [datos, esOscuro]);

  const cambiandoMes = estado === 'listo' && datos?.mes !== mes;

  let contenido;
  if (estado === 'cargando') {
    contenido = (
      <View style={styles.estado}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  } else if (estado === 'error') {
    contenido = (
      <View style={styles.estado}>
        <MaterialCommunityIcons name="wifi-off" size={40} color={colors.textSecondary} />
        <Text style={styles.estadoTitulo}>{textoError}</Text>
        <View style={styles.estadoBoton}>
          <Boton titulo="Reintentar" onPress={reintentar} />
        </View>
      </View>
    );
  } else {
    const { resumen, categorias } = datos;
    contenido = (
      <View style={[styles.contenido, cambiandoMes ? styles.atenuado : null]}>
        <View style={styles.filaTarjetas}>
          <TarjetaMonto etiqueta="Gasto variable" monto={resumen.gasto_variable} />
          <TarjetaMonto etiqueta="Gasto fijo" monto={resumen.gasto_fijo} />
        </View>
        <TarjetaMonto etiqueta="Total del mes" monto={resumen.total} destacada />

        <View style={[styles.tarjeta, styles.tarjetaDona]}>
          <View style={styles.tarjetaCabecera}>
            <Text style={styles.seccionTitulo} accessibilityRole="header">
              Gasto por categoría
            </Text>
            {cambiandoMes ? <ActivityIndicator size="small" color={colors.textSecondary} /> : null}
          </View>
          {datosDona.length > 0 ? (
            <DonaCategorias datos={datosDona} total={resumen.gasto_variable} />
          ) : (
            <View style={styles.vacio}>
              <MaterialCommunityIcons name="chart-donut" size={40} color={colors.textSecondary} />
              <Text style={styles.estadoTitulo}>Sin datos este mes</Text>
              <Text style={styles.estadoTexto}>
                {esMesSinDatos(resumen, categorias)
                  ? 'Registra un gasto para ver en qué se va tu dinero.'
                  : 'Aún no hay gastos; el total solo incluye tus suscripciones.'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      <FondoDegradado />
      <ScrollView
        contentContainerStyle={[
          styles.lista,
          { paddingTop: insets.top + 4, paddingBottom: alturaNavbar + 16 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={colors.text} />
        }
      >
        <Text style={styles.titulo} accessibilityRole="header">
          Reportes
        </Text>
        <SelectorMes mes={mes} onCambiar={cambiarMes} />
        {contenido}
      </ScrollView>
    </View>
  );
}

function TarjetaMonto({ etiqueta, monto, destacada = false }) {
  const styles = useEstilos(crearEstilos);
  const texto = formatearMonto(monto);
  return (
    <View
      style={[styles.tarjeta, destacada ? null : styles.tarjetaMitad]}
      accessible
      accessibilityLabel={`${etiqueta}: ${texto}`}
    >
      <Etiqueta style={styles.tarjetaEtiqueta}>{etiqueta}</Etiqueta>
      <Text
        style={destacada ? styles.montoDestacado : styles.monto}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {texto}
      </Text>
    </View>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    pantalla: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // px-margin, gap-space-sm + 4 entre bloques (como el encabezado de Movimientos)
    lista: {
      paddingHorizontal: espacios.margen,
      gap: espacios.sm + 4,
    },
    titulo: {
      ...tipografia.headlineLg,
      color: colors.text,
      marginTop: espacios.xs,
    },
    contenido: {
      gap: espacios.sm + 4,
    },
    atenuado: {
      opacity: 0.45,
    },
    filaTarjetas: {
      flexDirection: 'row',
      gap: espacios.sm + 4,
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
    // El centro de la dona se pinta con este mismo color opaco (ver DonaCategorias).
    tarjetaDona: {
      backgroundColor: colors.tarjetaResumenOpaca,
    },
    tarjetaMitad: {
      flex: 1,
    },
    tarjetaEtiqueta: {
      color: colors.outline,
    },
    monto: {
      ...tipografia.financialMetricMd,
      color: colors.text,
      marginTop: 6,
    },
    montoDestacado: {
      ...tipografia.financialMetricLg,
      color: colors.text,
      marginTop: 6,
    },
    tarjetaCabecera: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: espacios.sm + 4,
      marginBottom: espacios.md,
    },
    // Títulos de sección de Inicio (headline-sm)
    seccionTitulo: {
      ...tipografia.headlineSm,
      color: colors.text,
    },
    vacio: {
      alignItems: 'center',
      gap: 10,
      paddingVertical: espacios.lg,
    },
    // Estados de carga, error y vacío: los de Inicio y Movimientos
    estado: {
      alignItems: 'center',
      gap: 10,
      paddingVertical: 48,
      paddingHorizontal: espacios.sm + 4,
    },
    estadoTitulo: {
      ...tipografia.headlineSm,
      letterSpacing: 0,
      color: colors.text,
      textAlign: 'center',
      marginTop: espacios.sm,
    },
    estadoTexto: {
      ...tipografia.bodyMd,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    estadoBoton: {
      alignSelf: 'stretch',
      marginTop: espacios.sm + 4,
    },
  });
