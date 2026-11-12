import { useRef, useState } from 'react';

import AuthLayout from '../components/AuthLayout';
import Boton from '../components/Boton';
import EnlaceAuth from '../components/EnlaceAuth';
import Input, { TextoError } from '../components/Input';
import { solicitarCodigo } from '../services/auth';
import { mensajeError } from '../utils/errores';
import { errorEmail } from '../utils/validacion';

// Paso 1 de recuperar contraseña (HU-65): pide el código por correo. El backend responde 200
// exista o no la cuenta, así que siempre pasa a Restablecer con el mismo mensaje genérico.
export default function OlvideContrasenaScreen({ navigation, route }) {
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [error, setError] = useState(null);
  const [errorApi, setErrorApi] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);

  const cambiar = (valor) => {
    setEmail(valor);
    setError(null);
    setErrorApi(null);
  };

  const enviar = async () => {
    if (enviandoRef.current) return;
    const nuevoError = errorEmail(email);
    setError(nuevoError);
    if (nuevoError) return;

    enviandoRef.current = true;
    setEnviando(true);
    setErrorApi(null);
    try {
      await solicitarCodigo(email);
      navigation.navigate('Restablecer', { email: email.trim(), enviadoEn: Date.now() });
    } catch (e) {
      if (e?.code === 'EMAIL_INVALIDO') setError(mensajeError(e.code));
      else setErrorApi(mensajeError(e?.code, e?.message));
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  return (
    <AuthLayout
      titulo="Recupera tu cuenta"
      subtitulo="Escribe el correo de tu cuenta y te enviaremos un código de 6 dígitos."
    >
      <Input
        etiqueta="Correo electrónico"
        icono="email-outline"
        placeholder="ejemplo@correo.com"
        value={email}
        onChangeText={cambiar}
        error={error}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={enviar}
        editable={!enviando}
      />

      {errorApi ? <TextoError formulario>{errorApi}</TextoError> : null}

      <Boton
        titulo="Enviar código"
        icono="arrow-right"
        onPress={enviar}
        cargando={enviando}
        grande
      />

      <EnlaceAuth
        pregunta="¿La recordaste?"
        accion="Entrar"
        onPress={() => navigation.popTo('Login', { email: email.trim() })}
      />
    </AuthLayout>
  );
}
