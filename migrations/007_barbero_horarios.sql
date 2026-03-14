CREATE TABLE IF NOT EXISTS barbero_horarios (
  barbero_id   TEXT    NOT NULL,
  dow          INTEGER NOT NULL,
  activo       INTEGER NOT NULL DEFAULT 1,
  hora_inicio  INTEGER NOT NULL DEFAULT 9,
  hora_fin     INTEGER NOT NULL DEFAULT 20,
  PRIMARY KEY (barbero_id, dow)
);
