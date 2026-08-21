-- Un servicio puede aplicarse a muchas prendas; cada prenda queda vinculada a un servicio.
-- Ejecutar completo en Supabase SQL Editor.
BEGIN;
SET LOCAL ROLE postgres;

ALTER TABLE public.garment_types
  ADD COLUMN IF NOT EXISTS service_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'garment_types_service_id_fkey'
      AND conrelid = 'public.garment_types'::regclass
  ) THEN
    ALTER TABLE public.garment_types
      ADD CONSTRAINT garment_types_service_id_fkey
      FOREIGN KEY (service_id) REFERENCES public.services(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_garment_types_service_id
  ON public.garment_types(service_id);

-- NOT VALID conserva las prendas históricas sin servicio, pero obliga a que
-- toda prenda nueva (o modificada) tenga una asignación válida.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'garment_types_service_required'
      AND conrelid = 'public.garment_types'::regclass
  ) THEN
    ALTER TABLE public.garment_types
      ADD CONSTRAINT garment_types_service_required
      CHECK (service_id IS NOT NULL) NOT VALID;
  END IF;
END;
$$;

COMMENT ON COLUMN public.garment_types.service_id IS
  'Servicio aplicable a la prenda. Debe seleccionarse al crear o editar la prenda.';

NOTIFY pgrst, 'reload schema';
COMMIT;
