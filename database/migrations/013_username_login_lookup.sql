-- Consulta segura para inicio de sesión mediante nombre de usuario.
-- Ejecutar después de 012_default_usernames.sql.

BEGIN;
SET LOCAL ROLE postgres;

CREATE OR REPLACE FUNCTION public.login_username_lookup(p_username TEXT)
RETURNS TABLE (email TEXT, is_active BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = laundry, public AS $$
  SELECT p.email, p.is_active
  FROM laundry.user_profiles p
  WHERE LOWER(p.username) = LOWER(BTRIM(p_username))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.login_username_lookup(TEXT) TO anon, authenticated, service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
