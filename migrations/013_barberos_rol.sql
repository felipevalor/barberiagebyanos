ALTER TABLE barberos_config ADD COLUMN rol TEXT NOT NULL DEFAULT 'barbero';
UPDATE barberos_config SET rol = 'owner' WHERE id IN ('gebyano', 'felipe');
