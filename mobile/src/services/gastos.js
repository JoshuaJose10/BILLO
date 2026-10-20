import { useMemo } from 'react';

import { useApi } from '../context/AuthContext';
import { aNumero } from '../utils/formato';

// Valores que acepta el backend en `metodo_pago` (gastos.controller.js).
export const METODOS_PAGO = [
  { valor: 'efectivo', etiqueta: 'Efectivo', icono: 'cash' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta', icono: 'credit-card-outline' },
  { valor: 'transferencia', etiqueta: 'Transferencia', icono: 'bank-transfer' },
  { valor: 'otro', etiqueta: 'Otro', icono: 'dots-horizontal-circle-outline' },
];

export const METODO_PAGO_DEFECTO = 'efectivo';

// Límite de `nota` que valida el backend (la columna admite 255, la API 200).
export const NOTA_MAX = 200;

const normalizarGasto = (gasto) => ({ ...gasto, monto: aNumero(gasto.monto) });

// Servicio de gastos con el token de la sesión (un 401 cierra la sesión vía useApi):
//   const { listarCategorias, crearGasto, listarGastos } = useGastosService();
export function useGastosService() {
  const api = useApi();

  return useMemo(
    () => ({
      // GET /categorias → [{ id, nombre }]
      listarCategorias: () => api('/categorias'),

      // POST /gastos { monto, categoria_id, fecha: 'YYYY-MM-DD', metodo_pago, nota? }
      // → 201 { gasto }. 400: MONTO_INVALIDO, FECHA_INVALIDA, METODO_PAGO_INVALIDO,
      //   NOTA_INVALIDA, CATEGORIA_INEXISTENTE.
      crearGasto: async (datos) => {
        const { gasto } = await api('/gastos', { method: 'POST', body: datos });
        return normalizarGasto(gasto);
      },

      // GET /gastos?mes=YYYY-MM&categoria_id=N → [gasto], ordenados por fecha descendente.
      listarGastos: async ({ mes, categoria_id } = {}) => {
        const params = [];
        if (mes) params.push(`mes=${encodeURIComponent(mes)}`);
        if (categoria_id) params.push(`categoria_id=${encodeURIComponent(categoria_id)}`);
        const gastos = await api(`/gastos${params.length ? `?${params.join('&')}` : ''}`);
        return (gastos || []).map(normalizarGasto);
      },
    }),
    [api],
  );
}
