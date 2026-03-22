-- Tabla para rate limiting de intentos de login fallidos por IP
CREATE TABLE IF NOT EXISTS login_attempts (
  ip        TEXT NOT NULL PRIMARY KEY,
  count     INTEGER NOT NULL DEFAULT 1,
  reset_at  TEXT NOT NULL  -- ISO timestamp: cuando resetear el contador
);
