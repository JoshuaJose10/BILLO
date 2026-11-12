import { useCallback } from 'react';

import { useReportesService } from '../services/reportes';
import { mesActual } from '../utils/fechas';
import { actualizarWidget } from './sincronizar';

// HU-58 (RF13): devuelve una función que pide el resumen del mes y actualiza el widget. Se llama
// sin esperar (nuevo gasto, editar, eliminar) y nunca lanza errores.
export function useActualizarWidget() {
  const { obtenerResumen } = useReportesService();
  return useCallback(async () => {
    try {
      const mes = mesActual();
      await actualizarWidget(await obtenerResumen(mes), mes);
    } catch {
      // Sin red el widget conserva lo último que mostró.
    }
  }, [obtenerResumen]);
}
