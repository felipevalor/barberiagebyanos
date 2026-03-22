-- Catálogo global de servicios para la landing (Qué hacemos)
CREATE TABLE IF NOT EXISTS catalogo (
  nombre     TEXT    PRIMARY KEY,
  incluye    TEXT    NOT NULL DEFAULT '',
  precio_ars INTEGER,
  activo     INTEGER NOT NULL DEFAULT 1,
  orden      INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO catalogo (nombre, incluye, precio_ars, orden) VALUES
  ('Corte',           'Tijera o máquina · Perfilado de cejas · Café o bebida', 20000, 0),
  ('Corte + Barba',   'El combo completo · Perfilado de cejas · Café o bebida', 25000, 1),
  ('Barba',           'Perfilado y definición · Café o bebida', 8000, 2),
  ('Afeitado',        'Navaja · Toalla caliente · Café o bebida', 6000, 3),
  ('Niños (10-13 años)', 'Perfilado de cejas · Café o bebida', 17000, 4),
  ('Niños (0-9 años)',   'Perfilado de cejas · Café o bebida', 15000, 5);

-- Promos del local
CREATE TABLE IF NOT EXISTS promos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT    NOT NULL,
  precio_ars INTEGER,
  unidad     TEXT,
  nota       TEXT,
  badge      TEXT,
  activo     INTEGER NOT NULL DEFAULT 1,
  orden      INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO promos (nombre, precio_ars, unidad, nota, badge, orden) VALUES
  ('2 o 3 cortes',    18000, 'c/u', 'Se abona al primer corte · No incluye barba', NULL,      0),
  ('4 cortes',        68000, NULL,  'Se abona al primer corte · No incluye barba', NULL,      1),
  ('Fuerzas Gebyanas',15000, NULL,  'Policía · Gendarmería · Prefectura · Perfilado + bebida incluidos', 'Especial', 2);
