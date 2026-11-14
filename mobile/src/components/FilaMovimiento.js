import FilaDeslizable from './FilaDeslizable';
import ItemGasto from './ItemGasto';

const NO_EXISTE = { gasto: 'GASTO_NO_ENCONTRADO', ingreso: 'INGRESO_NO_ENCONTRADO' };

// Fila deslizable de un movimiento de la lista mezclada (agruparPorDia o movimientosRecientes):
// gasto o ingreso según `movimiento.tipo`. Tocar o Editar → `onEditar`; Eliminar pide confirmación
// y llama a `eliminar(id)`. Inicio y Movimientos la usan igual; Movimientos pasa `metodoPago`.
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
  return (
    <FilaDeslizable
      filas={filas}
      onEditar={onEditar}
      eliminar={() => eliminar(movimiento.id)}
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
          nombreCategoria={nombreCategoria}
          metodoPago={metodoPago}
          opaca
        />
      )}
    </FilaDeslizable>
  );
}
