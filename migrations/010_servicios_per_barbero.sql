-- Recrear servicios_config con clave compuesta (barbero_id, nombre)
DROP TABLE IF EXISTS servicios_config;
CREATE TABLE servicios_config (
  barbero_id   TEXT    NOT NULL,
  nombre       TEXT    NOT NULL,
  duracion_min INTEGER NOT NULL,
  PRIMARY KEY (barbero_id, nombre)
);
