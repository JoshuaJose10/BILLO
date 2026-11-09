-- Migración 012: Ampliación del catálogo con planes y precios oficiales para México (RF5, RF9)
-- Fecha de verificación de precios y fuentes: 2026-11-08
-- Todos los costos están en pesos mexicanos (MXN).
-- Esta migración no modifica el esquema y es idempotente gracias a ON CONFLICT (nombre) DO NOTHING.
-- Los servicios existentes previos (010) se conservan intactos.

INSERT INTO catalogo_servicios (nombre, logo_url, costo_sugerido)
VALUES
  -- ── Spotify (Planes México) ──
  -- Fuente: https://www.spotify.com/mx/premium/ (Revisado: 2026-11-08)
  ('Spotify Individual', 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg', 139.00),
  ('Spotify Duo', 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg', 189.00),
  ('Spotify Familiar', 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg', 239.00),
  ('Spotify Estudiantes', 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg', 74.00),

  -- ── Netflix (Planes México) ──
  -- Fuente: https://help.netflix.com/es/node/24926 (Revisado: 2026-11-08)
  ('Netflix Estándar con anuncios', 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Logonetflix.png', 139.00),
  ('Netflix Estándar', 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Logonetflix.png', 269.00),
  ('Netflix Premium', 'https://upload.wikimedia.org/wikipedia/commons/7/7a/Logonetflix.png', 369.00),

  -- ── Disney+ (Planes México) ──
  -- Fuente: https://www.disneyplus.com/es-mx (Revisado: 2026-11-08)
  ('Disney+ Estándar', 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg', 249.00),
  ('Disney+ Premium', 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg', 339.00),

  -- ── Max (antes HBO Max) (Planes México) ──
  -- Fuente: https://www.max.com/mx/es (Revisado: 2026-11-08)
  ('Max Básico con anuncios', 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Max_logo.svg', 149.00),
  ('Max Estándar', 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Max_logo.svg', 239.00),
  ('Max Platino', 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Max_logo.svg', 299.00),

  -- ── YouTube Premium (Planes México) ──
  -- Fuente: https://www.youtube.com/premium (Revisado: 2026-11-08)
  ('YouTube Premium Individual', 'https://upload.wikimedia.org/wikipedia/commons/d/dd/YouTube_Premium_logo.svg', 139.00),
  ('YouTube Premium Familiar', 'https://upload.wikimedia.org/wikipedia/commons/d/dd/YouTube_Premium_logo.svg', 279.00),
  ('YouTube Premium Estudiantes', 'https://upload.wikimedia.org/wikipedia/commons/d/dd/YouTube_Premium_logo.svg', 79.00),

  -- ── Apple (TV, Music, One) (Planes México) ──
  -- Fuente: https://www.apple.com/mx/apple-tv-plus/ y https://www.apple.com/mx/apple-one/ (Revisado: 2026-11-08)
  ('Apple TV+', 'https://upload.wikimedia.org/wikipedia/commons/2/28/Apple_TV_Plus_Logo.svg', 199.00),
  ('Apple One Individual', 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', 279.00),
  ('Apple One Familiar', 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', 369.00),
  ('Apple Music Individual', 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Apple_Music_logo.svg', 115.00),
  ('Apple Music Familiar', 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Apple_Music_logo.svg', 179.00),

  -- ── Paramount+ (Planes México) ──
  -- Fuente: https://www.paramountplus.com/mx/ (Revisado: 2026-11-08)
  ('Paramount+ Básico', 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Paramount_Plus.svg', 109.00),
  ('Paramount+ Estándar', 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Paramount_Plus.svg', 149.00),
  ('Paramount+ Premium', 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Paramount_Plus.svg', 199.00),

  -- ── Crunchyroll (Planes México) ──
  -- Fuente: https://www.crunchyroll.com/es/welcome (Revisado: 2026-11-08)
  ('Crunchyroll Fan', 'https://upload.wikimedia.org/wikipedia/commons/0/08/Crunchyroll_Logo.png', 129.00),
  ('Crunchyroll Mega Fan', 'https://upload.wikimedia.org/wikipedia/commons/0/08/Crunchyroll_Logo.png', 159.00),

  -- ── Amazon Prime México ──
  -- Fuente: https://www.amazon.com.mx/prime (Revisado: 2026-11-08)
  ('Amazon Prime', 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png', 99.00),

  -- ── Duolingo (Planes México) ──
  -- Fuente: https://www.duolingo.com/super (Revisado: 2026-11-08)
  ('Duolingo Super Mensual', 'https://upload.wikimedia.org/wikipedia/commons/0/04/Duolingo_logo_2019.svg', 199.00),
  ('Duolingo Super Familiar', 'https://upload.wikimedia.org/wikipedia/commons/0/04/Duolingo_logo_2019.svg', 299.00),

  -- ── Microsoft 365 (Planes México) ──
  -- Fuente: https://www.microsoft.com/es-mx/microsoft-365/buy/microsoft-365 (Revisado: 2026-11-08)
  ('Microsoft 365 Personal', 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Microsoft_365_%282022%29.svg', 139.00),
  ('Microsoft 365 Familia', 'https://upload.wikimedia.org/wikipedia/commons/0/0e/Microsoft_365_%282022%29.svg', 189.00),

  -- ── Xbox Game Pass (Planes México) ──
  -- Fuente: https://www.xbox.com/es-MX/xbox-game-pass (Revisado: 2026-11-08)
  ('Xbox Game Pass Core', 'https://upload.wikimedia.org/wikipedia/commons/0/01/Xbox_Game_Pass_logo.svg', 169.00),
  ('Xbox Game Pass Ultimate', 'https://upload.wikimedia.org/wikipedia/commons/0/01/Xbox_Game_Pass_logo.svg', 299.00),
  ('PC Game Pass', 'https://upload.wikimedia.org/wikipedia/commons/0/01/Xbox_Game_Pass_logo.svg', 179.00),

  -- ── PlayStation Plus (Planes México) ──
  -- Fuente: https://www.playstation.com/es-mx/ps-plus/ (Revisado: 2026-11-08)
  ('PlayStation Plus Essential', 'https://upload.wikimedia.org/wikipedia/commons/0/00/PlayStation_logo.svg', 164.00),
  ('PlayStation Plus Extra', 'https://upload.wikimedia.org/wikipedia/commons/0/00/PlayStation_logo.svg', 249.00),
  ('PlayStation Plus Deluxe', 'https://upload.wikimedia.org/wikipedia/commons/0/00/PlayStation_logo.svg', 289.00),

  -- ── ViX Premium México ──
  -- Fuente: https://vix.com/es-mx/planes (Revisado: 2026-11-08)
  ('ViX Premium', 'https://upload.wikimedia.org/wikipedia/commons/7/74/Vix_Logo.svg', 119.00),

  -- ── MUBI México ──
  -- Fuente: https://mubi.com/es/mx (Revisado: 2026-11-08)
  ('MUBI', 'https://upload.wikimedia.org/wikipedia/commons/9/91/MUBI_Logo_2020.svg', 179.00)
ON CONFLICT (nombre) DO NOTHING;
