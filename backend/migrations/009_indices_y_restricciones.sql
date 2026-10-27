-- Migración 009: Índices y restricciones de integridad
-- Añade restricciones NOT NULL, CHECK, UNIQUE e índices en gastos, presupuestos, catálogo y membresías.

-- 1. Restricciones NOT NULL en presupuestos
ALTER TABLE presupuestos
  ALTER COLUMN usuario_id SET NOT NULL,
  ALTER COLUMN categoria_id SET NOT NULL,
  ALTER COLUMN monto_limite SET NOT NULL,
  ALTER COLUMN mes SET NOT NULL;

-- 2. Restricciones NOT NULL en catalogo_servicios
ALTER TABLE catalogo_servicios
  ALTER COLUMN nombre SET NOT NULL,
  ALTER COLUMN costo_sugerido SET NOT NULL;

-- 3. Restricciones NOT NULL en membresias
ALTER TABLE membresias
  ALTER COLUMN usuario_id SET NOT NULL,
  ALTER COLUMN nombre SET NOT NULL,
  ALTER COLUMN costo SET NOT NULL,
  ALTER COLUMN frecuencia SET NOT NULL,
  ALTER COLUMN fecha_cobro SET NOT NULL;

-- 4. Restricciones CHECK y UNIQUE (condicionales para idempotencia)
DO $$
BEGIN
  -- CHECK monto mayor que 0 en gastos
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_gastos_monto_positivo'
      AND conrelid = 'gastos'::regclass
  ) THEN
    ALTER TABLE gastos
    ADD CONSTRAINT check_gastos_monto_positivo CHECK (monto > 0);
  END IF;

  -- CHECK monto_limite mayor que 0 en presupuestos
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_presupuestos_monto_limite_positivo'
      AND conrelid = 'presupuestos'::regclass
  ) THEN
    ALTER TABLE presupuestos
    ADD CONSTRAINT check_presupuestos_monto_limite_positivo CHECK (monto_limite > 0);
  END IF;

  -- CHECK costo_sugerido mayor que 0 en catalogo_servicios
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_catalogo_servicios_costo_sugerido_positivo'
      AND conrelid = 'catalogo_servicios'::regclass
  ) THEN
    ALTER TABLE catalogo_servicios
    ADD CONSTRAINT check_catalogo_servicios_costo_sugerido_positivo CHECK (costo_sugerido > 0);
  END IF;

  -- UNIQUE en el nombre de catalogo_servicios
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_catalogo_servicios_nombre'
      AND conrelid = 'catalogo_servicios'::regclass
  ) THEN
    ALTER TABLE catalogo_servicios
    ADD CONSTRAINT uq_catalogo_servicios_nombre UNIQUE (nombre);
  END IF;

  -- CHECK costo mayor que 0 en membresias
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_membresias_costo_positivo'
      AND conrelid = 'membresias'::regclass
  ) THEN
    ALTER TABLE membresias
    ADD CONSTRAINT check_membresias_costo_positivo CHECK (costo > 0);
  END IF;

  -- CHECK frecuencia mensual o anual en membresias
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_membresias_frecuencia'
      AND conrelid = 'membresias'::regclass
  ) THEN
    ALTER TABLE membresias
    ADD CONSTRAINT check_membresias_frecuencia CHECK (frecuencia IN ('mensual', 'anual'));
  END IF;
END $$;

-- 5. Índices adicionales
CREATE INDEX IF NOT EXISTS idx_gastos_usuario_fecha
ON gastos (usuario_id, fecha);

CREATE INDEX IF NOT EXISTS idx_membresias_usuario_fecha_cobro
ON membresias (usuario_id, fecha_cobro);

