import { useMemo } from 'react';

import { useApi } from '../context/AuthContext';
import { aNumero } from '../utils/formato';
import { ajustarAlSiguienteCiclo } from '../utils/membresias';

// Normaliza los campos de una membresía proveniente de la API (costo numérico)
// y avanza la fecha de cobro al siguiente ciclo si ya venció (HU-51 / BUG-01).
export const normalizarMembresia = (membresia) => {
  if (!membresia || typeof membresia !== 'object') return membresia;
  const base = {
    ...membresia,
    costo: aNumero(membresia.costo),
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

      // POST /membresias/:id/pagada → 200 { membresia } (HU-66)
      marcarPagada: async (id) => {
        const respuesta = await api(`/membresias/${encodeURIComponent(id)}/pagada`, {
          method: 'POST',
        });
        return normalizarMembresia(respuesta.membresia);
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
