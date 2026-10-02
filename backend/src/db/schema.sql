-- Esquema de base de datos de BILLO
-- Generado a partir de docs/esquema-bd.dbml

CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(255),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol           VARCHAR(20) DEFAULT 'usuario' CHECK (rol IN ('usuario', 'admin')),
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categorias (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(255),
  tipo           VARCHAR(20) CHECK (tipo IN ('gasto', 'membresia')),
  es_predefinida BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS gastos (
  id           SERIAL PRIMARY KEY,
  usuario_id   INTEGER REFERENCES usuarios(id),
  categoria_id INTEGER REFERENCES categorias(id),
  monto        NUMERIC(12, 2),
  fecha        DATE,
  metodo_pago  VARCHAR(50),
  nota         VARCHAR(255),
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS presupuestos (
  id           SERIAL PRIMARY KEY,
  usuario_id   INTEGER REFERENCES usuarios(id),
  categoria_id INTEGER REFERENCES categorias(id),
  monto_limite NUMERIC(12, 2),
  mes          CHAR(7), -- formato YYYY-MM
  UNIQUE (usuario_id, categoria_id, mes)
);

CREATE TABLE IF NOT EXISTS catalogo_servicios (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(255),
  logo_url       VARCHAR(500),
  costo_sugerido NUMERIC(12, 2)
);

CREATE TABLE IF NOT EXISTS membresias (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER REFERENCES usuarios(id),
  servicio_id INTEGER NULL REFERENCES catalogo_servicios(id),
  nombre      VARCHAR(255),
  costo       NUMERIC(12, 2),
  frecuencia  VARCHAR(20),
  fecha_cobro DATE
);
