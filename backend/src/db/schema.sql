-- Esquema de base de datos de BILLO
-- Resultado consolidado de las migraciones (001 a 019)
-- Fuente de verdad para cambios de esquema: backend/migrations/

CREATE TABLE IF NOT EXISTS schema_migrations (
  name       VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id                 SERIAL PRIMARY KEY,
  nombre             VARCHAR(255),
  email              VARCHAR(255) NOT NULL UNIQUE,
  password_hash      VARCHAR(255) NOT NULL,
  rol                VARCHAR(20) DEFAULT 'usuario' CHECK (rol IN ('usuario', 'admin')),
  expo_push_token    VARCHAR(255) NULL,
  reset_token_hash        VARCHAR(255) NULL,
  reset_token_expira      TIMESTAMPTZ NULL,
  categorias_configuradas BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email_lower
ON usuarios (LOWER(email));

-- Un token push pertenece a una sola cuenta (migración 013).
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_expo_push_token_unico
ON usuarios (expo_push_token)
WHERE expo_push_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS categorias (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(255),
  tipo           VARCHAR(20) CHECK (tipo IN ('gasto', 'membresia')),
  es_predefinida BOOLEAN DEFAULT FALSE,
  usuario_id     INTEGER NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  color          VARCHAR(7) NULL
);

CREATE TABLE IF NOT EXISTS usuario_categorias (
  usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, categoria_id)
);

ALTER TABLE categorias
  ADD COLUMN IF NOT EXISTS usuario_id INTEGER NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS color VARCHAR(7) NULL;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS categorias_configuradas BOOLEAN NOT NULL DEFAULT TRUE;

DROP INDEX IF EXISTS idx_categorias_nombre_tipo;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_predefinidas_nombre_tipo
  ON categorias (LOWER(nombre), tipo)
  WHERE usuario_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_usuario_nombre
  ON categorias (usuario_id, LOWER(nombre))
  WHERE usuario_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_categorias_usuario_id
  ON categorias (usuario_id)
  WHERE usuario_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS gastos (
  id             SERIAL PRIMARY KEY,
  usuario_id     INTEGER REFERENCES usuarios(id),
  categoria_id   INTEGER REFERENCES categorias(id),
  monto          NUMERIC(12, 2) CHECK (monto > 0),
  moneda         VARCHAR(3) NOT NULL DEFAULT 'MXN',
  monto_original NUMERIC(12, 2) NULL CHECK (monto_original > 0),
  tipo_cambio    NUMERIC(12, 6) NULL CHECK (tipo_cambio > 0),
  fecha          DATE,
  metodo_pago    VARCHAR(50),
  nota           VARCHAR(255),
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gastos_usuario_fecha
ON gastos (usuario_id, fecha);

CREATE TABLE IF NOT EXISTS presupuestos (
  id           SERIAL PRIMARY KEY,
  usuario_id   INTEGER NOT NULL REFERENCES usuarios(id),
  categoria_id INTEGER NOT NULL REFERENCES categorias(id),
  monto_limite NUMERIC(12, 2) NOT NULL CHECK (monto_limite > 0),
  mes          CHAR(7) NOT NULL, -- formato YYYY-MM
  UNIQUE (usuario_id, categoria_id, mes)
);

CREATE TABLE IF NOT EXISTS catalogo_servicios (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(255) NOT NULL UNIQUE,
  logo_url       VARCHAR(500),
  costo_sugerido NUMERIC(12, 2) NOT NULL CHECK (costo_sugerido > 0)
);

CREATE TABLE IF NOT EXISTS membresias (
  id                  SERIAL PRIMARY KEY,
  usuario_id          INTEGER NOT NULL REFERENCES usuarios(id),
  servicio_id         INTEGER NULL REFERENCES catalogo_servicios(id),
  nombre              VARCHAR(255) NOT NULL,
  costo               NUMERIC(12, 2) NOT NULL CHECK (costo > 0),
  moneda              VARCHAR(3) NOT NULL DEFAULT 'MXN',
  monto_original      NUMERIC(12, 2) NULL CHECK (monto_original > 0),
  tipo_cambio         NUMERIC(12, 6) NULL CHECK (tipo_cambio > 0),
  frecuencia          VARCHAR(20) NOT NULL CHECK (frecuencia IN ('mensual', 'anual')),
  fecha_cobro         DATE NOT NULL,
  estado              VARCHAR(20) NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'pausada')),
  ultima_notificacion DATE NULL
);

CREATE INDEX IF NOT EXISTS idx_membresias_usuario_fecha_cobro
ON membresias (usuario_id, fecha_cobro);

CREATE TABLE IF NOT EXISTS pagos_membresia (
  id           SERIAL PRIMARY KEY,
  membresia_id INTEGER NOT NULL REFERENCES membresias(id) ON DELETE CASCADE,
  fecha        DATE NOT NULL,
  monto        NUMERIC(12, 2) NOT NULL CHECK (monto > 0)
);

CREATE INDEX IF NOT EXISTS idx_pagos_membresia_membresia_fecha
ON pagos_membresia (membresia_id, fecha DESC, id DESC);

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

INSERT INTO usuario_categorias (usuario_id, categoria_id)
SELECT u.id, c.id
FROM usuarios u
CROSS JOIN categorias c
WHERE u.categorias_configuradas = TRUE
  AND c.es_predefinida = TRUE
  AND c.usuario_id IS NULL
  AND c.tipo = 'gasto'
  AND NOT EXISTS (
    SELECT 1
    FROM usuario_categorias uc
    WHERE uc.usuario_id = u.id
  )
ON CONFLICT (usuario_id, categoria_id) DO NOTHING;

