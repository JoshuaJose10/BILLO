-- Migración 013 (HU-47, RF7): un token de Expo identifica un teléfono, así que pertenece a una
-- sola cuenta. Sin esto, al cambiar de usuario en el mismo teléfono ambas cuentas recibían los
-- avisos de cobro de la otra.

-- 1. Limpiar duplicados existentes. No hay registro de cuándo se guardó cada token (created_at es
--    la fecha de la cuenta), así que no se puede saber cuál es el dueño actual: se ponen en NULL
--    todos los repetidos. La app vuelve a registrar el token en la siguiente sesión.
UPDATE usuarios
SET expo_push_token = NULL
WHERE expo_push_token IN (
  SELECT expo_push_token
  FROM usuarios
  WHERE expo_push_token IS NOT NULL
  GROUP BY expo_push_token
  HAVING COUNT(*) > 1
);

-- 2. Impedir duplicados futuros. POST /notificaciones/token transfiere el token entre cuentas.
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_expo_push_token_unico
ON usuarios (expo_push_token)
WHERE expo_push_token IS NOT NULL;
