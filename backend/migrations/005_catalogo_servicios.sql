CREATE TABLE IF NOT EXISTS catalogo_servicios (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(255),
  logo_url       VARCHAR(500),
  costo_sugerido NUMERIC(12, 2)
);