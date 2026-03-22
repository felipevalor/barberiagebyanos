-- Índices para acelerar queries de stats por fecha y barbero+fecha
CREATE INDEX IF NOT EXISTS idx_reservas_fecha          ON reservas(fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_barbero_fecha  ON reservas(barbero, fecha);
