import { useMemo } from 'react';

import { useApi } from '../context/AuthContext';
import { aNumero } from '../utils/formato';

// Normaliza los campos de una membresía proveniente de la API (costo y dias_para_cobro como número).
export const normalizarMembresia = (membresia) => ({
  ...membresia,
  costo: aNumero(membresia.costo),
  dias_para_cobro:
    membresia.dias_para_cobro !== undefined && membresia.dias_para_cobro !== null
      ? Number(membresia.dias_para_cobro)
      : undefined,
});

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
        return (lista || []).map(normalizarMembresia);
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

      // GET /catalogo → [{ id, nombre, logo_url, costo_sugerido }]
      listarCatalogo: async () => {
        const lista = await api('/catalogo');
        return (lista || []).map(normalizarCatalogo);
      },
    }),
    [api],
  );
}
