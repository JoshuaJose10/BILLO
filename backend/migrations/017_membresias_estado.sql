-- Migración 015: Pausar o cancelar una suscripción sin borrarla (HU-75)
-- Agrega columna estado a membresias ('activa' | 'pausada', por defecto 'activa').
-- Las membresías existentes quedan con estado 'activa'.

ALTER TABLE membresias
  ADD COLUMN IF NOT EXISTS estado VARCHAR(20) NOT NULL DEFAULT 'activa'
  CHECK (estado IN ('activa', 'pausada'));
