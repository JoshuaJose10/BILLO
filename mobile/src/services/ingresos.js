import { useMemo } from 'react';

import { useApi } from '../context/AuthContext';
import { aNumero } from '../utils/formato';
import { normalizarFrecuencia } from '../utils/ingresos';

// Sin `frecuencia` el body viaja igual que antes; con ella (o null para cancelar) se normaliza.
const conFrecuencia = ({ frecuencia, ...datos }) =>
  frecuencia === undefined ? datos : { ...datos, frecuencia: normalizarFrecuencia(frecuencia) };

const normalizarIngreso = (ingreso) => ({ ...ingreso, monto: aNumero(ingreso.monto) });

// Servicio de ingresos (HU-82, docs/api-contrato.md «Ingresos») con el token de la sesión:
//   const { listarIngresos, crearIngreso, actualizarIngreso, eliminarIngreso } = useIngresosService();
// Body de POST y PUT: { monto, fecha: 'YYYY-MM-DD', descripcion?, fuente?, frecuencia? };
// `frecuencia` 'semanal' | 'quincenal' | 'mensual' o null (único; en PUT cancela la recurrencia).
// Las respuestas traen `frecuencia`, `proximo_ingreso` y `recurrente` (generado por el proceso diario).
// 400: MONTO_INVALIDO, FECHA_INVALIDA, DESCRIPCION_INVALIDA, FUENTE_INVALIDA, FRECUENCIA_INVALIDA
// (MES_INVALIDO en GET).
// 404 (PUT y DELETE): INGRESO_NO_ENCONTRADO.
export function useIngresosService() {
  const api = useApi();

  return useMemo(
    () => ({
      // GET /ingresos?mes=YYYY-MM → [ingreso], por fecha descendente (id descendente).
      listarIngresos: async ({ mes } = {}) => {
        const ingresos = await api(`/ingresos${mes ? `?mes=${encodeURIComponent(mes)}` : ''}`);
        return (ingresos || []).map(normalizarIngreso);
      },

      // POST /ingresos → 201 { ingreso }. Devuelve el ingreso.
      crearIngreso: async (datos) =>
        normalizarIngreso(
          (await api('/ingresos', { method: 'POST', body: conFrecuencia(datos) })).ingreso,
        ),

      // PUT /ingresos/:id (se reemplazan todos los campos) → 200 { ingreso }.
      actualizarIngreso: async (id, datos) =>
        normalizarIngreso(
          (
            await api(`/ingresos/${encodeURIComponent(id)}`, {
              method: 'PUT',
              body: conFrecuencia(datos),
            })
          ).ingreso,
        ),

      // DELETE /ingresos/:id → 200 { eliminado: true }.
      eliminarIngreso: (id) => api(`/ingresos/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    }),
    [api],
  );
}
