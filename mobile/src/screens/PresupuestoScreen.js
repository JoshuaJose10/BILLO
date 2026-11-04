import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import Boton from '../components/Boton';
import ChipCategoria from '../components/ChipCategoria';
import ChipSelector from '../components/ChipSelector';
import Etiqueta from '../components/Etiqueta';
import HojaInferior from '../components/HojaInferior';
import IconoCategoria from '../components/IconoCategoria';
import MontoGrande from '../components/MontoGrande';
import TecladoNumerico from '../components/TecladoNumerico';
import { usePresupuestosService } from '../services/presupuestos';
import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { mensajeError } from '../utils/errores';
import { mesActual } from '../utils/fechas';
import { nombreMesAnio } from '../utils/formato';
import { aplicarTecla, montoDesdeTexto, textoDesdeMonto } from '../utils/monto';

const NO_EXISTE = 'Este presupuesto ya no existe. Cierra para actualizar la lista.';

// Hoja "Presupuesto" (ruta con presentation: 'transparentModal'), se abre desde Cartera con
// `route.params` { mes, presupuesto? }.
// - Crear: se elige la categoría (solo de gasto) y el límite. Las categorías que ya tienen
//   presupuesto ese mes dicen "Ya tiene" y al tocarlas se edita el existente.
// - Editar: la categoría queda fija (la API solo cambia monto_limite); se puede eliminar.
// Un 409 PRESUPUESTO_DUPLICADO ofrece editar el existente; un 404 avisa que ya no existe.
export default function PresupuestoScreen({ navigation, route }) {
  const mes = route.params?.mes ?? mesActual();
  const {
    listarPresupuestos,
    listarCategoriasGasto,
    crearPresupuesto,
    actualizarPresupuesto,
    eliminarPresupuesto,
  } = usePresupuestosService();
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);

  // El presupuesto que se edita; null al crear. Puede pasar de crear a editar (categoría que
  // ya tiene presupuesto o 409).
  const [presupuesto, setPresupuesto] = useState(route.params?.presupuesto ?? null);
  const editando = presupuesto != null;
  const [texto, setTexto] = useState(() =>
    presupuesto ? textoDesdeMonto(presupuesto.monto_limite) : '',
  );
  const [categoriaId, setCategoriaId] = useState(null);

  // Categorías de gasto y presupuestos que ya hay ese mes (para marcar "Ya tiene").
  const [categorias, setCategorias] = useState([]);
  const [existentes, setExistentes] = useState([]);
  const [estadoCategorias, setEstadoCategorias] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [intento, setIntento] = useState(0);

  const [errores, setErrores] = useState({});
  const [errorApi, setErrorApi] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const enviando = useRef(false);
  const hojaRef = useRef(null);
  const ocupado = guardando || eliminando;

  // Solo hacen falta al crear; al editar la categoría es fija.
  useEffect(() => {
    if (editando) return undefined;
    let activo = true;
    Promise.all([listarCategoriasGasto(), listarPresupuestos(mes)])
      .then(([cats, lista]) => {
        if (!activo) return;
        setCategorias(cats);
        setExistentes(lista);
        setEstadoCategorias('listo');
      })
      .catch(() => {
        if (activo) setEstadoCategorias('error');
      });
    return () => {
      activo = false;
    };
  }, [editando, listarCategoriasGasto, listarPresupuestos, mes, intento]);

  const reintentarCategorias = () => {
    setEstadoCategorias('cargando');
    setIntento((n) => n + 1);
  };

  const limpiarErrores = (campo) => {
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
    if (errorApi) setErrorApi('');
  };

  const alPulsarTecla = (tecla) => {
    setTexto((actual) => aplicarTecla(actual, tecla));
    limpiarErrores('monto');
  };

  // Pasa a editar un presupuesto existente. `conservarMonto`: deja el monto que se tecleó (al
  // venir de un 409, para guardarlo como nuevo límite).
  const editarExistente = (existente, conservarMonto = false) => {
    setPresupuesto(existente);
    if (!conservarMonto) setTexto(textoDesdeMonto(existente.monto_limite));
    setErrores({});
    setErrorApi('');
  };

  const elegirCategoria = (categoria) => {
    const existente = existentes.find((p) => p.categoria_id === categoria.id);
    if (existente) {
      editarExistente(existente);
      return;
    }
    setCategoriaId(categoria.id);
    limpiarErrores('categoria');
  };

  // 409: el presupuesto de esa categoría y mes ya existe (por ejemplo, creado en otro
  // dispositivo). Se recarga la lista para obtener su id y se ofrece editarlo.
  const ofrecerEditarDuplicado = () => {
    const nombre = categorias.find((c) => c.id === categoriaId)?.nombre ?? 'esa categoría';
    Alert.alert(
      'Ya existe',
      `Ya tienes un presupuesto de ${nombre} en ${nombreMesAnio(mes)}. ¿Editarlo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Editarlo',
          onPress: async () => {
            try {
              const lista = await listarPresupuestos(mes);
              setExistentes(lista);
              const existente = lista.find((p) => p.categoria_id === categoriaId);
              if (existente) {
                editarExistente(existente, true);
              } else {
                setErrorApi('No encontramos ese presupuesto. Intenta de nuevo.');
              }
            } catch (error) {
              setErrorApi(mensajeError(error?.code, error?.message));
            }
          },
        },
      ],
    );
  };

  const guardar = async () => {
    if (enviando.current) return;

    const monto = montoDesdeTexto(texto);
    const nuevos = {};
    if (!(monto > 0)) nuevos.monto = 'Ingresa un monto mayor a $0';
    if (!editando && !categoriaId) nuevos.categoria = 'Elige una categoría';
    setErrores(nuevos);
    setErrorApi('');
    if (nuevos.monto || nuevos.categoria) return;

    enviando.current = true;
    setGuardando(true);
    try {
      if (editando) {
        await actualizarPresupuesto(presupuesto.id, monto);
      } else {
        await crearPresupuesto({ categoria_id: categoriaId, mes, monto_limite: monto });
      }
      enviando.current = false;
      hojaRef.current?.cerrar();
    } catch (error) {
      enviando.current = false;
      setGuardando(false);
      if (!editando && error?.code === 'PRESUPUESTO_DUPLICADO') {
        ofrecerEditarDuplicado();
      } else if (error?.code === 'PRESUPUESTO_NO_ENCONTRADO') {
        setErrorApi(NO_EXISTE);
      } else {
        setErrorApi(mensajeError(error?.code, error?.message));
      }
    }
  };

  const eliminar = async () => {
    if (enviando.current) return;
    enviando.current = true;
    setEliminando(true);
    setErrorApi('');
    try {
      await eliminarPresupuesto(presupuesto.id);
      enviando.current = false;
      hojaRef.current?.cerrar();
    } catch (error) {
      enviando.current = false;
      setEliminando(false);
      setErrorApi(
        error?.code === 'PRESUPUESTO_NO_ENCONTRADO'
          ? NO_EXISTE
          : mensajeError(error?.code, error?.message),
      );
    }
  };

  // Cancelar no hace nada; Eliminar borra el presupuesto y cierra la hoja.
  const confirmarEliminar = () => {
    if (enviando.current) return;
    Alert.alert('¿Eliminar presupuesto?', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: eliminar },
    ]);
  };

  const tieneYa = (categoria) => existentes.some((p) => p.categoria_id === categoria.id);

  return (
    <HojaInferior
      ref={hojaRef}
      titulo={editando ? 'Editar presupuesto' : 'Nuevo presupuesto'}
      etiquetaFondo={editando ? 'Cerrar editar presupuesto' : 'Cerrar nuevo presupuesto'}
      onCerrada={() => navigation.goBack()}
      bloqueada={ocupado}
    >
      <Etiqueta style={styles.mes}>{nombreMesAnio(mes)}</Etiqueta>

      {editando ? (
        // La categoría no se puede cambiar al editar (la API solo cambia el límite).
        <View style={styles.categoriaFija}>
          <IconoCategoria nombre={presupuesto.categoria} />
          <Text style={styles.categoriaNombre} numberOfLines={1}>
            {presupuesto.categoria}
          </Text>
        </View>
      ) : (
        <View style={styles.zonaCategorias}>
          {estadoCategorias === 'cargando' ? (
            <View style={styles.estadoCategorias}>
              <ActivityIndicator color={colors.textSecondary} />
              <Text style={styles.textoEstado}>Cargando categorías…</Text>
            </View>
          ) : estadoCategorias === 'error' ? (
            <View style={styles.estadoCategorias}>
              <Text style={styles.textoEstado}>No se pudieron cargar</Text>
              <ChipSelector icono="refresh" etiqueta="Reintentar" onPress={reintentarCategorias} />
            </View>
          ) : categorias.length === 0 ? (
            <Text style={styles.textoEstado}>No hay categorías disponibles</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filaScroll}
              contentContainerStyle={styles.filaCategorias}
            >
              {categorias.map((c) => (
                <ChipCategoria
                  key={c.id}
                  nombre={c.nombre}
                  nota={tieneYa(c) ? 'Ya tiene' : undefined}
                  seleccionado={c.id === categoriaId}
                  error={!!errores.categoria}
                  onPress={() => elegirCategoria(c)}
                />
              ))}
            </ScrollView>
          )}
        </View>
      )}
      {errores.categoria ? <Text style={styles.errorCampo}>{errores.categoria}</Text> : null}

      <View style={styles.zonaMonto}>
        <MontoGrande texto={texto} error={!!errores.monto} etiqueta="Límite" />
      </View>
      {errores.monto ? <Text style={styles.errorCampo}>{errores.monto}</Text> : null}

      <View style={styles.zonaTeclado}>
        <TecladoNumerico onTecla={alPulsarTecla} disabled={ocupado} />
      </View>

      {errorApi ? <Text style={styles.errorApi}>{errorApi}</Text> : null}
      <Boton
        titulo={editando ? 'Guardar cambios' : 'Crear presupuesto'}
        icono="check"
        onPress={guardar}
        cargando={guardando}
        disabled={eliminando}
        compacto
      />
      {editando ? (
        <View style={styles.zonaEliminar}>
          <Boton
            titulo="Eliminar presupuesto"
            icono="trash-can-outline"
            onPress={confirmarEliminar}
            cargando={eliminando}
            disabled={guardando}
            destructivo
          />
        </View>
      ) : null}
    </HojaInferior>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    mes: {
      marginTop: 4,
    },
    // Fila de chips hasta el borde de la hoja (px-5)
    filaScroll: {
      marginHorizontal: -20,
      flexGrow: 0,
    },
    filaCategorias: {
      gap: 6,
      paddingHorizontal: 20,
      paddingVertical: 2,
    },
    zonaCategorias: {
      minHeight: 32,
      justifyContent: 'center',
      marginTop: 12,
      marginBottom: 8,
    },
    estadoCategorias: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    textoEstado: {
      fontFamily: fonts.sans,
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    categoriaFija: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 12,
      marginBottom: 8,
      padding: 10,
      borderRadius: radios['2xl'],
      backgroundColor: colors.glass05,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    categoriaNombre: {
      fontFamily: fonts.sansSemiBold,
      flex: 1,
      fontSize: 16,
      lineHeight: 22,
      color: colors.text,
    },
    errorCampo: {
      fontFamily: fonts.sans,
      color: colors.alerta,
      fontSize: 12,
      lineHeight: 16,
      marginTop: -4,
      marginBottom: 8,
    },
    zonaMonto: {
      marginTop: 4,
      marginBottom: 8,
    },
    zonaTeclado: {
      marginBottom: 10,
    },
    errorApi: {
      fontFamily: fonts.sans,
      color: colors.alerta,
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 10,
    },
    zonaEliminar: {
      marginTop: 10,
    },
  });
