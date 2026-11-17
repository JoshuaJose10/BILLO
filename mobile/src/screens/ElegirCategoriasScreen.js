import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import AuthLayout from '../components/AuthLayout';
import Boton from '../components/Boton';
import EstadoPantalla from '../components/EstadoPantalla';
import SelectorCategorias from '../components/SelectorCategorias';
import { useAuth } from '../context/AuthContext';
import { useCategorias } from '../context/CategoriasContext';
import { useCategoriasService } from '../services/categorias';
import { idsSeleccionados } from '../utils/categorias';
import { mensajeError } from '../utils/errores';
import { categoriasDeGasto } from '../utils/presupuestos';

// «Elige tus categorías» (HU-89): lo primero que ve una cuenta nueva (RootNavigator la muestra
// mientras usuario.categorias_configuradas sea false; nunca en el modo exploración).
// - Las predefinidas de gasto llegan activas (así nace la cuenta); mínimo una activa.
// - «Agregar categoría» suma propias a la lista; se crean (POST /categorias) al continuar.
// - Continuar: crea las propias pendientes y guarda la selección (PUT /categorias/seleccion).
//   Omitir: solo guarda las predefinidas como llegaron. El PUT marca la cuenta como configurada;
//   después se recarga CategoriasContext y RootNavigator pasa a Main.
export default function ElegirCategoriasScreen() {
  const { marcarCategoriasConfiguradas } = useAuth();
  const { recargar } = useCategorias();
  const { listarPredefinidas, guardarSeleccion, crearCategoria } = useCategoriasService();

  const [predefinidas, setPredefinidas] = useState([]);
  const [porDefecto, setPorDefecto] = useState([]);
  const [propias, setPropias] = useState([]); // { id, nombre, pendiente? }
  const [estado, setEstado] = useState('cargando');
  const [errorCarga, setErrorCarga] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(null); // null | 'continuar' | 'omitir'
  const siguienteId = useRef(0);

  const cargar = useCallback(() => {
    listarPredefinidas()
      .then((lista) => {
        const gasto = categoriasDeGasto(lista);
        setPredefinidas(gasto);
        setPorDefecto(idsSeleccionados(gasto));
        setEstado('listo');
      })
      .catch((err) => {
        setErrorCarga(err);
        setEstado('error');
      });
  }, [listarPredefinidas]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const reintentar = () => {
    setEstado('cargando');
    cargar();
  };

  // Las propias solo se guardan al continuar; aquí quedan en la lista como pendientes.
  const agregarPropia = async (nombre) => {
    siguienteId.current += 1;
    setPropias((actual) => [
      ...actual,
      { id: `nueva-${siguienteId.current}`, nombre, pendiente: true },
    ]);
  };

  const accionesPropia = (cat) =>
    cat.pendiente
      ? [
          {
            icono: 'close',
            etiqueta: `Quitar ${cat.nombre}`,
            onPress: () => setPropias((actual) => actual.filter((c) => c.id !== cat.id)),
            disabled: guardando != null,
          },
        ]
      : [];

  const terminar = async (modo) => {
    if (guardando) return;
    setGuardando(modo);
    setAviso(null);
    try {
      if (modo === 'continuar') {
        // Una a una; las ya creadas dejan de estar pendientes para no duplicarlas si se reintenta.
        for (const cat of propias.filter((c) => c.pendiente)) {
          const creada = await crearCategoria(cat.nombre);
          setPropias((actual) => actual.map((c) => (c.id === cat.id ? creada : c)));
        }
      }
      await guardarSeleccion(modo === 'continuar' ? idsSeleccionados(predefinidas) : porDefecto);
      recargar();
      await marcarCategoriasConfiguradas();
    } catch (err) {
      setAviso({ tipo: 'error', texto: mensajeError(err?.code, err?.message) });
      setGuardando(null);
    }
  };

  return (
    <AuthLayout
      titulo="Elige tus categorías"
      subtitulo="Activa las que usas o crea las tuyas. Puedes cambiarlas en Perfil."
      fondo="registro"
    >
      {estado !== 'listo' ? (
        <EstadoPantalla estado={estado} error={errorCarga} onReintentar={reintentar} />
      ) : (
        <View style={styles.contenido}>
          <SelectorCategorias
            predefinidas={predefinidas}
            onCambioSeleccion={(_cambio, nuevas) => setPredefinidas(nuevas)}
            onAviso={setAviso}
            propias={propias}
            accionesPropia={accionesPropia}
            onGuardarPropia={agregarPropia}
            aviso={aviso}
            bloqueado={guardando != null}
          />
          <Boton
            titulo="Continuar"
            grande
            onPress={() => terminar('continuar')}
            cargando={guardando === 'continuar'}
            disabled={guardando != null}
          />
          <Boton
            titulo="Omitir"
            secundario
            onPress={() => terminar('omitir')}
            cargando={guardando === 'omitir'}
            disabled={guardando != null}
          />
        </View>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  contenido: {
    gap: 14,
  },
});
