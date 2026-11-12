-- Esquema de base de datos de BILLO
-- Resultado consolidado de las migraciones (001 a 016)
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
  reset_token_hash   VARCHAR(255) NULL,
  reset_token_expira TIMESTAMPTZ NULL,
  created_at         TIMESTAMP DEFAULT NOW()
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
  es_predefinida BOOLEAN DEFAULT FALSE
);

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
  frecuencia          VARCHAR(20) NOT NULL CHECK (frecuencia IN ('mensual', 'anual')),
  fecha_cobro         DATE NOT NULL,
  estado              VARCHAR(20) NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'pausada')),
  ultima_notificacion DATE NULL
);

CREATE INDEX IF NOT EXISTS idx_membresias_usuario_fecha_cobro
ON membresias (usuario_id, fecha_cobro);

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

