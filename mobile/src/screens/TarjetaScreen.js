import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import Boton from '../components/Boton';
import Etiqueta from '../components/Etiqueta';
import HojaInferior from '../components/HojaInferior';
import Input, { TextoError } from '../components/Input';
import SelectorSegmentado from '../components/SelectorSegmentado';
import { useTarjetasService } from '../services/tarjetas';
import { espacios, radios } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { useEstilos, useTema } from '../theme/TemaContext';
import { tipografia } from '../theme/tipografia';
import { mensajeError } from '../utils/errores';
import {
  colorTarjeta,
  etiquetaTipoTarjeta,
  NOMBRE_TARJETA_MAX,
  textoFechasTarjeta,
  TIPOS_TARJETA,
  validarTarjeta,
} from '../utils/tarjetas';

const NO_EXISTE = 'Esta tarjeta ya no existe. Cierra para actualizar la lista.';

// Hoja "Tarjeta" (ruta con presentation: 'transparentModal'), se abre desde Cartera → Tarjetas
// con `route.params` { tarjeta? }.
// Permite crear o editar una tarjeta (nombre, tipo crédito|débito, últimos 4 dígitos y días
// opcionales de corte y pago 1–31) y eliminarla con confirmación.
export default function TarjetaScreen({ navigation, route }) {
  const inicial = route.params?.tarjeta ?? null;
  const editando = inicial != null;

  const { crearTarjeta, actualizarTarjeta, eliminarTarjeta } = useTarjetasService();
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const hojaRef = useRef(null);

  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [tipo, setTipo] = useState(inicial?.tipo === 'debito' ? 'debito' : 'credito');
  const [ultimos4, setUltimos4] = useState(inicial?.ultimos4 ?? '');
  const [diaCorteTexto, setDiaCorteTexto] = useState(
    inicial?.dia_corte != null ? String(inicial.dia_corte) : '',
  );
  const [diaPagoTexto, setDiaPagoTexto] = useState(
    inicial?.dia_pago != null ? String(inicial.dia_pago) : '',
  );

  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const limpiarErrorCampo = (campo) => {
    setErrores((prev) => (prev[campo] ? { ...prev, [campo]: undefined } : prev));
    if (errorServidor) setErrorServidor('');
  };

  const vistaPrevia = {
    nombre: nombre.trim() || 'Nombre de tu tarjeta',
    tipo,
    ultimos4: ultimos4.padEnd(4, '·'),
    dia_corte: /^\d+$/.test(diaCorteTexto.trim()) ? Number(diaCorteTexto.trim()) : null,
    dia_pago: /^\d+$/.test(diaPagoTexto.trim()) ? Number(diaPagoTexto.trim()) : null,
  };
  const colorPrevia = colorTarjeta(vistaPrevia);
  const fechasPrevia = textoFechasTarjeta(vistaPrevia);

  const guardar = async () => {
    const validacion = validarTarjeta({
      nombre,
      tipo,
      ultimos4,
      diaCorteTexto,
      diaPagoTexto,
    });
    if (!validacion.valido) {
      setErrores(validacion.errores);
      return;
    }

    setErrores({});
    setErrorServidor('');
    setGuardando(true);
    try {
      if (editando) {
        await actualizarTarjeta(inicial.id, validacion.datos);
      } else {
        await crearTarjeta(validacion.datos);
      }
      hojaRef.current?.cerrar();
    } catch (e) {
      if (e.code === 'TARJETA_NO_ENCONTRADA') {
        setErrorServidor(NO_EXISTE);
      } else {
        setErrorServidor(mensajeError(e.code, e.message));
      }
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    setErrorServidor('');
    setEliminando(true);
    try {
      await eliminarTarjeta(inicial.id);
      hojaRef.current?.cerrar();
    } catch (e) {
      if (e.code === 'TARJETA_NO_ENCONTRADA') {
        hojaRef.current?.cerrar();
      } else {
        setErrorServidor(mensajeError(e.code, e.message));
      }
    } finally {
      setEliminando(false);
    }
  };

  const confirmarEliminar = () => {
    Alert.alert(
      'Eliminar tarjeta',
      `¿Eliminar «${inicial.nombre} ·· ${inicial.ultimos4}»? Los gastos y suscripciones conservarán su historial sin tarjeta asociada.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: eliminar },
      ],
    );
  };

  return (
    <HojaInferior
      ref={hojaRef}
      titulo={editando ? 'Editar tarjeta' : 'Nueva tarjeta'}
      bloqueada={guardando || eliminando}
      onCerrada={() => navigation.goBack()}
    >
      <ScrollView
        style={styles.teclado}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        contentContainerStyle={styles.contenido}
      >
        {/* Vista previa en vivo de la tarjeta */}
        <View style={styles.tarjetaPrevia}>
          <View style={styles.previaFilaSuperior}>
            <View
              style={[
                styles.previaSquircle,
                { backgroundColor: colorPrevia, shadowColor: colorPrevia },
              ]}
            >
              <MaterialCommunityIcons
                name={tipo === 'credito' ? 'credit-card-chip-outline' : 'credit-card-outline'}
                size={22}
                color={colors.textoSobreColor}
              />
            </View>
            <View style={styles.previaTextos}>
              <Text
                style={[styles.previaNombre, !nombre.trim() ? styles.previaNombreVacio : null]}
                numberOfLines={1}
              >
                {vistaPrevia.nombre}
              </Text>
              <Text style={styles.previaSubtitulo} numberOfLines={1}>
                {`${etiquetaTipoTarjeta(tipo)} · ·· ${vistaPrevia.ultimos4}`}
              </Text>
            </View>
          </View>
          {fechasPrevia ? (
            <View style={styles.previaPildora}>
              <MaterialCommunityIcons
                name="calendar-clock-outline"
                size={13}
                color={colors.textSecondary}
              />
              <Text style={styles.previaFechas}>{fechasPrevia}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.bloqueTipo}>
          <Etiqueta style={styles.etiquetaSeccion}>TIPO DE TARJETA</Etiqueta>
          <SelectorSegmentado
            opciones={TIPOS_TARJETA}
            valor={tipo}
            onCambiar={(nuevo) => {
              setTipo(nuevo);
              limpiarErrorCampo('tipo');
            }}
            accessibilityLabel="Tipo de tarjeta"
          />
        </View>

        <Input
          etiqueta="NOMBRE DE LA TARJETA"
          icono="credit-card-outline"
          placeholder="Ej. BBVA Azul, Nu, Santander"
          value={nombre}
          onChangeText={(v) => {
            setNombre(v);
            limpiarErrorCampo('nombre');
          }}
          maxLength={NOMBRE_TARJETA_MAX}
          limpiable
          error={errores.nombre}
        />

        <Input
          etiqueta="ÚLTIMOS 4 DÍGITOS"
          icono="numeric"
          placeholder="4821"
          value={ultimos4}
          onChangeText={(v) => {
            setUltimos4(v.replace(/\D/g, '').slice(0, 4));
            limpiarErrorCampo('ultimos4');
          }}
          keyboardType="number-pad"
          maxLength={4}
          error={errores.ultimos4}
        />

        <View style={styles.filaDias}>
          <View style={styles.columnaDia}>
            <Input
              etiqueta="DÍA DE CORTE (OPC.)"
              icono="calendar-month-outline"
              placeholder="1–31"
              value={diaCorteTexto}
              onChangeText={(v) => {
                setDiaCorteTexto(v.replace(/\D/g, '').slice(0, 2));
                limpiarErrorCampo('dia_corte');
              }}
              keyboardType="number-pad"
              maxLength={2}
              error={errores.dia_corte}
            />
          </View>
          <View style={styles.columnaDia}>
            <Input
              etiqueta="DÍA DE PAGO (OPC.)"
              icono="calendar-check-outline"
              placeholder="1–31"
              value={diaPagoTexto}
              onChangeText={(v) => {
                setDiaPagoTexto(v.replace(/\D/g, '').slice(0, 2));
                limpiarErrorCampo('dia_pago');
              }}
              keyboardType="number-pad"
              maxLength={2}
              error={errores.dia_pago}
            />
          </View>
        </View>

        {errorServidor ? <TextoError formulario>{errorServidor}</TextoError> : null}

        <View style={styles.acciones}>
          <Boton
            titulo={editando ? 'Guardar cambios' : 'Guardar tarjeta'}
            icono="check-circle"
            compacto
            cargando={guardando}
            disabled={eliminando}
            onPress={guardar}
          />
          {editando ? (
            <Boton
              titulo="Eliminar tarjeta"
              icono="trash-can-outline"
              destructivo
              cargando={eliminando}
              disabled={guardando}
              onPress={confirmarEliminar}
            />
          ) : null}
        </View>
      </ScrollView>
    </HojaInferior>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    teclado: {
      flexGrow: 0,
      flexShrink: 1,
    },
    contenido: {
      paddingTop: espacios.md,
      paddingBottom: espacios.sm,
    },
    tarjetaPrevia: {
      borderRadius: radios['2xl'],
      padding: espacios.md,
      backgroundColor: colors.surfaceLow,
      borderWidth: 1,
      borderColor: colors.border,
      borderTopColor: colors.borderTop,
      marginBottom: espacios.md,
      gap: espacios.sm + 2,
    },
    previaFilaSuperior: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: espacios.sm + 4,
    },
    previaSquircle: {
      width: 44,
      height: 44,
      borderRadius: radios.xl,
      alignItems: 'center',
      justifyContent: 'center',
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      shadowOpacity: 0.35,
      elevation: 4,
    },
    previaTextos: {
      flex: 1,
      gap: 2,
    },
    previaNombre: {
      ...tipografia.bodyLg,
      fontFamily: fonts.sansSemiBold,
      color: colors.text,
    },
    previaNombreVacio: {
      color: colors.textSecondary,
    },
    previaSubtitulo: {
      ...tipografia.bodySm,
      fontFamily: fonts.monoMedium,
      color: colors.textSecondary,
    },
    previaPildora: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: espacios.xs,
      borderRadius: radios.full,
      backgroundColor: colors.glass05,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    previaFechas: {
      ...tipografia.labelCaps,
      textTransform: 'none',
      letterSpacing: 0,
      color: colors.textSecondary,
    },
    bloqueTipo: {
      marginBottom: espacios.md,
      gap: 6,
    },
    etiquetaSeccion: {
      letterSpacing: 0.55,
    },
    filaDias: {
      flexDirection: 'row',
      gap: espacios.sm + 4,
    },
    columnaDia: {
      flex: 1,
    },
    acciones: {
      marginTop: espacios.xs,
      gap: espacios.sm + 2,
    },
  });
