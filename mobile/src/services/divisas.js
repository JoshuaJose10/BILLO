import { useMemo } from 'react';

import { useApi } from '../context/AuthContext';

// Servicio para consultar el tipo de cambio hacia MXN (GET /divisas/tipo-cambio?moneda=USD)
export function useDivisasService() {
  const api = useApi();

  return useMemo(
    () => ({
      // GET /divisas/tipo-cambio?moneda=USD
      // → 200 { moneda: 'USD', tipo_cambio: 18.6311, fecha: 'YYYY-MM-DD' }
      // 400: MONEDA_INVALIDA, 502: FUENTE_NO_DISPONIBLE
      obtenerTipoCambio: (moneda) =>
        api(`/divisas/tipo-cambio?moneda=${encodeURIComponent(moneda)}`),
    }),
    [api],
  );
}
