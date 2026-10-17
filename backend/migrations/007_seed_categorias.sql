INSERT INTO categorias (nombre, tipo, es_predefinida)
SELECT v.nombre, 'gasto', TRUE
FROM (VALUES
  ('Comida'),
  ('Transporte'),
  ('Entretenimiento'),
  ('Servicios'),
  ('Salud'),
  ('Otros')
) AS v(nombre)
WHERE NOT EXISTS (
  SELECT 1
  FROM categorias c
  WHERE c.nombre = v.nombre
    AND c.es_predefinida = TRUE
);