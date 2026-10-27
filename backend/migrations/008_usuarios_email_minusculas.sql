UPDATE usuarios
SET email = LOWER(TRIM(email))
WHERE email <> LOWER(TRIM(email));

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email_lower
ON usuarios (LOWER(email));

