CREATE TABLE IF NOT EXISTS barberos_config (
  id          TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  tel         TEXT,
  calendar_id TEXT,
  activo      INTEGER NOT NULL DEFAULT 1,
  orden       INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);

INSERT OR IGNORE INTO barberos_config (id, nombre, tel, calendar_id, activo, orden, created_at) VALUES
  ('gebyano', 'Gebyano', '+5493416021009', NULL,                     1, 0, datetime('now')),
  ('lobo',    'Lobo',    '+5493412754502', NULL,                     1, 1, datetime('now')),
  ('felipe',  'Felipe',  '+5493416513207', 'felipevalor7@gmail.com', 1, 2, datetime('now')),
  ('ns',      'NS',      NULL,             NULL,                     0, 3, datetime('now')),
  ('bql',     'BQL',     NULL,             NULL,                     0, 4, datetime('now'));
