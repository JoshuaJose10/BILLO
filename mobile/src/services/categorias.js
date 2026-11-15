import { useMemo } from 'react';

import { useApi } from '../context/AuthContext';

// Servicio de categorías para Mis categorías (HU-90) y Onboarding (HU-89):
//   const {
//     listarCategorias,
//     listarPredefinidas,
//     guardarSeleccion,
//     crearCategoria,
//     renombrarCategoria,
//     eliminarCategoria,
//   } = useCategoriasService();
export function useCategoriasService() {
  const api = useApi();

  return useMemo(
    () => ({
      // GET /categorias → [{ id, nombre, tipo, es_predefinida, propia, color }]
      listarCategorias: async () => (await api('/categorias')) || [],

      // GET /categorias/predefinidas → [{ id, nombre, tipo, es_predefinida, propia, color, seleccionada }]
      listarPredefinidas: async () => {
        const respuesta = await api('/categorias/predefinidas');
        if (Array.isArray(respuesta)) return respuesta;
        return respuesta?.categorias || [];
      },

      // PUT /categorias/seleccion { categoria_ids: [number] }
      // → 200 { categoria_ids, categorias_configuradas, categorias }
      guardarSeleccion: (categoriaIds) =>
        api('/categorias/seleccion', {
          method: 'PUT',
          body: { categoria_ids: categoriaIds },
        }),

      // POST /categorias { nombre } → 201 { categoria }
      crearCategoria: async (nombre) => {
        const respuesta = await api('/categorias', {
          method: 'POST',
          body: { nombre },
        });
        return respuesta?.categoria ?? respuesta;
      },

      // PUT /categorias/:id { nombre } → 200 { categoria }
      renombrarCategoria: async (id, nombre) => {
        const respuesta = await api(`/categorias/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: { nombre },
        });
        return respuesta?.categoria ?? respuesta;
      },

      // DELETE /categorias/:id → 200 { eliminado: true } | 409 CATEGORIA_EN_USO
      eliminarCategoria: (id) =>
        api(`/categorias/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        }),
    }),
    [api],
  );
}
