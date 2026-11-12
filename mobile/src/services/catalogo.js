import { useMemo } from 'react';

import { useApi } from '../context/AuthContext';
import { aNumero } from '../utils/formato';

// Normaliza un servicio del catálogo asegurando costo numérico
export const normalizarItemCatalogo = (item) => ({
  ...item,
  costo_sugerido: aNumero(item.costo_sugerido),
});

// Servicio para el catálogo de servicios (RF5, RF9)
export function useCatalogoService() {
  const api = useApi();

  return useMemo(
    () => ({
      // GET /catalogo → [{ id, nombre, logo_url, costo_sugerido }]
      listar: async () => {
        const lista = await api('/catalogo');
        return (lista || []).map(normalizarItemCatalogo);
      },

      // POST /catalogo { nombre, logo_url?, costo_sugerido } → 201 { servicio }
      crear: async (datos) => {
        const respuesta = await api('/catalogo', {
          method: 'POST',
          body: datos,
        });
        return normalizarItemCatalogo(respuesta.servicio);
      },

      // PUT /catalogo/:id { nombre, logo_url?, costo_sugerido } → 200 { servicio }
      actualizar: async (id, datos) => {
        const respuesta = await api(`/catalogo/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: datos,
        });
        return normalizarItemCatalogo(respuesta.servicio);
      },

      // DELETE /catalogo/:id → 200 { eliminado: true }
      eliminar: (id) => api(`/catalogo/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    }),
    [api],
  );
}
