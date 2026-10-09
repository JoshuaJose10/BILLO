CREATE TABLE IF NOT EXISTS presupuestos (
  id           SERIAL PRIMARY KEY,
  usuario_id   INTEGER REFERENCES usuarios(id),
  categoria_id INTEGER REFERENCES categorias(id),
  monto_limite NUMERIC(12, 2),
  mes          CHAR(7), -- formato YYYY-MM
  UNIQUE (usuario_id, categoria_id, mes)
);