import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import AuthLayout from '../components/AuthLayout';
import Boton from '../components/Boton';
import EnlaceAuth from '../components/EnlaceAuth';
import Input from '../components/Input';
import { SESION_VENCIDA, useAuth } from '../context/AuthContext';
import { radios } from '../theme/colors';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { mensajeError } from '../utils/errores';
import { esEmailValido } from '../utils/validacion';

function validar({ email, password }) {
  const errores = {};
  if (!email.trim()) errores.email = 'Ingresa tu correo';
  else if (!esEmailValido(email)) errores.email = 'Ingresa un correo válido';
  if (!password) errores.password = 'Ingresa tu contraseña';
  return errores;
}

export default function LoginScreen({ navigation }) {
  const { iniciarSesion, motivoCierre, limpiarMotivoCierre } = useAuth();
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

  const cambiar = (campo, setter) => (valor) => {
    setter(valor);
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
    if (errorApi) setErrorApi(null);
  };

  const entrar = async () => {
    if (enviandoRef.current) return;
    const nuevosErrores = validar({ email, password });
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

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
      {motivoCierre === SESION_VENCIDA ? (
        <View style={styles.aviso} accessibilityRole="alert">
          <MaterialCommunityIcons name="clock-alert-outline" size={20} color={colors.text} />
          <Text style={styles.avisoTexto}>Tu sesión expiró. Inicia sesión de nuevo.</Text>
          <Pressable
            onPress={limpiarMotivoCierre}
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

      {errorApi ? <Text style={styles.errorApi}>{errorApi}</Text> : null}

      <Boton titulo="Entrar" icono="arrow-right" onPress={entrar} cargando={enviando} grande />

      <EnlaceAuth
        pregunta="¿No tienes cuenta?"
        accion="Crear cuenta"
        onPress={() => navigation.navigate('Registro')}
      />
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
    errorApi: {
      fontFamily: fonts.sans,
      color: colors.alerta,
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 12,
    },
  });
