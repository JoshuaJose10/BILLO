CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(255),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol           VARCHAR(20) DEFAULT 'usuario' CHECK (rol IN ('usuario', 'admin')),
  created_at    TIMESTAMP DEFAULT NOW()
);