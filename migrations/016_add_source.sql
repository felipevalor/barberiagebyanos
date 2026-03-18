-- Indica el origen de cada reserva:
-- 'web'    → reserva pública desde el frontend
-- 'admin'  → turno creado manualmente desde el panel
-- 'import' → datos históricos importados por el owner
ALTER TABLE reservas ADD COLUMN source TEXT NOT NULL DEFAULT 'web';
