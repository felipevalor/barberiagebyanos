CREATE TABLE IF NOT EXISTS feriados_override (
  barbero_id TEXT    NOT NULL,
  fecha      TEXT    NOT NULL,
  trabaja    INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (barbero_id, fecha)
);
