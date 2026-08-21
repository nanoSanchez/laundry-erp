-- Corrige el trigger de caja: orders no tiene la columna delivered_quantity.
-- Ejecutar completo en Supabase SQL Editor.
BEGIN;
SET LOCAL ROLE postgres;

CREATE OR REPLACE FUNCTION public.require_ready_cash_for_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, laundry
AS $$
DECLARE
  branch_uuid UUID;
  readiness RECORD;
  requires_cash_validation BOOLEAN := FALSE;
BEGIN
  -- Se evalúa por tabla, para no acceder a columnas que no existen en orders.
  IF TG_TABLE_NAME = 'orders' THEN
    requires_cash_validation := NEW.status::TEXT = 'delivered'
      AND OLD.status::TEXT IS DISTINCT FROM NEW.status::TEXT;
    branch_uuid := NEW.branch_id;
  ELSIF TG_TABLE_NAME = 'order_items' THEN
    requires_cash_validation := NEW.status::TEXT = 'delivered'
      OR NEW.delivered_quantity > COALESCE(OLD.delivered_quantity, 0);

    SELECT branch_id INTO branch_uuid
    FROM public.orders
    WHERE id = NEW.order_id;
  END IF;

  IF requires_cash_validation THEN
    SELECT * INTO readiness FROM public.cash_readiness(branch_uuid);
    IF NOT COALESCE(readiness.ready, FALSE) THEN
      RAISE EXCEPTION '%', COALESCE(readiness.message, 'Debe abrir la caja antes de registrar la entrega.');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
