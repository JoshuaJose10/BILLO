import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EstadoPantalla from '../components/EstadoPantalla';
import FondoDegradado from '../components/FondoDegradado';
import SelectorCategorias from '../components/SelectorCategorias';
import { useCategorias } from '../context/CategoriasContext';
import { useCategoriasService } from '../services/categorias';
import { registrarColoresCategorias } from '../theme/categorias';
import { fonts } from '../theme/fonts';
import { useEstilos, useTema } from '../theme/TemaContext';
import {
  combinarCategoriasConPredefinidas,
  extraerCategoriasPropias,
  MENSAJE_CATEGORIA_EN_USO,
} from '../utils/categorias';
import { mensajeError } from '../utils/errores';
import { categoriasDeGasto } from '../utils/presupuestos';

// Pantalla Perfil › «Mis categorías» (HU-90):
// - Predefinidas: lista con interruptor (GET /categorias/predefinidas → PUT /categorias/seleccion).
//   Mínimo una activa («Debes tener al menos una categoría»). Al apagar una, avisa:
//   «Tus gastos anteriores se conservan; solo dejará de ofrecerse al registrar».
// - Propias: sección aparte con «Agregar categoría» (POST /categorias, 1..40 caracteres),
//   renombrar (PUT /categorias/:id) y borrar (DELETE /categorias/:id) con confirmación.
//   Si responde 409 CATEGORIA_EN_USO, muestra «Esta categoría tiene gastos o presupuestos; no se puede borrar».
// - La lista y la hoja de agregar/renombrar son SelectorCategorias (compartido con HU-89).
// - Al cambiar o salir, recarga CategoriasContext para actualizar Nuevo gasto y Presupuestos al momento.
export default function MisCategoriasScreen({ navigation }) {
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const { recargar: recargarContexto } = useCategorias();
  const {
    listarCategorias,
    listarPredefinidas,
    guardarSeleccion,
    crearCategoria,
    renombrarCategoria,
    eliminarCategoria,
  } = useCategoriasService();

  const [predefinidas, setPredefinidas] = useState([]);
  const [propias, setPropias] = useState([]);
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [errorCarga, setErrorCarga] = useState(null);

  const [guardandoSeleccionId, setGuardandoSeleccionId] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [aviso, setAviso] = useState(null); // { tipo: 'info' | 'error', texto: string }

  const huboCambiosRef = useRef(false);
  const ultimaPeticion = useRef(0);

  const cargar = useCallback(() => {
    const peticion = ++ultimaPeticion.current;
    Promise.all([listarPredefinidas(), listarCategorias()])
      .then(([listaPredefinidas, listaActivas]) => {
        if (peticion !== ultimaPeticion.current) return;
        const predefinidasGasto = categoriasDeGasto(listaPredefinidas);
        const propiasUsuario = extraerCategoriasPropias(listaActivas);
        registrarColoresCategorias(
          combinarCategoriasConPredefinidas(listaActivas, predefinidasGasto),
        );
        setPredefinidas(predefinidasGasto);
        setPropias(propiasUsuario);
        setErrorCarga(null);
        setEstado('listo');
      })
      .catch((err) => {
        if (peticion !== ultimaPeticion.current) return;
        setErrorCarga(err);
        setEstado('error');
      });
  }, [listarPredefinidas, listarCategorias]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Al desmontar la pantalla, si hubo cambios se asegura de refrescar la caché global.
  useEffect(
    () => () => {
      if (huboCambiosRef.current) {
        recargarContexto();
      }
    },
    [recargarContexto],
  );

  const volver = () => {
    recargarContexto();
    navigation.goBack();
  };

  const reintentar = () => {
    setEstado('cargando');
    setErrorCarga(null);
    cargar();
  };

  // Cada interruptor se guarda al momento; si falla, vuelve al estado anterior.
  const alternarPredefinida = async (cambio, nuevas, categoria) => {
    const previas = predefinidas;
    setPredefinidas(nuevas);
    setAviso(cambio.aviso ? { tipo: 'info', texto: cambio.aviso } : null);
    setGuardandoSeleccionId(categoria.id);

    try {
      await guardarSeleccion(cambio.seleccionIds);
      huboCambiosRef.current = true;
      recargarContexto();
    } catch (err) {
      setPredefinidas(previas);
      setAviso({ tipo: 'error', texto: mensajeError(err?.code, err?.message) });
    } finally {
      setGuardandoSeleccionId(null);
    }
  };

  const guardarPropia = async (nombre, editando) => {
    const guardada = editando
      ? await renombrarCategoria(editando.id, nombre)
      : await crearCategoria(nombre);
    const nuevasPropias = editando
      ? propias.map((c) => (String(c.id) === String(editando.id) ? { ...c, ...guardada } : c))
      : [...propias, guardada];
    registrarColoresCategorias(nuevasPropias);
    setPropias(nuevasPropias);
    huboCambiosRef.current = true;
    recargarContexto();
  };

  const confirmarEliminar = (categoria) => {
    if (eliminandoId != null) return;
    Alert.alert('Eliminar categoría', `¿Quieres eliminar «${categoria.nombre}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => ejecutarEliminar(categoria),
      },
    ]);
  };

  const ejecutarEliminar = async (categoria) => {
    setEliminandoId(categoria.id);
    setAviso(null);
    try {
      await eliminarCategoria(categoria.id);
      const nuevasPropias = propias.filter((c) => String(c.id) !== String(categoria.id));
      registrarColoresCategorias(nuevasPropias);
      setPropias(nuevasPropias);
      huboCambiosRef.current = true;
      recargarContexto();
    } catch (err) {
      const msg =
        err?.code === 'CATEGORIA_EN_USO' || err?.status === 409
          ? MENSAJE_CATEGORIA_EN_USO
          : mensajeError(err?.code, err?.message);
      setAviso({ tipo: 'error', texto: msg });
      Alert.alert('No se puede borrar', msg);
    } finally {
      setEliminandoId(null);
    }
  };

  const accionesPropia = (cat, { renombrar }) => {
    const eliminando = String(eliminandoId) === String(cat.id);
    return [
      {
        icono: 'pencil-outline',
        etiqueta: `Renombrar ${cat.nombre}`,
        onPress: () => renombrar(cat),
        disabled: eliminando,
      },
      {
        icono: 'trash-can-outline',
        etiqueta: `Borrar ${cat.nombre}`,
        onPress: () => confirmarEliminar(cat),
        peligro: true,
        cargando: eliminando,
      },
    ];
  };

  return (
    <SafeAreaView style={styles.pantalla} edges={['top', 'bottom']}>
      <FondoDegradado />

      <View style={styles.cabecera}>
        <Pressable
          onPress={volver}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={({ pressed }) => [styles.botonVolver, pressed && styles.presionado]}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.cabeceraTextos}>
          <Text style={styles.titulo} accessibilityRole="header">
            Mis categorías
          </Text>
          <Text style={styles.subtitulo}>Elige las predefinidas que usas o crea las tuyas</Text>
        </View>
      </View>

      {estado !== 'listo' ? (
        <EstadoPantalla estado={estado} error={errorCarga} onReintentar={reintentar} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SelectorCategorias
            predefinidas={predefinidas}
            ocupadoId={guardandoSeleccionId}
            onCambioSeleccion={alternarPredefinida}
            onAviso={setAviso}
            propias={propias}
            accionesPropia={accionesPropia}
            onGuardarPropia={guardarPropia}
            aviso={aviso}
            bloqueado={eliminandoId != null}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    pantalla: {
      flex: 1,
      backgroundColor: colors.background,
    },
    cabecera: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 12,
    },
    botonVolver: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cabeceraTextos: {
      flex: 1,
    },
    titulo: {
      fontFamily: fonts.sansBold,
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.4,
      color: colors.text,
    },
    subtitulo: {
      fontFamily: fonts.sans,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    contenido: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 36,
    },
    presionado: {
      opacity: 0.75,
    },
  });
