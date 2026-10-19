import { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import AuthLayout from '../components/AuthLayout';
import Boton from '../components/Boton';
import EnlaceAuth from '../components/EnlaceAuth';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { esEmailValido } from '../utils/validacion';

function validar({ email, password }) {
  const errores = {};
  if (!email.trim()) errores.email = 'Ingresa tu correo';
  else if (!esEmailValido(email)) errores.email = 'Ingresa un correo válido';
  if (!password) errores.password = 'Ingresa tu contraseña';
  return errores;
}

export default function LoginScreen({ navigation }) {
  const { iniciarSesion } = useAuth();
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
      setErrorApi(
        e?.status === 401 || e?.codigo === 'CREDENCIALES_INVALIDAS'
          ? 'Correo o contraseña incorrectos'
          : e?.mensaje || 'Ocurrió un error inesperado',
      );
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
      <Input
        etiqueta="Correo"
        icono="email-outline"
        placeholder="tu@correo.com"
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

      <Boton titulo="Entrar" icono="arrow-right" onPress={entrar} cargando={enviando} />

      <EnlaceAuth
        pregunta="¿No tienes cuenta?"
        accion="Crear cuenta"
        onPress={() => navigation.navigate('Registro')}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  errorApi: {
    fontFamily: fonts.sans,
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
});
