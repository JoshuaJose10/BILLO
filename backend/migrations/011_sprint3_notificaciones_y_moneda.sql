-- Sprint 3 (HU-41): campos opcionales para RF7 (avisos de cobro) y RF11 (cambio de moneda).
-- Propuesta C-01, C-02 y X-01 de docs/api-contrato.md. No se aplica hasta que Oscar la apruebe en el PR.
-- Todos los campos son nuevos, opcionales y con valor por defecto: no rompen datos ni rutas existentes.

-- C-01: token de Expo del teléfono para enviar el aviso de cobro (RF7).
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS expo_push_token VARCHAR(255) NULL;

-- C-02: último día en que se avisó el cobro, para no repetir el aviso (RF7).
ALTER TABLE membresias
  ADD COLUMN IF NOT EXISTS ultima_notificacion DATE NULL;

-- X-01: moneda original del gasto (RF11). `monto` sigue siendo el valor en MXN.
ALTER TABLE gastos
  ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS monto_original NUMERIC(12, 2) NULL CHECK (monto_original > 0),
  ADD COLUMN IF NOT EXISTS tipo_cambio NUMERIC(12, 6) NULL CHECK (tipo_cambio > 0);
