-- Asigna nombres de usuario iniciales a las cuentas existentes.
-- Ejecutar después de 011_extended_user_profiles.sql.

BEGIN;
SET LOCAL ROLE postgres;

UPDATE laundry.user_profiles
SET username = LOWER(REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-zA-Z0-9._-]', '', 'g'))
WHERE username IS NULL OR BTRIM(username) = '';

COMMIT;
NOTIFY pgrst, 'reload schema';
