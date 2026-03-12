-- Agregar columna barbero a la tabla existente
ALTER TABLE reservas ADD COLUMN barbero TEXT;

-- Recrear índice útil
CREATE INDEX IF NOT EXISTS idx_reservas_barbero ON reservas(barbero);
