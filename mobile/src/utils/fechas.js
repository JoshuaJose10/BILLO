// Fechas del gasto en hora LOCAL del teléfono.
// No usar toISOString(): convierte a UTC y en México, después de las 6 pm,
// devolvería el día siguiente.

const dosDigitos = (n) => String(n).padStart(2, '0');

// Date → "YYYY-MM-DD" (formato que espera POST /gastos).
export function fechaLocalISO(date = new Date()) {
  return `${date.getFullYear()}-${dosDigitos(date.getMonth() + 1)}-${dosDigitos(date.getDate())}`;
}

// Mes actual → "YYYY-MM" (filtro `mes` de GET /gastos).
export function mesActual(date = new Date()) {
  return `${date.getFullYear()}-${dosDigitos(date.getMonth() + 1)}`;
}

// "YYYY-MM-DD" → Date a medianoche local. new Date("YYYY-MM-DD") la interpreta en UTC.
export function parsearFechaLocal(fechaStr) {
  const [anio, mes, dia] = String(fechaStr).split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

// Mismo día de ayer en hora local.
export function ayer(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
}
