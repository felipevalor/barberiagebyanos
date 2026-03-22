-- Reemplaza nombre como PK por id INTEGER para soportar renombrar entradas
CREATE TABLE catalogo_v2 (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT    NOT NULL UNIQUE,
  incluye    TEXT    NOT NULL DEFAULT '',
  precio_ars INTEGER,
  activo     INTEGER NOT NULL DEFAULT 1,
  orden      INTEGER NOT NULL DEFAULT 0
);

INSERT INTO catalogo_v2 (nombre, incluye, precio_ars, activo, orden)
SELECT nombre, incluye, precio_ars, activo, orden FROM catalogo;

DROP TABLE catalogo;
ALTER TABLE catalogo_v2 RENAME TO catalogo;
