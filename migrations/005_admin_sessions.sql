CREATE TABLE IF NOT EXISTS admin_sessions (
  token      TEXT PRIMARY KEY,
  barbero_id TEXT NOT NULL,
  role       TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
