-- Recuperación de acceso cuando se eliminaron todas las sucursales.
-- Ejecutar en Supabase SQL Editor. Reemplazar correo, nombre, NIT y datos.

BEGIN;
SET LOCAL ROLE postgres;

DO $$
DECLARE
  admin_user_id UUID;
  recovered_branch_id UUID;
BEGIN
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@laundry.com'; -- REEMPLAZAR POR EL CORREO DEL ADMINISTRADOR

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el usuario indicado en Authentication > Users.';
  END IF;

  INSERT INTO laundry.branches (
    code, name, company_name, nit, address, phone, email, currency_code, is_active
  ) VALUES (
    'CENT',                 -- Código único de 2 a 5 letras
    'Sucursal Central',     -- Nombre de la sucursal
    'LaundryERP',           -- Nombre o razón social de la empresa
    '0000000000',           -- NIT
    NULL, NULL, NULL, 'BOB', TRUE
  )
  ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      company_name = EXCLUDED.company_name,
      nit = EXCLUDED.nit,
      is_active = TRUE,
      deleted_at = NULL
  RETURNING id INTO recovered_branch_id;

  INSERT INTO laundry.user_permissions (user_id, is_general_admin)
  VALUES (admin_user_id, TRUE)
  ON CONFLICT (user_id) DO UPDATE SET is_general_admin = TRUE;

  INSERT INTO laundry.user_branch_access (user_id, branch_id)
  VALUES (admin_user_id, recovered_branch_id)
  ON CONFLICT DO NOTHING;
END;
$$;

COMMIT;
