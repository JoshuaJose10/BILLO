import { useMemo } from 'react';

import { useApi } from '../context/AuthContext';
import { normalizarPorCategoria, normalizarResumen } from '../utils/reportes';

// Servicio de reportes (RF6, RF8) con el token de la sesión (un 401 cierra la sesión vía useApi).
// Los errores llegan como { code, message, status } (contrato v1.1); ver utils/errores.js.
//   const { obtenerResumen, obtenerPorCategoria } = useReportesService();
export function useReportesService() {
  const api = useApi();

  return useMemo(
    () => ({
      // GET /reportes/resumen?mes=YYYY-MM → { mes, gasto_variable, gasto_fijo, total }.
      // gasto_variable = suma de los gastos del mes; gasto_fijo = membresías por mes (anual ÷ 12).
      // 400: MES_INVALIDO. 500: ERROR_SERVIDOR.
      obtenerResumen: async (mes) =>
        normalizarResumen(await api(`/reportes/resumen?mes=${encodeURIComponent(mes)}`), mes),

      // GET /reportes/por-categoria?mes=YYYY-MM → [{ categoria_id, categoria, total, porcentaje }]
      // de mayor a menor (gráfica de dona de Reportes, HU-37). 400: MES_INVALIDO.
      // 500: ERROR_SERVIDOR.
      obtenerPorCategoria: async (mes) =>
        normalizarPorCategoria(await api(`/reportes/por-categoria?mes=${encodeURIComponent(mes)}`)),
    }),
    [api],
  );
}
