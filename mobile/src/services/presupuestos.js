import { useMemo } from 'react';

import { useApi } from '../context/AuthContext';
import { normalizarPresupuesto } from '../utils/presupuestos';

// Servicio de presupuestos (RF3) con el token de la sesión (un 401 cierra la sesión vía useApi).
// Los errores llegan como { code, message, status } (contrato v1.1); ver utils/errores.js.
//   const { listarPresupuestos, crearPresupuesto, actualizarPresupuesto, eliminarPresupuesto } =
//     usePresupuestosService();
// Las categorías de gasto vienen de la caché de la sesión: useCategorias().categoriasGasto.
export function usePresupuestosService() {
  const api = useApi();

  return useMemo(
    () => ({
      // GET /presupuestos?mes=YYYY-MM → [{ id, categoria_id, categoria, mes, monto_limite,
      // gastado, porcentaje, estado: 'ok' | 'alerta' | 'excedido' }]. 400: MES_INVALIDO.
      listarPresupuestos: async (mes) => {
        const lista = await api(`/presupuestos?mes=${encodeURIComponent(mes)}`);
        return (lista || []).map(normalizarPresupuesto);
      },

      // POST /presupuestos { categoria_id, mes, monto_limite } → 201 { presupuesto }.
      // 400: MONTO_INVALIDO, CATEGORIA_INEXISTENTE, MES_INVALIDO. 409: PRESUPUESTO_DUPLICADO.
      crearPresupuesto: async ({ categoria_id, mes, monto_limite }) => {
        const { presupuesto } = await api('/presupuestos', {
          method: 'POST',
          body: { categoria_id, mes, monto_limite },
        });
        return normalizarPresupuesto(presupuesto);
      },

      // PUT /presupuestos/:id { monto_limite } → 200 { presupuesto }.
      // 400: MONTO_INVALIDO. 404: PRESUPUESTO_NO_ENCONTRADO.
      actualizarPresupuesto: async (id, monto_limite) => {
        const { presupuesto } = await api(`/presupuestos/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: { monto_limite },
        });
        return normalizarPresupuesto(presupuesto);
      },

      // DELETE /presupuestos/:id → 200 { eliminado: true }. 404: PRESUPUESTO_NO_ENCONTRADO.
      eliminarPresupuesto: (id) =>
        api(`/presupuestos/${encodeURIComponent(id)}`, { method: 'DELETE' }),

      // POST /presupuestos/copiar { desde, hasta } → 201/200 { presupuestos, copiados }.
      // 400: MES_INVALIDO. 404: SIN_PRESUPUESTOS_ORIGEN.
      copiarPresupuestos: async ({ desde, hasta }) => {
        const respuesta = await api('/presupuestos/copiar', {
          method: 'POST',
          body: { desde, hasta },
        });
        return {
          presupuestos: (respuesta?.presupuestos || []).map(normalizarPresupuesto),
          copiados: Number(respuesta?.copiados) || 0,
        };
      },
    }),
    [api],
  );
}
