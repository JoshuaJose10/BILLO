import { useCallback } from 'react';

import { useCategorias } from '../context/CategoriasContext';
import { useGastosService } from '../services/gastos';
import { useIngresosService } from '../services/ingresos';
import { useMembresiasService } from '../services/membresias';
import { useReportesService } from '../services/reportes';
import { mesActual } from '../utils/fechas';
import { actualizarWidget } from './sincronizar';

// HU-58 (RF13) y feature/widgets-billo: devuelve una función que pide el resumen, los gastos,
// los ingresos y las suscripciones del mes y actualiza el almacén compartido de los 4 widgets.
// Se llama sin esperar (al registrar, editar o borrar gastos, ingresos y suscripciones) y nunca
// lanza errores.
export function useActualizarWidget() {
  const { obtenerResumen } = useReportesService();
  const { listarGastos } = useGastosService();
  const { listarIngresos } = useIngresosService();
  const { listarMembresias } = useMembresiasService();
  const { todasCategorias, categorias } = useCategorias();

  return useCallback(async () => {
    try {
      const mes = mesActual();
      const [resumen, gastos, ingresos, membresias] = await Promise.all([
        obtenerResumen(mes),
        listarGastos({ mes }).catch(() => []),
        listarIngresos({ mes }).catch(() => []),
        listarMembresias().catch(() => []),
      ]);
      const listaCategorias = todasCategorias?.length ? todasCategorias : categorias;
      const nombresCategoria = Object.fromEntries(
        (listaCategorias || []).map((c) => [c.id, c.nombre]),
      );
      await actualizarWidget({ resumen, gastos, ingresos, membresias, nombresCategoria }, mes);
    } catch {
      // Sin red el widget conserva lo último que mostró.
    }
  }, [obtenerResumen, listarGastos, listarIngresos, listarMembresias, todasCategorias, categorias]);
}
