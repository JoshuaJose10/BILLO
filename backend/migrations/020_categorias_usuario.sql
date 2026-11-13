-- 020_categorias_usuario.sql
-- Categorías por usuario: selección de predefinidas y categorías propias.

ALTER TABLE categorias
  ADD COLUMN IF NOT EXISTS usuario_id INTEGER NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS color VARCHAR(7) NULL;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS categorias_configuradas BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS usuario_categorias (
  usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, categoria_id)
);

-- El índice único original idx_categorias_nombre_tipo aplicaba a todas las filas.
-- Ahora las predefinidas (usuario_id IS NULL) son únicas por (LOWER(nombre), tipo),
-- y las propias (usuario_id IS NOT NULL) son únicas por (usuario_id, LOWER(nombre)).
DROP INDEX IF EXISTS idx_categorias_nombre_tipo;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_predefinidas_nombre_tipo
  ON categorias (LOWER(nombre), tipo)
  WHERE usuario_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_usuario_nombre
  ON categorias (usuario_id, LOWER(nombre))
  WHERE usuario_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_categorias_usuario_id
  ON categorias (usuario_id)
  WHERE usuario_id IS NOT NULL;

-- Backfill: para cada usuario existente (categorias_configuradas = TRUE y sin filas aún en usuario_categorias),
-- insertar todas las categorías predefinidas de tipo 'gasto'.
INSERT INTO usuario_categorias (usuario_id, categoria_id)
SELECT u.id, c.id
FROM usuarios u
CROSS JOIN categorias c
WHERE u.categorias_configuradas = TRUE
  AND c.es_predefinida = TRUE
  AND c.usuario_id IS NULL
  AND c.tipo = 'gasto'
  AND NOT EXISTS (
    SELECT 1
    FROM usuario_categorias uc
    WHERE uc.usuario_id = u.id
  )
ON CONFLICT (usuario_id, categoria_id) DO NOTHING;
