-- 021_categorias_base_ampliadas.sql
-- Predefinidas de gasto nuevas (mismo patrón idempotente que 007) y activas para todos:
-- las cuentas nuevas las reciben porque el registro selecciona todas las predefinidas de gasto, y
-- a los usuarios existentes se les agregan aquí a usuario_categorias. No se quita ninguna de las
-- que el usuario ya tiene ni se tocan sus gastos.
INSERT INTO categorias (nombre, tipo, es_predefinida)
SELECT v.nombre, 'gasto', TRUE
FROM (VALUES
  ('Comida rápida'),
  ('Súper'),
  ('Café'),
  ('Hogar'),
  ('Ropa'),
  ('Educación'),
  ('Mascotas'),
  ('Cuidado personal')
) AS v(nombre)
WHERE NOT EXISTS (
  SELECT 1
  FROM categorias c
  WHERE c.nombre = v.nombre
    AND c.es_predefinida = TRUE
);

INSERT INTO usuario_categorias (usuario_id, categoria_id)
SELECT u.id, c.id
FROM usuarios u
CROSS JOIN categorias c
WHERE c.es_predefinida = TRUE
  AND c.usuario_id IS NULL
  AND c.tipo = 'gasto'
  AND c.nombre IN (
    'Comida rápida',
    'Súper',
    'Café',
    'Hogar',
    'Ropa',
    'Educación',
    'Mascotas',
    'Cuidado personal'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM usuario_categorias uc
    WHERE uc.usuario_id = u.id
      AND uc.categoria_id = c.id
  );
