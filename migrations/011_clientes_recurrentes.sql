CREATE TABLE IF NOT EXISTS clientes_recurrentes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  barbero_id      TEXT    NOT NULL,
  nombre          TEXT    NOT NULL,
  servicio        TEXT    NOT NULL,
  frecuencia_dias INTEGER NOT NULL DEFAULT 14,
  hora_preferida  TEXT,
  precio_especial TEXT,
  notas           TEXT,
  activo          INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT    NOT NULL
);
