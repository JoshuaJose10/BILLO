import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Boton from '../components/Boton';
import EnlaceAuth from '../components/EnlaceAuth';
import HojaInferior from '../components/HojaInferior';
import { useAuth } from '../context/AuthContext';
import { useEstilos, useTema } from '../theme/TemaContext';
import { fonts } from '../theme/fonts';

// Textos según la hoja que se quiso abrir: Perfil explica el modo; el resto son acciones que
// escriben (nuevo gasto, editar, presupuestos, suscripciones, eliminar).
const CONTENIDO = {
  Perfil: {
    titulo: 'Modo exploración',
    icono: 'compass-outline',
    texto:
      'Estás viendo datos de ejemplo y nada de lo que hagas aquí se guarda. Crea tu cuenta para llevar tus propios gastos.',
  },
  guardar: {
    titulo: 'Crea tu cuenta para guardar',
    icono: 'content-save-outline',
    texto:
      'En el modo exploración puedes ver todo, pero no se guarda nada. Con una cuenta registras tus gastos, presupuestos y suscripciones.',
  },
};

// Hoja del modo exploración (HU-50). En ese modo RootNavigator la usa en lugar de Nuevo gasto,
// Presupuesto, Membresía y Perfil, y FilaDeslizable la abre al intentar eliminar. Crear cuenta e
// Iniciar sesión salen del modo (se descartan los datos de ejemplo); Seguir explorando la cierra.
export default function InvitacionCuentaScreen({ navigation, route }) {
  const { salirDeVisitante } = useAuth();
  const { colors } = useTema();
  const styles = useEstilos(crearEstilos);
  const hoja = useRef(null);
  const { titulo, icono, texto } = CONTENIDO[route.name] ?? CONTENIDO.guardar;

  return (
    <HojaInferior
      ref={hoja}
      titulo={titulo}
      etiquetaFondo="Seguir explorando"
      onCerrada={() => navigation.goBack()}
    >
      <View style={styles.cuerpo}>
        <View style={styles.icono}>
          <MaterialCommunityIcons name={icono} size={28} color={colors.acentoTexto} />
        </View>
        <Text style={styles.texto}>{texto}</Text>
      </View>

      <View style={styles.botones}>
        <Boton
          titulo="Crear cuenta"
          icono="arrow-right"
          onPress={() => salirDeVisitante('Registro')}
        />
        <Boton titulo="Seguir explorando" onPress={() => hoja.current?.cerrar()} secundario />
      </View>

      <EnlaceAuth
        pregunta="¿Ya tienes cuenta?"
        accion="Inicia sesión"
        onPress={() => salirDeVisitante('Login')}
      />
    </HojaInferior>
  );
}

const crearEstilos = (colors) =>
  StyleSheet.create({
    cuerpo: {
      alignItems: 'center',
      gap: 16,
      marginTop: 8,
      marginBottom: 28,
    },
    icono: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.acentoSuave,
    },
    // body-md on-surface-variant
    texto: {
      fontFamily: fonts.sans,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textVariant,
      textAlign: 'center',
    },
    botones: {
      gap: 12,
    },
  });
