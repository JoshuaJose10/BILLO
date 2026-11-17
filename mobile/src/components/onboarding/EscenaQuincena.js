import { StyleSheet, Text, View } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';

import { crearDatosEjemplo, saldoMesEjemplo } from '../../datos/ejemplo';
import { tramo, useReloj } from '../../hooks/useReloj';
import { espacios, estiloTarjeta } from '../../theme/colors';
import { useEstilos } from '../../theme/TemaContext';
import { tipografia } from '../../theme/tipografia';
import { formatearMontoCorto } from '../../utils/formato';
import BarraPresupuesto from '../BarraPresupuesto';
import ChipCategoria from '../ChipCategoria';
import ChipServicio from '../ChipServicio';
import Etiqueta from '../Etiqueta';
import Flotante from '../Flotante';
import TarjetaSaldo from '../TarjetaSaldo';

const SALDO = saldoMesEjemplo();
const CAFE = `−${formatearMontoCorto(crearDatosEjemplo().gastos.find((g) => g.nota === 'Café').monto)}`;
// La barra de la meta se llena, se sostiene y se vacía suave antes de volver a empezar.
const CICLO = 8000;
const LLENO = 0.62;
// Lo que una pieza de esquina se mete sobre la tarjeta de saldo: menos que su padding (14), así
// solo toca el borde y nunca tapa texto.
const ENCIMADO = espacios.sm + 4;

// Paso 1 del onboarding (Stitch 01): el saldo de Inicio al centro como protagonista y tres piezas
// reales en las esquinas del área (la meta arriba a la izquierda, Netflix arriba a la derecha y
// el café abajo a la derecha), apenas encimadas sobre sus esquinas. Todo flota ±4 px desfasado y
// se detiene fuera del paso visible.
export default function EscenaQuincena({ activa }) {
  const styles = useEstilos(crearEstilos);
  const t = useReloj(activa, CICLO, 1300);
  const avance = useDerivedValue(
    () => LLENO * (tramo(t.value, 300, 1300) - tramo(t.value, 7300, 7900)),
  );

  return (
    <View style={styles.escena}>
      <View style={styles.fila}>
        <Flotante activa={activa} indice={1} amplitud={4} style={styles.meta}>
          <View style={styles.tarjeta}>
            <Etiqueta>Meta mensual</Etiqueta>
            <Text style={styles.metaTexto}>Bajo control</Text>
            <BarraPresupuesto avance={avance} porcentaje={62} estado="ok" categoria="Comida" />
          </View>
        </Flotante>
        <Flotante activa={activa} indice={2} amplitud={4} style={styles.netflix}>
          <ChipServicio nombre="Netflix" monto={219} />
        </Flotante>
      </View>

      <View style={styles.centro}>
        <Flotante activa={activa} amplitud={4} style={styles.saldo}>
          <View style={styles.tarjeta}>
            <TarjetaSaldo saldo={SALDO.saldo} ingresos={SALDO.ingresos} />
          </View>
        </Flotante>
      </View>

      <View style={[styles.fila, styles.filaAbajo]}>
        <Flotante activa={activa} indice={3} amplitud={4} style={styles.cafe}>
          <ChipCategoria nombre="Café" icono="coffee-outline" nota={CAFE} seleccionado />
        </Flotante>
      </View>
    </View>
  );
}

// Columna que ocupa toda el área: arriba la fila de la meta y Netflix, en medio el saldo centrado
// y abajo el café. Con poco alto las filas se meten ENCIMADO px sobre las esquinas del saldo; con
// mucho, quedan separadas en las esquinas.
const crearEstilos = (colors) =>
  StyleSheet.create({
    escena: {
      flex: 1,
      padding: espacios.lg,
    },
    fila: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: espacios.lg,
      zIndex: 1,
    },
    filaAbajo: {
      justifyContent: 'flex-end',
    },
    centro: {
      flex: 1,
      justifyContent: 'center',
      marginVertical: -ENCIMADO,
    },
    tarjeta: {
      ...estiloTarjeta(colors),
      gap: 6,
    },
    saldo: {
      width: '85%',
      alignSelf: 'center',
      transform: [{ rotate: '-1deg' }],
    },
    // Del ancho de su contenido: en 375 pt caben la meta y Netflix lado a lado.
    meta: {
      flexShrink: 1,
      transform: [{ rotate: '-4deg' }],
    },
    netflix: {
      marginTop: espacios.sm,
      transform: [{ rotate: '3deg' }],
    },
    cafe: {
      transform: [{ rotate: '-3deg' }],
    },
    metaTexto: {
      ...tipografia.headlineSm,
      color: colors.exitoTexto,
    },
  });
