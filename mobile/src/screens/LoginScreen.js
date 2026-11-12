import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import AuthLayout from '../components/AuthLayout';
import Boton from '../components/Boton';
import EnlaceAuth from '../components/EnlaceAuth';
import Input, { TextoError } from '../components/Input';
import { SESION_VENCIDA, useAuth } from '../context/AuthContext';
import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { mensajeError } from '../utils/errores';
import { errorEmail, hayErrores } from '../utils/validacion';

// Parámetro `aviso` con el que Restablecer regresa a Login (HU-65).
export const PASSWORD_ACTUALIZADA = 'passwordActualizada';

function validar({ email, password }) {
  return {
    email: errorEmail(email),
    password: password ? undefined : 'Ingresa tu contraseña',
  };
}

export default function LoginScreen({ navigation, route }) {
  const { iniciarSesion, motivoCierre, limpiarMotivoCierre, explorarSinCuenta } = useAuth();
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState({});
  const [errorApi, setErrorApi] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [passwordEnfocado, setPasswordEnfocado] = useState(false);
  const enviandoRef = useRef(false);
  const passwordRef = useRef(null);
  const { email: emailRecibido, aviso: avisoRecibido } = route.params ?? {};

  // Al volver de Restablecer (o de Olvidé) con el correo, lo precarga (ajuste durante el render
  // al cambiar el parámetro, sin efecto).
  const [emailPrevio, setEmailPrevio] = useState(emailRecibido);
  if (emailRecibido !== emailPrevio) {
    setEmailPrevio(emailRecibido);
    if (emailRecibido) setEmail(emailRecibido);
  }

  const aviso =
    avisoRecibido === PASSWORD_ACTUALIZADA
      ? {
          icono: 'check-circle-outline',
          texto: 'Contraseña actualizada. Inicia sesión con la nueva.',
          cerrar: () => navigation.setParams({ aviso: undefined }),
        }
      : motivoCierre === SESION_VENCIDA
        ? {
            icono: 'clock-alert-outline',
            texto: 'Tu sesión expiró. Inicia sesión de nuevo.',
            cerrar: limpiarMotivoCierre,
          }
        : null;

  const cambiar = (campo, setter) => (valor) => {
    setter(valor);
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
    if (errorApi) setErrorApi(null);
  };

  const entrar = async () => {
    if (enviandoRef.current) return;
    const nuevosErrores = validar({ email, password });
    setErrores(nuevosErrores);
    if (hayErrores(nuevosErrores)) return;

    enviandoRef.current = true;
    setEnviando(true);
    setErrorApi(null);
    try {
      // Con éxito el token cambia y RootNavigator muestra Main.
      await iniciarSesion(email, password);
    } catch (e) {
      setErrorApi(mensajeError(e?.code, e?.message));
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  return (
    <AuthLayout
      titulo="Bienvenido de vuelta"
      subtitulo="Ingresa tus credenciales para acceder a tus finanzas."
      mostrarFinal={passwordEnfocado}
    >
      {aviso ? (
        <View style={styles.aviso} accessibilityRole="alert">
          <MaterialCommunityIcons name={aviso.icono} size={20} color={colors.text} />
          <Text style={styles.avisoTexto}>{aviso.texto}</Text>
          <Pressable
            onPress={aviso.cerrar}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Cerrar aviso"
          >
            <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      ) : null}

      <Input
        etiqueta="Correo electrónico"
        icono="email-outline"
        placeholder="ejemplo@correo.com"
        value={email}
        onChangeText={cambiar('email', setEmail)}
        error={errores.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
        editable={!enviando}
      />
      <Input
        ref={passwordRef}
        etiqueta="Contraseña"
        icono="lock-outline"
        placeholder="••••••••"
        value={password}
        onChangeText={cambiar('password', setPassword)}
        error={errores.password}
        password
        onFocus={() => setPasswordEnfocado(true)}
        onBlur={() => setPasswordEnfocado(false)}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={entrar}
        editable={!enviando}
      />
      <EnlaceAuth
        accion="¿Olvidaste tu contraseña?"
        onPress={() => navigation.navigate('OlvideContrasena', { email: email.trim() })}
        style={styles.olvide}
      />

      {errorApi ? <TextoError formulario>{errorApi}</TextoError> : null}

      <Boton titulo="Entrar" icono="arrow-right" onPress={entrar} cargando={enviando} grande />

      <EnlaceAuth
        pregunta="¿No tienes cuenta?"
        accion="Crear cuenta"
        onPress={() => navigation.navigate('Registro')}
      />

      {/* Modo exploración (HU-50, RF10): datos de ejemplo sin cuenta y sin llamar a la API. */}
      <View style={styles.explorar}>
        <Boton
          titulo="Explorar sin cuenta"
          icono="compass-outline"
          onPress={explorarSinCuenta}
          disabled={enviando}
          secundario
        />
      </View>
    </AuthLayout>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    aviso: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: radios['2xl'],
      backgroundColor: colors.glass07,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    avisoTexto: {
      fontFamily: fonts.sansMedium,
      flex: 1,
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
    },
    explorar: {
      marginTop: 20,
    },
    // Pegado al campo de contraseña (que ya deja 16 debajo), alineado a la derecha.
    olvide: {
      marginTop: -8,
      marginBottom: 12,
      textAlign: 'right',
    },
  });
