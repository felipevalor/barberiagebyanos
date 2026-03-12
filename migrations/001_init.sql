CREATE TABLE IF NOT EXISTS reservas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT    NOT NULL,
  telefono   TEXT    NOT NULL,
  servicio   TEXT    NOT NULL,
  mensaje    TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reservas_telefono ON reservas(telefono);
CREATE INDEX IF NOT EXISTS idx_reservas_created_at ON reservas(created_at);
