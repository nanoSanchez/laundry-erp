-- Datos comerciales y acceso para la gestión de sucursales.
-- Ejecutar después de 005_branch_logos.sql.

BEGIN;

ALTER TABLE laundry.branches
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS nit VARCHAR(30);

COMMENT ON COLUMN laundry.branches.company_name IS
  'Razón social o nombre comercial de la empresa a la que pertenece la sucursal.';

COMMENT ON COLUMN laundry.branches.nit IS
  'NIT de la empresa para documentos y comprobantes.';

GRANT USAGE ON SCHEMA laundry TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE laundry.branches TO authenticated;

ALTER TABLE laundry.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users manage branches" ON laundry.branches;
CREATE POLICY "Authenticated users manage branches"
ON laundry.branches
FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

COMMIT;
