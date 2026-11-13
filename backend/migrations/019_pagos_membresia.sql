-- Migración 019: Historial de pagos de una suscripción (pagos_membresia).
-- Registra fecha y monto cada vez que se marca una membresía como pagada (HU-66),
-- con borrado en cascada al eliminar la membresía o la cuenta del usuario.

CREATE TABLE IF NOT EXISTS pagos_membresia (
  id           SERIAL PRIMARY KEY,
  membresia_id INTEGER NOT NULL REFERENCES membresias(id) ON DELETE CASCADE,
  fecha        DATE NOT NULL,
  monto        NUMERIC(12, 2) NOT NULL CHECK (monto > 0)
);

CREATE INDEX IF NOT EXISTS idx_pagos_membresia_membresia_fecha
ON pagos_membresia (membresia_id, fecha DESC, id DESC);
