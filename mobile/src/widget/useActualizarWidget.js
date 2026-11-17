import { useCallback } from 'react';

import { useCategorias } from '../context/CategoriasContext';
import { useGastosService } from '../services/gastos';
import { useIngresosService } from '../services/ingresos';
import { useMembresiasService } from '../services/membresias';
import { useReportesService } from '../services/reportes';
import { mesActual } from '../utils/fechas';
import { cargarDatosInicio } from '../utils/inicio';
import { actualizarWidget } from './sincronizar';

// HU-58 (RF13): devuelve una función que pide los datos de Inicio del mes (sin presupuestos) y
// actualiza el widget. Se llama sin esperar (nuevo gasto, editar, eliminar) y nunca lanza errores.
export function useActualizarWidget() {
  const { obtenerResumen } = useReportesService();
  const { listarGastos } = useGastosService();
  const { listarIngresos } = useIngresosService();
  const { listarMembresias } = useMembresiasService();
  const { todasCategorias } = useCategorias();
  return useCallback(async () => {
    try {
      const mes = mesActual();
      const datos = await cargarDatosInicio(
        { obtenerResumen, listarGastos, listarIngresos, listarMembresias },
        mes,
      );
      await actualizarWidget({ ...datos, categorias: todasCategorias }, mes);
    } catch {
      // Sin red el widget conserva lo último que mostró.
    }
  }, [obtenerResumen, listarGastos, listarIngresos, listarMembresias, todasCategorias]);
}
