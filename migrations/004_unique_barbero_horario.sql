-- Prevenir double booking: un barbero no puede tener dos reservas en el mismo horario
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservas_unique_turno
ON reservas (barbero, mensaje)
WHERE mensaje != '';
