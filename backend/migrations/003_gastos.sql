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