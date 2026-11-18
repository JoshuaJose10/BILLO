-- 022_ingresos_recurrentes.sql
-- Ingresos recurrentes: frecuencia (semanal|quincenal|mensual), proximo_ingreso,
-- marca recurrente e ingreso_origen_id para evitar duplicados por fecha y conservar historial al cancelar.

ALTER TABLE ingresos
  ADD COLUMN IF NOT EXISTS frecuencia VARCHAR(20) NULL
    CHECK (frecuencia IS NULL OR frecuencia IN ('semanal', 'quincenal', 'mensual')),
  ADD COLUMN IF NOT EXISTS proximo_ingreso DATE NULL,
  ADD COLUMN IF NOT EXISTS recurrente BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ingreso_origen_id INTEGER NULL REFERENCES ingresos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ingresos_proximo_ingreso
  ON ingresos (proximo_ingreso)
  WHERE frecuencia IS NOT NULL AND proximo_ingreso IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ingresos_origen_fecha_unico
  ON ingresos (ingreso_origen_id, fecha)
  WHERE ingreso_origen_id IS NOT NULL;
