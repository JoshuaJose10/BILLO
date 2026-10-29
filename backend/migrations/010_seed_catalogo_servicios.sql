-- Migración 010: Datos iniciales del catálogo de servicios
-- Inserta al menos 12 servicios conocidos con logo_url y costo_sugerido.
-- Es idempotente gracias a la restricción UNIQUE en nombre (ON CONFLICT DO NOTHING).

INSERT INTO catalogo_servicios (nombre, logo_url, costo_sugerido)
VALUES
  ('Apple Music', 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Apple_Music_logo.svg', 115.00),
  ('Canva', 'https://upload.wikimedia.org/wikipedia/commons/0/08/Canva_icon_2021.svg', 149.00),
  ('ChatGPT', 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg', 399.00),
  ('Disney+', 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg', 219.00),
  ('Google One', 'https://upload.wikimedia.org/wikipedia/commons/2/23/Google_One_logo.svg', 34.00),
  ('HBO Max', 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg', 179.00),
  ('iCloud', 'https://upload.wikimedia.org/wikipedia/commons/1/1c/ICloud_logo.svg', 17.00),
  ('Netflix', 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Logonetflix.png', 199.00),
  ('Prime Video', 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png', 99.00),
  ('Spotify', 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg', 129.00),
  ('Xbox Game Pass', 'https://upload.wikimedia.org/wikipedia/commons/0/01/Xbox_Game_Pass_logo.svg', 249.00),
  ('YouTube Premium', 'https://upload.wikimedia.org/wikipedia/commons/d/dd/YouTube_Premium_logo.svg', 139.00)
ON CONFLICT (nombre) DO NOTHING;
