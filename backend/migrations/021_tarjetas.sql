-- 021_tarjetas.sql
-- Tabla de tarjetas del usuario y relación opcional en gastos y membresías.

CREATE TABLE IF NOT EXISTS tarjetas (
  id         SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre     VARCHAR(100) NOT NULL,
  tipo       VARCHAR(20) NOT NULL CHECK (tipo IN ('credito', 'debito')),
  ultimos4   CHAR(4) NOT NULL CHECK (ultimos4 ~ '^\d{4}$'),
  dia_corte  INTEGER NULL CHECK (dia_corte IS NULL OR (dia_corte >= 1 AND dia_corte <= 31)),
  dia_pago   INTEGER NULL CHECK (dia_pago IS NULL OR (dia_pago >= 1 AND dia_pago <= 31)),
  creada_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarjetas_usuario_id
  ON tarjetas (usuario_id);

ALTER TABLE gastos
  ADD COLUMN IF NOT EXISTS tarjeta_id INTEGER NULL REFERENCES tarjetas(id) ON DELETE SET NULL;

ALTER TABLE membresias
  ADD COLUMN IF NOT EXISTS tarjeta_id INTEGER NULL REFERENCES tarjetas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gastos_tarjeta_id
  ON gastos (tarjeta_id)
  WHERE tarjeta_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_membresias_tarjeta_id
  ON membresias (tarjeta_id)
  WHERE tarjeta_id IS NOT NULL;
