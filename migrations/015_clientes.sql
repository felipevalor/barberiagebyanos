CREATE TABLE IF NOT EXISTS clientes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT NOT NULL,
  telefono   TEXT,
  notas      TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre   ON clientes(LOWER(nombre));
CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON clientes(telefono);
