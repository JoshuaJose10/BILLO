import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, View } from 'react-native';

import { fonts } from '../theme/fonts';
import { useEstilos } from '../theme/TemaContext';
import { LONGITUD_MAX_CATEGORIA, validarNombreCategoria } from '../utils/categorias';
import { mensajeError } from '../utils/errores';
import Boton from './Boton';
import HojaInferior from './HojaInferior';
import Input from './Input';

// Hoja «Agregar categoría» / «Renombrar categoría» (HU-89 / HU-90) encima de la pantalla actual.
// El padre la monta solo mientras está abierta, así cada apertura empieza limpia y con animación.
// - editando: null para crear o { id, nombre } para renombrar.
// - existentes: categorías ya conocidas, para rechazar duplicados (validarNombreCategoria).
// - onGuardar(nombre): async; si lanza, el error se muestra en la hoja con mensajeError.
// - onCerrar: al terminar la animación de salida (por la X, el fondo o tras guardar).
export default function HojaNombreCategoria({ editando, existentes, onGuardar, onCerrar }) {
  const styles = useEstilos(crearEstilos);
  const hojaRef = useRef(null);
  const [nombre, setNombre] = useState(editando?.nombre ?? '');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (guardando) return;
    const validacion = validarNombreCategoria(nombre, existentes, editando?.id ?? null);
    if (!validacion.valido) {
      setError(validacion.error);
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await onGuardar(validacion.nombre);
      hojaRef.current?.cerrar();
    } catch (err) {
      setError(mensajeError(err?.code, err?.message));
      setGuardando(false);
    }
  };

  const titulo = editando ? 'Renombrar categoría' : 'Agregar categoría';

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={() => !guardando && hojaRef.current?.cerrar()}
    >
      <KeyboardAvoidingView
        style={styles.pantalla}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <HojaInferior ref={hojaRef} titulo={titulo} bloqueada={guardando} onCerrada={onCerrar}>
          <View style={styles.contenido}>
            <Input
              etiqueta="Nombre de la categoría"
              placeholder="Ej. Gimnasio"
              value={nombre}
              onChangeText={(v) => {
                setNombre(v);
                if (error) setError('');
              }}
              maxLength={LONGITUD_MAX_CATEGORIA}
              autoCapitalize="sentences"
              autoFocus
              editable={!guardando}
              pie={
                <Text style={styles.contador}>
                  {nombre.trim().length}/{LONGITUD_MAX_CATEGORIA} caracteres
                </Text>
              }
              error={error}
            />
            <Boton titulo={editando ? 'Guardar' : 'Crear'} onPress={guardar} cargando={guardando} />
          </View>
        </HojaInferior>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    pantalla: {
      flex: 1,
    },
    contenido: {
      gap: 16,
      paddingTop: 16,
    },
    contador: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
      textAlign: 'right',
    },
  });
