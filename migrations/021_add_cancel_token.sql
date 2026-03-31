-- Agrega cancel_token a reservas para autenticar cancelaciones/modificaciones.
-- Reservas previas quedan con cancel_token NULL → fallback a verificación por teléfono.
ALTER TABLE reservas ADD COLUMN cancel_token TEXT;

CREATE INDEX IF NOT EXISTS idx_reservas_cancel_token ON reservas (cancel_token);
