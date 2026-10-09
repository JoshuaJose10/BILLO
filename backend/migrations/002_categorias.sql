CREATE TABLE IF NOT EXISTS categorias (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(255),
  tipo           VARCHAR(20) CHECK (tipo IN ('gasto', 'membresia')),
  es_predefinida BOOLEAN DEFAULT FALSE
);