-- Datos ampliados de usuarios.
-- Ejecutar después de 010_user_management_and_module_permissions.sql.

BEGIN;
SET LOCAL ROLE postgres;

ALTER TABLE laundry.user_profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_profiles_username
  ON laundry.user_profiles (LOWER(username)) WHERE username IS NOT NULL;

CREATE OR REPLACE FUNCTION laundry.handle_auth_user_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = laundry, public AS $$
BEGIN
  INSERT INTO laundry.user_profiles (
    user_id, full_name, email, first_name, last_name, username, phone, address, birth_date
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email), NEW.email,
    NEW.raw_user_meta_data ->> 'first_name', NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'username', NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'address', NULLIF(NEW.raw_user_meta_data ->> 'birth_date', '')::DATE
  ) ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, laundry.user_profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, laundry.user_profiles.last_name),
    phone = COALESCE(EXCLUDED.phone, laundry.user_profiles.phone),
    address = COALESCE(EXCLUDED.address, laundry.user_profiles.address),
    birth_date = COALESCE(EXCLUDED.birth_date, laundry.user_profiles.birth_date),
    updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMIT;
NOTIFY pgrst, 'reload schema';
