import { useMemo } from 'react';

import { useApi } from '../context/AuthContext';
import { normalizarAlerta } from '../utils/avisos';
import { aNumero } from '../utils/formato';

// Valores que acepta el backend en `metodo_pago` (gastos.controller.js).
export const METODOS_PAGO = [
  { valor: 'efectivo', etiqueta: 'Efectivo', icono: 'cash' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta', icono: 'credit-card-outline' },
  { valor: 'transferencia', etiqueta: 'Transferencia', icono: 'bank-transfer' },
  { valor: 'otro', etiqueta: 'Otro', icono: 'dots-horizontal-circle-outline' },
];

export const METODO_PAGO_DEFECTO = 'efectivo';

// 'tarjeta' → 'Tarjeta'. Un valor desconocido se muestra tal cual.
export const etiquetaMetodoPago = (valor) =>
  METODOS_PAGO.find((m) => m.valor === valor)?.etiqueta || valor || '';

// Límite de `nota` que valida el backend (la columna admite 255, la API 200).
export const NOTA_MAX = 200;

const normalizarGasto = (gasto) => ({
  ...gasto,
  monto: aNumero(gasto.monto),
  monto_original:
    gasto.monto_original !== null && gasto.monto_original !== undefined
      ? aNumero(gasto.monto_original)
      : null,
  tipo_cambio:
    gasto.tipo_cambio !== null && gasto.tipo_cambio !== undefined
      ? aNumero(gasto.tipo_cambio)
      : null,
});

// Respuesta de POST y PUT: { gasto, alerta } con `alerta` null si no viene (sin presupuesto o en 'ok').
const normalizarGuardado = ({ gasto, alerta }) => ({
  gasto: normalizarGasto(gasto),
  alerta: normalizarAlerta(alerta),
});

// Servicio de gastos con el token de la sesión (un 401 cierra la sesión vía useApi):
//   const { listarCategorias, crearGasto, listarGastos, actualizarGasto, eliminarGasto } =
//     useGastosService();
export function useGastosService() {
  const api = useApi();

  return useMemo(
    () => ({
      // GET /categorias → [{ id, nombre }]. Las pantallas no la llaman: usan la caché de la
      // sesión (useCategorias, context/CategoriasContext.js), que la pide una vez.
      listarCategorias: () => api('/categorias'),

      // POST /gastos { monto, categoria_id, fecha: 'YYYY-MM-DD', metodo_pago, nota? }
      // → 201 { gasto, alerta? }. 400: MONTO_INVALIDO, FECHA_INVALIDA, METODO_PAGO_INVALIDO,
      //   NOTA_INVALIDA, CATEGORIA_INEXISTENTE.
      // Devuelve { gasto, alerta }; alerta = { categoria_id, porcentaje, estado } o null.
      crearGasto: async (datos) =>
        normalizarGuardado(await api('/gastos', { method: 'POST', body: datos })),

      // GET /gastos?mes=YYYY-MM&categoria_id=N → [gasto], ordenados por fecha descendente.
      listarGastos: async ({ mes, categoria_id } = {}) => {
        const params = [];
        if (mes) params.push(`mes=${encodeURIComponent(mes)}`);
        if (categoria_id) params.push(`categoria_id=${encodeURIComponent(categoria_id)}`);
        const gastos = await api(`/gastos${params.length ? `?${params.join('&')}` : ''}`);
        return (gastos || []).map(normalizarGasto);
      },

      // PUT /gastos/:id con el mismo body que POST (se reemplazan todos los campos)
      // → 200 { gasto, alerta? }. 400: los mismos que crearGasto. 404: GASTO_NO_ENCONTRADO.
      // Devuelve { gasto, alerta } como crearGasto.
      actualizarGasto: async (id, datos) =>
        normalizarGuardado(
          await api(`/gastos/${encodeURIComponent(id)}`, { method: 'PUT', body: datos }),
        ),

      // DELETE /gastos/:id → 200 { eliminado: true }. 404: GASTO_NO_ENCONTRADO.
      eliminarGasto: (id) => api(`/gastos/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    }),
    [api],
  );
}
