CREATE TABLE IF NOT EXISTS membresias (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER REFERENCES usuarios(id),
  servicio_id INTEGER NULL REFERENCES catalogo_servicios(id),
  nombre      VARCHAR(255),
  costo       NUMERIC(12, 2),
  frecuencia  VARCHAR(20),
  fecha_cobro DATE
);