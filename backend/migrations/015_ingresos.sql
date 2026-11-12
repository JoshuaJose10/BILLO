-- Migración 015 (Sprint 3): tabla de ingresos del usuario (HU-82).
-- Incluye ON DELETE CASCADE desde usuarios para que al eliminar la cuenta se borren sus ingresos.

CREATE TABLE IF NOT EXISTS ingresos (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  monto       NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
  fecha       DATE NOT NULL,
  descripcion VARCHAR(255) NULL,
  fuente      VARCHAR(100) NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingresos_usuario_fecha
ON ingresos (usuario_id, fecha);
