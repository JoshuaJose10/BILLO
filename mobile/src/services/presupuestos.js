import { useMemo } from 'react';

import { useApi } from '../context/AuthContext';
import { categoriasDeGasto, normalizarPresupuesto } from '../utils/presupuestos';

// Servicio de presupuestos (RF3) con el token de la sesión (un 401 cierra la sesión vía useApi).
// Los errores llegan como { code, message, status } (contrato v1.1); ver utils/errores.js.
//   const { listarPresupuestos, crearPresupuesto, actualizarPresupuesto, eliminarPresupuesto,
//     listarCategoriasGasto } = usePresupuestosService();
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

      // GET /categorias?tipo=gasto → solo las de gasto (se filtran también en la app mientras
      // la API ignore `tipo`).
      listarCategoriasGasto: async () => categoriasDeGasto(await api('/categorias?tipo=gasto')),
    }),
    [api],
  );
}
