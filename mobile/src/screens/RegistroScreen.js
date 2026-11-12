import { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import AuthLayout from '../components/AuthLayout';
import Boton from '../components/Boton';
import EnlaceAuth from '../components/EnlaceAuth';
import FuerzaPassword from '../components/FuerzaPassword';
import Input, { TextoError } from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { useEstilos } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';
import { mensajeError } from '../utils/errores';
import { errorEmail, errorPasswordNueva, hayErrores } from '../utils/validacion';

function validar({ nombre, email, password }) {
  return {
    nombre: nombre.trim() ? undefined : 'Ingresa tu nombre',
    email: errorEmail(email),
    password: errorPasswordNueva(password),
  };
}

export default function RegistroScreen({ navigation }) {
  const { registrarse } = useAuth();
  const styles = useEstilos(crearEstilos);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errores, setErrores] = useState({});
  const [errorApi, setErrorApi] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [passwordEnfocado, setPasswordEnfocado] = useState(false);
  const enviandoRef = useRef(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const cambiar = (campo, setter) => (valor) => {
    setter(valor);
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
    if (errorApi) setErrorApi(null);
  };

  const crearCuenta = async () => {
    if (enviandoRef.current) return;
    const nuevosErrores = validar({ nombre, email, password });
    setErrores(nuevosErrores);
    if (hayErrores(nuevosErrores)) return;

    enviandoRef.current = true;
    setEnviando(true);
    setErrorApi(null);
    try {
      // Registra y deja la sesión iniciada; RootNavigator cambia a Main.
      await registrarse(nombre, email, password);
    } catch (e) {
      setErrorApi(mensajeError(e?.code, e?.message));
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  return (
    <AuthLayout
      titulo="Crea tu cuenta"
      subtitulo="Comienza a registrar y optimizar tus finanzas."
      mostrarFinal={passwordEnfocado}
      fondo="registro"
    >
      <Input
        etiqueta="Nombre"
        icono="account-outline"
        placeholder="Tu nombre completo"
        value={nombre}
        onChangeText={cambiar('nombre', setNombre)}
        error={errores.nombre}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        submitBehavior="submit"
        editable={!enviando}
      />
      <Input
        ref={emailRef}
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
        pie={<FuerzaPassword password={password} />}
        onFocus={() => setPasswordEnfocado(true)}
        onBlur={() => setPasswordEnfocado(false)}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={crearCuenta}
        editable={!enviando}
      />

      {errorApi ? <TextoError formulario>{errorApi}</TextoError> : null}

      <Boton
        titulo="Crear cuenta"
        icono="arrow-right"
        onPress={crearCuenta}
        cargando={enviando}
        grande
      />

      <Text style={styles.terminos}>
        Al registrarte aceptas nuestros <Text style={styles.terminosDestacado}>Términos</Text> y{' '}
        <Text style={styles.terminosDestacado}>Política de Privacidad</Text>.
      </Text>

      <EnlaceAuth
        pregunta="¿Ya tienes cuenta?"
        accion="Entrar"
        onPress={() => navigation.navigate('Login')}
      />
    </AuthLayout>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    // body-sm text-outline text-center mt-4 px-2 leading-relaxed
    terminos: {
      fontFamily: fonts.sans,
      color: colors.outline,
      fontSize: 12,
      lineHeight: 19.5,
      letterSpacing: 0.12,
      textAlign: 'center',
      marginTop: 16,
      paddingHorizontal: 8,
    },
    // text-on-surface (solo texto, sin enlace)
    terminosDestacado: {
      color: colors.onSurface,
    },
  });
