-- Agrega columna password_hash a barberos_config.
-- auth.js lo usa para autenticar desde D1 en lugar de env.ADMIN_PASSWORDS.
ALTER TABLE barberos_config ADD COLUMN password_hash TEXT;
