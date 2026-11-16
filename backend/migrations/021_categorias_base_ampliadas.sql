-- 021_categorias_base_ampliadas.sql
-- Predefinidas de gasto nuevas (mismo patrón idempotente que 007).
-- No se insertan en usuario_categorias: los usuarios existentes las ven inactivas (aparecen en
-- GET /categorias/predefinidas con seleccionada = false y las activan con PUT /categorias/seleccion)
-- y las cuentas nuevas las reciben activas porque el registro selecciona todas las predefinidas de
-- gasto. Los gastos existentes no se tocan.
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
