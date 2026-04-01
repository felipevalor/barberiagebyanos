CREATE TABLE IF NOT EXISTS api_rate_limits (
  ip       TEXT    NOT NULL,
  endpoint TEXT    NOT NULL,
  count    INTEGER NOT NULL DEFAULT 1,
  reset_at TEXT    NOT NULL,
  PRIMARY KEY (ip, endpoint)
);
