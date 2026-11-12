-- Migración 015: moneda original y tipo de cambio para membresías/suscripciones (RF11 / HU-77).
-- Por defecto 'MXN'. monto_original y tipo_cambio son opcionales para divisas extranjeras.

ALTER TABLE membresias
  ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS monto_original NUMERIC(12, 2) NULL CHECK (monto_original > 0),
  ADD COLUMN IF NOT EXISTS tipo_cambio NUMERIC(12, 6) NULL CHECK (tipo_cambio > 0);
