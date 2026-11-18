-- 023_membresias_personas.sql
-- Costo compartido (HU-76): entre cuántas personas se divide una suscripción (Duo/Familiar).
-- Lo que el usuario paga es ROUND(costo / personas, 2); 1 = no compartida (comportamiento previo).

ALTER TABLE membresias
  ADD COLUMN IF NOT EXISTS personas INTEGER NOT NULL DEFAULT 1 CHECK (personas >= 1);
