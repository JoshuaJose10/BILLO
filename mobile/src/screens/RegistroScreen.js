import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import AuthLayout from '../components/AuthLayout';
import Boton from '../components/Boton';
import EnlaceAuth from '../components/EnlaceAuth';
import Input from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { mensajeError } from '../utils/errores';
import { esEmailValido, fuerzaPassword, MIN_PASSWORD } from '../utils/validacion';

// Color de cada barrita encendida (Stitch: bg-outline, bg-on-surface-variant, bg-primary).
const COLOR_BARRA = [colors.outline, colors.textVariant, colors.primary];

function validar({ nombre, email, password }) {
  const errores = {};
  if (!nombre.trim()) errores.nombre = 'Ingresa tu nombre';
  if (!email.trim()) errores.email = 'Ingresa tu correo';
  else if (!esEmailValido(email)) errores.email = 'Ingresa un correo válido';
  if (!password) errores.password = 'Ingresa una contraseña';
  else if (password.length < MIN_PASSWORD)
    errores.password = `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`;
  return errores;
}

function FuerzaPassword({ password }) {
  const fuerza = fuerzaPassword(password);
  return (
    <View style={styles.pistaFila}>
      <Text style={styles.pista}>Mínimo {MIN_PASSWORD} caracteres</Text>
      <View style={styles.barras} accessibilityLabel={`Fuerza de la contraseña: ${fuerza} de 3`}>
        {[1, 2, 3].map((n) => (
          <View
            key={n}
            style={[
              styles.barra,
              { backgroundColor: n <= fuerza ? COLOR_BARRA[n - 1] : colors.surfaceBright },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export default function RegistroScreen({ navigation }) {
  const { registrarse } = useAuth();
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
    if (Object.keys(nuevosErrores).length > 0) return;

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

      {errorApi ? <Text style={styles.errorApi}>{errorApi}</Text> : null}

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

const styles = StyleSheet.create({
  // mt-1 px-1
  pistaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  // body-sm: Inter 400 12/16, tracking 0.01em, text-outline
  pista: {
    fontFamily: fonts.sans,
    color: colors.outline,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.12,
  },
  // gap-1
  barras: {
    flexDirection: 'row',
    gap: 4,
  },
  // w-5 h-1 rounded-full
  barra: {
    width: 20,
    height: 4,
    borderRadius: 2,
  },
  errorApi: {
    fontFamily: fonts.sans,
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
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
