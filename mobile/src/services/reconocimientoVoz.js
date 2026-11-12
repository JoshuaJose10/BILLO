import { requireOptionalNativeModule } from 'expo';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';

// Reconocimiento de voz para Nuevo gasto (HU-57, RF12) con expo-speech-recognition. El módulo
// nativo solo existe en el development build: en Expo Go cargarVoz() devuelve null y la hoja no
// muestra el micrófono.

let voz;

// Módulo de expo-speech-recognition o null si no está en el binario. Antes del require se revisa
// que el módulo nativo exista: en desarrollo, Metro manda a la pantalla roja los errores de un
// require hecho fuera de la carga inicial aunque haya try/catch (HU-23). El try/catch queda como
// segunda protección.
export function cargarVoz() {
  if (voz !== undefined) return voz;
  voz = null;
  if (!requireOptionalNativeModule('ExpoSpeechRecognition')) return voz;
  try {
    voz = require('expo-speech-recognition').ExpoSpeechRecognitionModule ?? null;
  } catch {
    voz = null;
  }
  return voz;
}

const vibrar = (promesa) => promesa.catch(() => {});

// Dictado de una sola frase en es-MX.
//   const { disponible, estado, transcripcion, empezar, detener } = useDictado({
//     onTerminado: (texto) => ..., // texto final ('' si no se oyó nada)
//     onFallo: (codigo) => ...,    // 'permiso' | 'no-disponible' | código del módulo ('no-speech'…)
//     frases: ['Comida', ...],     // palabras que ayudan al reconocedor
//   });
// estado: 'inactivo' | 'preparando' (pidiendo permiso) | 'escuchando'. Nunca guarda nada: quien lo
// usa decide qué hacer con el texto. Al desmontarse corta un dictado en curso.
export function useDictado({ onTerminado, onFallo, frases = [] }) {
  const modulo = cargarVoz();
  const [estado, setEstado] = useState('inactivo');
  const [transcripcion, setTranscripcion] = useState('');

  // El módulo emite eventos globales: solo se atienden los del dictado que empezó este hook.
  const activo = useRef(false);
  const texto = useRef('');
  const fallo = useRef(null);
  const callbacks = useRef({ onTerminado, onFallo });
  useEffect(() => {
    callbacks.current = { onTerminado, onFallo };
  });

  useEffect(() => {
    if (!modulo) return undefined;
    const subs = [
      modulo.addListener('start', () => {
        if (!activo.current) return;
        setEstado('escuchando');
        vibrar(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
      }),
      modulo.addListener('result', (e) => {
        if (!activo.current) return;
        texto.current = e.results?.[0]?.transcript ?? texto.current;
        setTranscripcion(texto.current);
      }),
      modulo.addListener('nomatch', () => {
        if (activo.current) fallo.current = fallo.current ?? 'nomatch';
      }),
      modulo.addListener('error', (e) => {
        if (activo.current) fallo.current = e?.error ?? 'unknown';
      }),
      // 'end' llega siempre al final, también después de 'error'.
      modulo.addListener('end', () => {
        if (!activo.current) return;
        activo.current = false;
        setEstado('inactivo');
        const final = texto.current.trim();
        // Sin voz el reconocedor reporta 'no-speech'; si ya hubo texto, ese texto vale.
        if (fallo.current && !(final && ['no-speech', 'nomatch'].includes(fallo.current))) {
          callbacks.current.onFallo?.(fallo.current);
        } else {
          callbacks.current.onTerminado?.(final);
        }
      }),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      if (activo.current) {
        activo.current = false;
        try {
          modulo.abort();
        } catch {
          // La hoja ya se cerró: no hay nada que limpiar.
        }
      }
    };
  }, [modulo]);

  const frasesRef = useRef(frases);
  useEffect(() => {
    frasesRef.current = frases;
  });

  const empezar = useCallback(async () => {
    if (!modulo || estado !== 'inactivo') return;
    texto.current = '';
    fallo.current = null;
    setTranscripcion('');
    setEstado('preparando');
    try {
      const permiso = await modulo.requestPermissionsAsync();
      if (!permiso?.granted) {
        setEstado('inactivo');
        callbacks.current.onFallo?.('permiso');
        return;
      }
      if (!modulo.isRecognitionAvailable()) {
        setEstado('inactivo');
        callbacks.current.onFallo?.('no-disponible');
        return;
      }
      activo.current = true;
      modulo.start({
        lang: 'es-MX',
        interimResults: true,
        continuous: false,
        contextualStrings: ['pesos', 'centavos', ...frasesRef.current],
      });
    } catch {
      activo.current = false;
      setEstado('inactivo');
      callbacks.current.onFallo?.('unknown');
    }
  }, [modulo, estado]);

  // Termina de escuchar: el reconocedor manda el texto final y luego 'end'.
  const detener = useCallback(() => {
    if (!activo.current) return;
    try {
      modulo.stop();
    } catch {
      modulo.abort?.();
    }
  }, [modulo]);

  return { disponible: modulo != null, estado, transcripcion, empezar, detener };
}
