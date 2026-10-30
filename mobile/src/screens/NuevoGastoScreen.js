import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Boton from '../components/Boton';
import ChipCategoria from '../components/ChipCategoria';
import ChipSelector from '../components/ChipSelector';
import HojaInferior from '../components/HojaInferior';
import MontoGrande from '../components/MontoGrande';
import PanelHoja from '../components/PanelHoja';
import TecladoNumerico from '../components/TecladoNumerico';
import { METODO_PAGO_DEFECTO, METODOS_PAGO, NOTA_MAX, useGastosService } from '../services/gastos';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { mensajeError } from '../utils/errores';
import { fechaLocalISO } from '../utils/fechas';
import { fechaRelativa, LOCALE, resumirTexto } from '../utils/formato';
import { aplicarTecla, montoDesdeTexto } from '../utils/monto';

// Hoja inferior sobre Inicio y las tabs (ruta NuevoGasto con presentation: 'transparentModal').
// El alto lo da el contenido (~65% de la pantalla en un iPhone de 6.1").
export default function NuevoGastoScreen({ navigation }) {
  const { listarCategorias, crearGasto } = useGastosService();

  const [texto, setTexto] = useState('');
  const [categoriaId, setCategoriaId] = useState(null);
  const [metodo, setMetodo] = useState(METODO_PAGO_DEFECTO);
  const [fecha, setFecha] = useState(() => new Date());
  const [nota, setNota] = useState('');
  const [panel, setPanel] = useState(null); // 'metodo' | 'fecha' | 'nota'

  const [categorias, setCategorias] = useState([]);
  const [estadoCategorias, setEstadoCategorias] = useState('cargando'); // 'cargando' | 'listo' | 'error'
  const [intento, setIntento] = useState(0);

  const [errores, setErrores] = useState({});
  const [errorApi, setErrorApi] = useState('');
  const [guardando, setGuardando] = useState(false);
  const enviando = useRef(false);
  const hojaRef = useRef(null);

  // Carga las categorías al abrir y cada vez que se pulsa "Reintentar" (cambia `intento`).
  useEffect(() => {
    let activo = true;
    listarCategorias()
      .then((lista) => {
        if (!activo) return;
        setCategorias(lista || []);
        setEstadoCategorias('listo');
      })
      .catch(() => {
        if (activo) setEstadoCategorias('error');
      });
    return () => {
      activo = false;
    };
  }, [listarCategorias, intento]);

  const reintentarCategorias = () => {
    setEstadoCategorias('cargando');
    setIntento((n) => n + 1);
  };

  const alPulsarTecla = (tecla) => {
    setTexto((actual) => aplicarTecla(actual, tecla));
    if (errores.monto) setErrores((e) => ({ ...e, monto: undefined }));
    if (errorApi) setErrorApi('');
  };

  const elegirCategoria = (id) => {
    setCategoriaId(id);
    if (errores.categoria) setErrores((e) => ({ ...e, categoria: undefined }));
    if (errorApi) setErrorApi('');
  };

  const abrirFecha = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: fecha,
        mode: 'date',
        maximumDate: new Date(),
        onValueChange: (_evento, nueva) => setFecha(nueva),
      });
    } else {
      setPanel('fecha');
    }
  };

  const confirmar = async () => {
    if (enviando.current) return;

    const monto = montoDesdeTexto(texto);
    const nuevos = {};
    if (!(monto > 0)) nuevos.monto = 'Ingresa un monto mayor a $0';
    if (!categoriaId) nuevos.categoria = 'Elige una categoría';
    setErrores(nuevos);
    setErrorApi('');
    if (nuevos.monto || nuevos.categoria) return;

    enviando.current = true;
    setGuardando(true);
    try {
      await crearGasto({
        monto,
        categoria_id: categoriaId,
        fecha: fechaLocalISO(fecha),
        metodo_pago: metodo,
        nota: nota.trim() || null,
      });
      enviando.current = false;
      hojaRef.current?.cerrar();
    } catch (error) {
      enviando.current = false;
      setGuardando(false);
      setErrorApi(mensajeError(error?.code, error?.message));
    }
  };

  const metodoActual = METODOS_PAGO.find((m) => m.valor === metodo) || METODOS_PAGO[0];
  const fechaTexto = fechaRelativa(fechaLocalISO(fecha));

  return (
    <HojaInferior
      ref={hojaRef}
      titulo="Nuevo gasto"
      etiquetaFondo="Cerrar nuevo gasto"
      onCerrada={() => navigation.goBack()}
      bloqueada={guardando}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filaScroll}
        contentContainerStyle={styles.filaChips}
      >
        <ChipSelector
          icono={metodoActual.icono}
          etiqueta={metodoActual.etiqueta}
          chevron
          onPress={() => setPanel('metodo')}
          accessibilityLabel={`Método de pago: ${metodoActual.etiqueta}`}
        />
        <ChipSelector
          icono="calendar-blank-outline"
          etiqueta={fechaTexto}
          chevron
          onPress={abrirFecha}
          accessibilityLabel={`Fecha: ${fechaTexto}`}
        />
        <ChipSelector
          icono="note-edit-outline"
          etiqueta={nota.trim() ? resumirTexto(nota) : 'Nota'}
          onPress={() => setPanel('nota')}
        />
      </ScrollView>

      <View style={styles.zonaMonto}>
        <MontoGrande texto={texto} error={!!errores.monto} />
      </View>
      {errores.monto ? <Text style={styles.errorCampo}>{errores.monto}</Text> : null}

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
                seleccionado={c.id === categoriaId}
                error={!!errores.categoria}
                onPress={() => elegirCategoria(c.id)}
              />
            ))}
          </ScrollView>
        )}
      </View>
      {errores.categoria ? <Text style={styles.errorCampo}>{errores.categoria}</Text> : null}

      <View style={styles.zonaTeclado}>
        <TecladoNumerico onTecla={alPulsarTecla} disabled={guardando} />
      </View>

      {errorApi ? <Text style={styles.errorApi}>{errorApi}</Text> : null}
      <Boton
        titulo="Confirmar gasto"
        icono="arrow-right"
        onPress={confirmar}
        cargando={guardando}
        compacto
      />

      {panel === 'metodo' ? (
        <PanelHoja titulo="Método de pago" onCerrar={() => setPanel(null)}>
          {METODOS_PAGO.map((m) => (
            <Pressable
              key={m.valor}
              onPress={() => {
                setMetodo(m.valor);
                setPanel(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: m.valor === metodo }}
              style={({ pressed }) => [styles.opcion, pressed ? styles.opcionPresionada : null]}
            >
              <MaterialCommunityIcons name={m.icono} size={22} color={colors.text} />
              <Text style={styles.opcionTexto}>{m.etiqueta}</Text>
              {m.valor === metodo ? (
                <MaterialCommunityIcons name="check" size={22} color={colors.text} />
              ) : null}
            </Pressable>
          ))}
        </PanelHoja>
      ) : null}

      {panel === 'fecha' ? (
        <PanelHoja titulo="Fecha del gasto" onCerrar={() => setPanel(null)}>
          <DateTimePicker
            value={fecha}
            mode="date"
            display="inline"
            themeVariant="dark"
            accentColor={colors.text}
            maximumDate={new Date()}
            locale={LOCALE}
            onValueChange={(_evento, nueva) => {
              setFecha(nueva);
              setPanel(null);
            }}
          />
        </PanelHoja>
      ) : null}

      {panel === 'nota' ? (
        <PanelHoja titulo="Nota" onCerrar={() => setPanel(null)}>
          <TextInput
            value={nota}
            onChangeText={setNota}
            placeholder="Ej. Tacos con amigos"
            placeholderTextColor={colors.textSecondary}
            cursorColor={colors.acento}
            selectionColor={colors.acento}
            maxLength={NOTA_MAX}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => setPanel(null)}
            style={styles.inputNota}
          />
          <Text style={styles.contador}>
            {nota.length}/{NOTA_MAX}
          </Text>
          <Boton titulo="Listo" onPress={() => setPanel(null)} />
        </PanelHoja>
      ) : null}
    </HojaInferior>
  );
}

const styles = StyleSheet.create({
  // Filas con scroll horizontal hasta el borde de la hoja (px-5)
  filaScroll: {
    marginHorizontal: -20,
    flexGrow: 0,
    marginTop: 10,
  },
  // Chips de método/fecha/nota: gap-2
  filaChips: {
    gap: 8,
    paddingHorizontal: 20,
  },
  // Chips de categoría: gap-1.5 py-0.5
  filaCategorias: {
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 2,
  },
  // my-2
  zonaMonto: {
    marginTop: 8,
    marginBottom: 8,
  },
  // mb-2
  zonaCategorias: {
    minHeight: 32,
    justifyContent: 'center',
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
  errorCampo: {
    fontFamily: fonts.sans,
    color: colors.alerta,
    fontSize: 12,
    lineHeight: 16,
    marginTop: -4,
    marginBottom: 8,
  },
  // gap-2.5 entre teclado y botón
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
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  opcionPresionada: {
    backgroundColor: colors.border,
  },
  opcionTexto: {
    fontFamily: fonts.sans,
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  inputNota: {
    fontFamily: fonts.sans,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
  },
  contador: {
    fontFamily: fonts.sans,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
    marginBottom: 14,
  },
});
