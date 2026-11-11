-- Migración 014 (Sprint 3): recuperación de contraseña por correo.
-- Guarda únicamente el hash SHA-256 del código/token de un solo uso y su fecha de caducidad (30 min).

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS reset_token_expira TIMESTAMP NULL;
