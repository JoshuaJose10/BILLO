import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import AuthLayout from '../components/AuthLayout';
import Boton from '../components/Boton';
import CampoCodigo from '../components/CampoCodigo';
import EnlaceAuth from '../components/EnlaceAuth';
import FuerzaPassword from '../components/FuerzaPassword';
import Input, { TextoError } from '../components/Input';
import { restablecerPassword, solicitarCodigo } from '../services/auth';
import { PASSWORD_ACTUALIZADA } from './LoginScreen';
import { mensajeError } from '../utils/errores';
import {
  errorRestablecer,
  esCodigoValido,
  ESPERA_REENVIO_MS,
  formatoCuenta,
  LARGO_CODIGO,
  segundosRestantes,
} from '../utils/recuperacion';
import { errorConfirmacion, errorPasswordNueva, hayErrores } from '../utils/validacion';

// Paso 2 de recuperar contraseña (HU-65): código del correo + contraseña nueva. Al terminar
// regresa a Login con el correo precargado; no inicia sesión sola.
export default function RestablecerScreen({ navigation, route }) {
  const { email } = route.params;
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [errores, setErrores] = useState({});
  const [errorApi, setErrorApi] = useState(null);
  const [rechazado, setRechazado] = useState(false);
  // null, 'cambiar' o 'reenviar': una sola petición a la vez bloquea todo el formulario.
  const [enviando, setEnviando] = useState(null);
  const [passwordEnfocado, setPasswordEnfocado] = useState(false);
  const [enviadoEn, setEnviadoEn] = useState(route.params.enviadoEn ?? 0);
  const [ahora, setAhora] = useState(Date.now);
  const enviandoRef = useRef(false);
  const passwordRef = useRef(null);
  const confirmacionRef = useRef(null);
  const restantes = segundosRestantes(enviadoEn + ESPERA_REENVIO_MS, ahora);

  // Cuenta regresiva de «Reenviar código»: un tic por segundo hasta llegar a 0.
  useEffect(() => {
    if (!restantes) return undefined;
    const tic = setTimeout(() => setAhora(Date.now()), 1000);
    return () => clearTimeout(tic);
  }, [ahora, restantes]);

  const cambiar = (campo, setter) => (valor) => {
    setter(valor);
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
    setErrorApi(null);
  };

  const cambiarCodigo = (valor) => {
    cambiar('codigo', setCodigo)(valor);
    if (valor.length === LARGO_CODIGO) passwordRef.current?.focus();
  };

  // TOKEN_INVALIDO y PASSWORD_MUY_CORTA van en su campo; el resto (429, red…) arriba del botón.
  const enviar = async (tipo, peticion) => {
    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(tipo);
    setErrorApi(null);
    try {
      await peticion();
    } catch (e) {
      const enCampo = errorRestablecer(e?.code);
      if (enCampo) setErrores({ [enCampo.campo]: enCampo.mensaje });
      else setErrorApi(mensajeError(e?.code, e?.message));
      setRechazado(e?.code === 'TOKEN_INVALIDO');
    } finally {
      enviandoRef.current = false;
      setEnviando(null);
    }
  };

  const cambiarContrasena = () => {
    const nuevos = {
      codigo: esCodigoValido(codigo) ? undefined : 'Escribe los 6 dígitos del código',
      password: errorPasswordNueva(password),
      confirmacion: errorConfirmacion(password, confirmacion),
    };
    setErrores(nuevos);
    setRechazado(false);
    if (hayErrores(nuevos)) return;
    enviar('cambiar', async () => {
      await restablecerPassword(email, codigo, password);
      AccessibilityInfo.announceForAccessibility('Contraseña actualizada');
      navigation.popTo('Login', { email, aviso: PASSWORD_ACTUALIZADA });
    });
  };

  const reenviar = () =>
    enviar('reenviar', async () => {
      await solicitarCodigo(email);
      const t = Date.now();
      setEnviadoEn(t);
      setAhora(t);
      setCodigo('');
      setRechazado(false);
      setErrores((e) => ({ ...e, codigo: undefined }));
      AccessibilityInfo.announceForAccessibility('Te enviamos un código nuevo');
    });

  // Lo que comparten los dos campos de contraseña nueva.
  const nueva = {
    password: true,
    placeholder: '••••••••',
    autoCapitalize: 'none',
    autoComplete: 'new-password',
    textContentType: 'newPassword',
    editable: !enviando,
    onFocus: () => setPasswordEnfocado(true),
    onBlur: () => setPasswordEnfocado(false),
  };

  return (
    <AuthLayout
      titulo="Nueva contraseña"
      subtitulo={`Si ${email} está registrado, te enviamos un código de 6 dígitos. Vence en 30 minutos.`}
      mostrarFinal={passwordEnfocado}
    >
      <CampoCodigo
        etiqueta="Código"
        value={codigo}
        onChangeText={cambiarCodigo}
        error={errores.codigo}
        editable={!enviando}
      />
      <Input
        {...nueva}
        ref={passwordRef}
        etiqueta="Nueva contraseña"
        icono="lock-outline"
        value={password}
        onChangeText={cambiar('password', setPassword)}
        error={errores.password}
        pie={<FuerzaPassword password={password} />}
        returnKeyType="next"
        onSubmitEditing={() => confirmacionRef.current?.focus()}
        submitBehavior="submit"
      />
      <Input
        {...nueva}
        ref={confirmacionRef}
        etiqueta="Confirmar contraseña"
        icono="lock-check-outline"
        value={confirmacion}
        onChangeText={cambiar('confirmacion', setConfirmacion)}
        error={errores.confirmacion}
        returnKeyType="go"
        onSubmitEditing={cambiarContrasena}
      />

      {errorApi ? <TextoError formulario>{errorApi}</TextoError> : null}

      <Boton
        titulo="Cambiar contraseña"
        icono="check"
        onPress={cambiarContrasena}
        cargando={enviando === 'cambiar'}
        disabled={!!enviando}
        grande
      />
      {rechazado ? (
        <View style={styles.pedirOtro}>
          <Boton
            titulo="Pedir otro código"
            icono="email-sync-outline"
            onPress={() => navigation.popTo('OlvideContrasena', { email })}
            disabled={!!enviando}
            secundario
          />
        </View>
      ) : null}

      <EnlaceAuth
        pregunta={
          enviando === 'reenviar'
            ? 'Enviando código…'
            : `¿No te llegó?${restantes ? ` Podrás reenviarlo en ${formatoCuenta(restantes)}` : ''}`
        }
        accion={restantes || enviando ? null : 'Reenviar código'}
        onPress={reenviar}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({ pedirOtro: { marginTop: 12 } });
