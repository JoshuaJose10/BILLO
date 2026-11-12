// Tarjeta «Esta semana cobran» de Inicio (HU-73, RF7). Sin imports de React Native para poder
// probarla con node --test.

// Ventana de la tarjeta: hoy y los 7 días siguientes (dias_para_cobro de 0 a 7).
export const DIAS_SEMANA_COBROS = 7;

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// Nombre del día en que cobra: "hoy", "mañana" o el día de la semana.
export function diaDeCobro(dias, hoy = new Date()) {
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'mañana';
  const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias);
  return DIAS[fecha.getDay()];
}

// membresías (GET /membresias, ya normalizadas) → { cobros, total }.
// - cobros: las que cobran en los próximos 7 días, de la más próxima a la más lejana.
// - total: suma de sus costos. Sin cobros: { cobros: [], total: 0 } (la tarjeta no se muestra).
// Las membresías sin dias_para_cobro numérico o ya vencidas (negativo) se ignoran.
export function cobrosDeLaSemana(membresias, hoy = new Date()) {
  const cobros = (Array.isArray(membresias) ? membresias : [])
    .filter(
      (m) =>
        m &&
        typeof m.dias_para_cobro === 'number' &&
        m.dias_para_cobro >= 0 &&
        m.dias_para_cobro <= DIAS_SEMANA_COBROS,
    )
    .map((m) => ({
      id: m.id,
      nombre: m.nombre,
      costo: Number(m.costo) || 0,
      dias: m.dias_para_cobro,
      dia: diaDeCobro(m.dias_para_cobro, hoy),
    }))
    .sort((a, b) => a.dias - b.dias);
  const total = Math.round(cobros.reduce((suma, c) => suma + c.costo, 0) * 100) / 100;
  return { cobros, total };
}

// Evita repetir en «Esta semana cobran» lo que ya muestra «Próximo cobro» (HU-72). `cobro` sale de
// proximoCobro ({ dias, ... }): si cae dentro de la semana, se quitan los cobros de ese día (la
// suscripción mostrada y las que cuenta su "+N más"), se recalcula el total y `tambien` es true
// (la tarjeta se titula «También esta semana»). Si no cae en la semana, la semana queda igual.
export function semanaSinProximoCobro(semana, cobro) {
  const base = { cobros: semana?.cobros ?? [], total: semana?.total ?? 0, tambien: false };
  if (!cobro || cobro.dias > DIAS_SEMANA_COBROS) return base;
  const cobros = base.cobros.filter((c) => c.dias !== cobro.dias);
  const total = Math.round(cobros.reduce((suma, c) => suma + c.costo, 0) * 100) / 100;
  return { cobros, total, tambien: true };
}
