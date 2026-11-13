import { useMemo } from 'react';

import { useApi } from '../context/AuthContext';
import { aNumero } from '../utils/formato';
import { ajustarAlSiguienteCiclo } from '../utils/membresias';
import { guardarUltimoTipoCambio } from './divisas';

// Normaliza los campos de una membresía proveniente de la API (costo numérico, divisa)
// y avanza la fecha de cobro al siguiente ciclo si ya venció (HU-51 / BUG-01).
export const normalizarMembresia = (membresia) => {
  if (!membresia || typeof membresia !== 'object') return membresia;
  const moneda = membresia.moneda || 'MXN';
  const montoOriginal =
    membresia.monto_original !== undefined && membresia.monto_original !== null
      ? aNumero(membresia.monto_original)
      : null;
  const tipoCambio =
    membresia.tipo_cambio !== undefined && membresia.tipo_cambio !== null
      ? aNumero(membresia.tipo_cambio)
      : null;

  if (moneda !== 'MXN' && tipoCambio) {
    guardarUltimoTipoCambio(moneda, tipoCambio);
  }

  const base = {
    ...membresia,
    costo: aNumero(membresia.costo),
    moneda,
    monto_original: montoOriginal,
    tipo_cambio: tipoCambio,
    dias_para_cobro:
      membresia.dias_para_cobro !== undefined && membresia.dias_para_cobro !== null
        ? Number(membresia.dias_para_cobro)
        : undefined,
  };
  return ajustarAlSiguienteCiclo(base);
};

// Normaliza un elemento del catálogo de servicios.
export const normalizarCatalogo = (item) => ({
  ...item,
  costo_sugerido: aNumero(item.costo_sugerido),
});

// Normaliza un registro del historial de pagos de una membresía.
export const normalizarPagoMembresia = (pago) => ({
  ...pago,
  monto: aNumero(pago?.monto),
});

// Servicio de membresías y suscripciones (RF5) con el token de sesión activo.
export function useMembresiasService() {
  const api = useApi();

  return useMemo(
    () => ({
      // GET /membresias → [{ id, servicio_id, nombre, costo, frecuencia, fecha_cobro, dias_para_cobro }]
      listarMembresias: async () => {
        const lista = await api('/membresias');
        const normalizadas = (lista || []).map(normalizarMembresia);
        return normalizadas.sort((a, b) => {
          const diasA = typeof a.dias_para_cobro === 'number' ? a.dias_para_cobro : Infinity;
          const diasB = typeof b.dias_para_cobro === 'number' ? b.dias_para_cobro : Infinity;
          return diasA - diasB;
        });
      },

      // POST /membresias { servicio_id?, nombre, costo, frecuencia, fecha_cobro } → 201 { membresia }
      crearMembresia: async (datos) => {
        const respuesta = await api('/membresias', {
          method: 'POST',
          body: datos,
        });
        return normalizarMembresia(respuesta.membresia);
      },

      // PUT /membresias/:id { servicio_id?, nombre, costo, frecuencia, fecha_cobro } → 200 { membresia }
      actualizarMembresia: async (id, datos) => {
        const respuesta = await api(`/membresias/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: datos,
        });
        return normalizarMembresia(respuesta.membresia);
      },

      // DELETE /membresias/:id → 200 { eliminado: true }
      eliminarMembresia: (id) => api(`/membresias/${encodeURIComponent(id)}`, { method: 'DELETE' }),

      // POST /membresias/:id/pausar → 200 { membresia } (HU-75)
      pausarMembresia: async (id) => {
        const respuesta = await api(`/membresias/${encodeURIComponent(id)}/pausar`, {
          method: 'POST',
        });
        return normalizarMembresia(respuesta.membresia);
      },

      // POST /membresias/:id/reactivar → 200 { membresia } (HU-75)
      reactivarMembresia: async (id) => {
        const respuesta = await api(`/membresias/${encodeURIComponent(id)}/reactivar`, {
          method: 'POST',
        });
        return normalizarMembresia(respuesta.membresia);
      },

      // POST /membresias/:id/pagada → 200 { membresia, pago } (HU-66)
      marcarPagada: async (id) => {
        const respuesta = await api(`/membresias/${encodeURIComponent(id)}/pagada`, {
          method: 'POST',
        });
        return normalizarMembresia(respuesta.membresia);
      },

      // GET /membresias/:id/pagos → [{ id, membresia_id, fecha, monto }]
      listarPagos: async (id) => {
        const lista = await api(`/membresias/${encodeURIComponent(id)}/pagos`);
        return (lista || []).map(normalizarPagoMembresia);
      },

      // GET /catalogo → [{ id, nombre, logo_url, costo_sugerido }]
      listarCatalogo: async () => {
        const lista = await api('/catalogo');
        return (lista || []).map(normalizarCatalogo);
      },
    }),
    [api],
  );
}
