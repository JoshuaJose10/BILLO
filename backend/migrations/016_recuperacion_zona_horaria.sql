-- El vencimiento es un instante, no una hora local: usar TIMESTAMPTZ.
-- Las fechas anteriores no conservan su zona de origen. Invalidar esos códigos
-- para no extender su vigencia al convertirlos; no se modifican contraseñas.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'usuarios'
      AND column_name = 'reset_token_expira'
      AND data_type = 'timestamp without time zone'
  ) THEN
    UPDATE usuarios
    SET reset_token_hash = NULL, reset_token_expira = NULL
    WHERE reset_token_hash IS NOT NULL OR reset_token_expira IS NOT NULL;

    ALTER TABLE usuarios
      ALTER COLUMN reset_token_expira TYPE TIMESTAMPTZ
      USING NULL::TIMESTAMPTZ;
  END IF;
END;
$$;
