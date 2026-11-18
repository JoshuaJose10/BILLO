import { useMemo } from 'react';

import { useApi } from '../context/AuthContext';
import { aNumero } from '../utils/formato';

export const normalizarTarjeta = (tarjeta) => {
  if (!tarjeta || typeof tarjeta !== 'object') return tarjeta;
  return {
    ...tarjeta,
    id: Number(tarjeta.id),
    nombre: typeof tarjeta.nombre === 'string' ? tarjeta.nombre.trim() : '',
    ultimos4:
      typeof tarjeta.ultimos4 === 'string'
        ? tarjeta.ultimos4.trim()
        : String(tarjeta.ultimos4 ?? ''),
    dia_corte:
      tarjeta.dia_corte === null || tarjeta.dia_corte === undefined
        ? null
        : Number(tarjeta.dia_corte),
    dia_pago:
      tarjeta.dia_pago === null || tarjeta.dia_pago === undefined ? null : Number(tarjeta.dia_pago),
    total_mes:
      tarjeta.total_mes === null || tarjeta.total_mes === undefined
        ? 0
        : aNumero(tarjeta.total_mes),
  };
};

export const normalizarResumenTarjeta = (resumen) => ({
  tarjeta_id: Number(resumen?.tarjeta_id),
  mes: resumen?.mes ?? null,
  gasto_variable: aNumero(resumen?.gasto_variable),
  gasto_fijo: aNumero(resumen?.gasto_fijo),
  total: aNumero(resumen?.total),
});

// Servicio de tarjetas con el token de la sesión (un 401 cierra la sesión vía useApi).
export function useTarjetasService() {
  const api = useApi();

  return useMemo(
    () => ({
      // GET /tarjetas → [{ id, nombre, tipo, ultimos4, dia_corte, dia_pago, creada_en }]
      listarTarjetas: async () => {
        const lista = await api('/tarjetas');
        return (lista || []).map(normalizarTarjeta);
      },

      // POST /tarjetas { nombre, tipo, ultimos4, dia_corte?, dia_pago? } → 201 { tarjeta }
      crearTarjeta: async (datos) => {
        const respuesta = await api('/tarjetas', { method: 'POST', body: datos });
        return normalizarTarjeta(respuesta.tarjeta);
      },

      // PUT /tarjetas/:id { nombre, tipo, ultimos4, dia_corte?, dia_pago? } → 200 { tarjeta }
      actualizarTarjeta: async (id, datos) => {
        const respuesta = await api(`/tarjetas/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: datos,
        });
        return normalizarTarjeta(respuesta.tarjeta);
      },

      // DELETE /tarjetas/:id → 200 { eliminado: true }
      eliminarTarjeta: (id) => api(`/tarjetas/${encodeURIComponent(id)}`, { method: 'DELETE' }),

      // GET /tarjetas/:id/resumen?mes=YYYY-MM → { tarjeta_id, mes, gasto_variable, gasto_fijo, total }
      obtenerResumenTarjeta: async (id, mes) => {
        const respuesta = await api(
          `/tarjetas/${encodeURIComponent(id)}/resumen?mes=${encodeURIComponent(mes)}`,
        );
        return normalizarResumenTarjeta(respuesta);
      },

      // Consulta las tarjetas y el resumen del mes indicado para cada una.
      listarTarjetasConResumen: async (mes) => {
        const lista = await api('/tarjetas');
        const normalizadas = (lista || []).map(normalizarTarjeta);
        if (!mes || normalizadas.length === 0) return normalizadas;

        const resumenes = await Promise.all(
          normalizadas.map((t) =>
            api(`/tarjetas/${encodeURIComponent(t.id)}/resumen?mes=${encodeURIComponent(mes)}`)
              .then(normalizarResumenTarjeta)
              .catch(() => ({ gasto_variable: 0, gasto_fijo: 0, total: 0 })),
          ),
        );

        return normalizadas.map((t, i) => ({
          ...t,
          gasto_variable: resumenes[i].gasto_variable,
          gasto_fijo: resumenes[i].gasto_fijo,
          total_mes: resumenes[i].total,
        }));
      },
    }),
    [api],
  );
}
