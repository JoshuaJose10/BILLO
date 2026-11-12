import { useMemo } from 'react';

import { useApi } from '../context/AuthContext';

// Cache en memoria para almacenar el último tipo de cambio conocido por divisa
const cacheUltimoConocido = new Map();

export function guardarUltimoTipoCambio(moneda, tipoCambio, fecha = null) {
  if (moneda && tipoCambio) {
    cacheUltimoConocido.set(moneda, {
      moneda,
      tipo_cambio: typeof tipoCambio === 'number' ? tipoCambio : Number(tipoCambio),
      fecha: fecha || new Date().toISOString().slice(0, 10),
    });
  }
}

export function obtenerUltimoTipoCambioConocido(moneda) {
  return cacheUltimoConocido.get(moneda) || null;
}

// Servicio para consultar el tipo de cambio hacia MXN (GET /divisas/tipo-cambio?moneda=USD)
export function useDivisasService() {
  const api = useApi();

  return useMemo(
    () => ({
      // GET /divisas/tipo-cambio?moneda=USD
      // → 200 { moneda: 'USD', tipo_cambio: 18.6311, fecha: 'YYYY-MM-DD' }
      // 400: MONEDA_INVALIDA, 502: FUENTE_NO_DISPONIBLE
      // Sin conexión / fuente no disponible: usa el último conocido con desactualizado: true (HU-77)
      obtenerTipoCambio: async (moneda) => {
        try {
          const resp = await api(`/divisas/tipo-cambio?moneda=${encodeURIComponent(moneda)}`);
          if (resp && resp.tipo_cambio) {
            guardarUltimoTipoCambio(moneda, resp.tipo_cambio, resp.fecha);
          }
          return resp;
        } catch (error) {
          const cached = cacheUltimoConocido.get(moneda);
          if (cached) {
            return {
              ...cached,
              desactualizado: true,
            };
          }
          throw error;
        }
      },
    }),
    [api],
  );
}
