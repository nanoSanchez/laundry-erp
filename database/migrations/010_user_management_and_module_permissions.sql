-- Usuarios, perfiles y permisos por módulo.
-- Ejecutar después de 008_branch_access_and_cash_controls.sql.

BEGIN;
SET LOCAL ROLE postgres;

CREATE TABLE IF NOT EXISTS laundry.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS laundry.modules (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS laundry.user_module_access (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL REFERENCES laundry.modules(code) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, module_code)
);

INSERT INTO laundry.modules (code, name, description, sort_order) VALUES
  ('dashboard', 'Dashboard', 'Indicadores diarios de la sucursal.', 10),
  ('customers', 'Clientes', 'Registro y consulta de clientes.', 20),
  ('reception', 'Recepción', 'Recepción de prendas y creación de órdenes.', 30),
  ('orders', 'Órdenes', 'Seguimiento, pagos y entregas.', 40),
  ('cash', 'Caja', 'Apertura, movimientos y cierre diario.', 50),
  ('reports', 'Reportes', 'Reportes operativos y de caja.', 60),
  ('garments', 'Prendas', 'Catálogo de prendas.', 70),
  ('services', 'Servicios', 'Catálogo de servicios.', 80),
  ('branches', 'Sucursales', 'Configuración de sucursales y logos.', 90),
  ('users', 'Usuarios', 'Usuarios, sucursales y permisos.', 100)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

CREATE OR REPLACE FUNCTION laundry.handle_auth_user_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = laundry, public AS $$
BEGIN
  INSERT INTO laundry.user_profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email), NEW.email)
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_user_profile ON auth.users;
CREATE TRIGGER trg_auth_user_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION laundry.handle_auth_user_profile();

INSERT INTO laundry.user_profiles (user_id, full_name, email)
SELECT id, COALESCE(raw_user_meta_data ->> 'full_name', email), email FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;

CREATE OR REPLACE FUNCTION public.my_module_permissions()
RETURNS TABLE (module_code TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = laundry, public AS $$
  SELECT code FROM laundry.modules WHERE laundry.is_general_admin()
  UNION
  SELECT module_code FROM laundry.user_module_access WHERE user_id = auth.uid();
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON laundry.user_profiles, laundry.modules, laundry.user_module_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_module_permissions() TO authenticated;

ALTER TABLE laundry.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry.user_module_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "General admins manage user profiles" ON laundry.user_profiles;
CREATE POLICY "General admins manage user profiles" ON laundry.user_profiles FOR ALL TO authenticated USING (laundry.is_general_admin()) WITH CHECK (laundry.is_general_admin());
DROP POLICY IF EXISTS "General admins manage modules" ON laundry.modules;
CREATE POLICY "General admins manage modules" ON laundry.modules FOR ALL TO authenticated USING (laundry.is_general_admin()) WITH CHECK (laundry.is_general_admin());
DROP POLICY IF EXISTS "General admins manage user module access" ON laundry.user_module_access;
CREATE POLICY "General admins manage user module access" ON laundry.user_module_access FOR ALL TO authenticated USING (laundry.is_general_admin()) WITH CHECK (laundry.is_general_admin());

COMMIT;

NOTIFY pgrst, 'reload schema';
