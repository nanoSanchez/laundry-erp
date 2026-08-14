-- Sucursales y sus logos para la aplicación web.
-- Ejecutar después de 003_tables_configuration.sql.

BEGIN;

ALTER TABLE laundry.branches
  ADD COLUMN IF NOT EXISTS logo_path TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS nit VARCHAR(30);

COMMENT ON COLUMN laundry.branches.logo_path IS
  'Ruta del logo de la sucursal dentro del bucket branch-logos de Supabase Storage.';

-- El bucket es público solo para leer las imágenes; las escrituras requieren
-- una sesión autenticada y se realizan desde la pantalla de sucursales.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branch-logos',
  'branch-logos',
  TRUE,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

GRANT USAGE ON SCHEMA laundry TO authenticated;
GRANT SELECT, INSERT, UPDATE ON laundry.branches TO authenticated;

ALTER TABLE laundry.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users manage branches" ON laundry.branches;
CREATE POLICY "Authenticated users manage branches"
ON laundry.branches
FOR ALL
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Authenticated users manage branch logos" ON storage.objects;
CREATE POLICY "Authenticated users manage branch logos"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'branch-logos')
WITH CHECK (bucket_id = 'branch-logos');

COMMIT;
