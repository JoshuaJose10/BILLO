import { estiloServicio } from '../utils/membresias';
import FilaDeslizable from './FilaDeslizable';
import ItemGasto from './ItemGasto';

const NO_EXISTE = { gasto: 'GASTO_NO_ENCONTRADO', ingreso: 'INGRESO_NO_ENCONTRADO' };

// Fila deslizable de un movimiento de la lista mezclada (agruparPorDia o movimientosRecientes):
// gasto o ingreso según `movimiento.tipo`. Tocar o Editar → `onEditar`; Eliminar pide confirmación
// y llama a `eliminar(id)`. Inicio y Movimientos la usan igual; Movimientos pasa `metodoPago`.
// Un cobro de suscripción (`tipo: 'suscripcion'`) es solo vista: se pinta como gasto con la
// categoría «Suscripción» y el logo del servicio (el mismo de Cartera) o, si no tiene, el ícono de
// repetir en el color de esa categoría; no se desliza y tocarlo llama a `onEditar`.
export default function FilaMovimiento({
  movimiento,
  filas,
  eliminar,
  onEditar,
  onEliminado,
  nombreCategoria,
  metodoPago,
}) {
  const { tipo } = movimiento;
  const esSuscripcion = tipo === 'suscripcion';
  const servicio = esSuscripcion ? estiloServicio(movimiento.nota) : null;
  return (
    <FilaDeslizable
      filas={filas}
      onEditar={onEditar}
      eliminar={esSuscripcion ? undefined : () => eliminar(movimiento.id)}
      onEliminado={onEliminado}
      tituloEliminar={`¿Eliminar ${tipo}?`}
      codigoNoExiste={NO_EXISTE[tipo]}
      mensajeNoExiste={`Este ${tipo} ya no existe`}
    >
      {tipo === 'ingreso' ? (
        <ItemGasto ingreso={movimiento} opaca />
      ) : (
        <ItemGasto
          gasto={movimiento}
          nombreCategoria={esSuscripcion ? 'Suscripción' : nombreCategoria}
          marca={servicio?.predefinido ? servicio : undefined}
          metodoPago={metodoPago}
          opaca
        />
      )}
    </FilaDeslizable>
  );
}
