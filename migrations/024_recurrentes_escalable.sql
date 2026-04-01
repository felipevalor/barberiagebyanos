-- 1. Extender Reservas
ALTER TABLE reservas ADD COLUMN cliente_id INTEGER;
ALTER TABLE reservas ADD COLUMN fecha_iso TEXT;

-- 2. Extender Clientes Recurrentes
ALTER TABLE clientes_recurrentes ADD COLUMN cliente_id INTEGER;
ALTER TABLE clientes_recurrentes ADD COLUMN ultimo_turno_fecha_iso TEXT;

-- 3. Vincular Reservas Viejas (Best Effort)
UPDATE reservas 
SET cliente_id = (SELECT id FROM clientes WHERE clientes.telefono = reservas.telefono LIMIT 1)
WHERE telefono IS NOT NULL AND telefono != '';

UPDATE reservas 
SET cliente_id = (SELECT id FROM clientes WHERE clientes.nombre = reservas.nombre LIMIT 1)
WHERE cliente_id IS NULL;

-- 4. Vincular Recurrentes Viejos (Best Effort)
UPDATE clientes_recurrentes
SET cliente_id = (SELECT id FROM clientes WHERE LOWER(clientes.nombre) = LOWER(clientes_recurrentes.nombre) LIMIT 1)
WHERE cliente_id IS NULL;

-- 5. Crear Índices Optimizados
CREATE INDEX IF NOT EXISTS idx_reservas_cliente_id ON reservas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_recurrentes_cliente_id ON clientes_recurrentes(cliente_id);
