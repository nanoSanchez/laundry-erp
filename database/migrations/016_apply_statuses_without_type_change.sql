-- Ajuste compatible para estados, sin modificar el tipo de columna status.
-- Usar en lugar de 014 y 015 si existen triggers heredados.
BEGIN;
SET LOCAL ROLE postgres;

-- Elimina restricciones antiguas de estado antes de usar el nuevo valor.
DO $$
DECLARE record_row RECORD;
BEGIN
  FOR record_row IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.orders'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', record_row.conname); END LOOP;
  FOR record_row IN SELECT conname FROM pg_constraint WHERE conrelid = 'public.order_items'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP EXECUTE format('ALTER TABLE public.order_items DROP CONSTRAINT %I', record_row.conname); END LOOP;
END;
$$;

-- Si status usa un enum, registra el nuevo valor sin alterar la columna.
DO $$
DECLARE type_name REGTYPE;
BEGIN
  SELECT a.atttypid::REGTYPE INTO type_name FROM pg_attribute a WHERE a.attrelid = 'public.orders'::REGCLASS AND a.attname = 'status' AND NOT a.attisdropped;
  IF EXISTS (SELECT 1 FROM pg_type WHERE oid = type_name AND typtype = 'e') THEN EXECUTE format('ALTER TYPE %s ADD VALUE IF NOT EXISTS %L', type_name, 'in_process'); END IF;
  SELECT a.atttypid::REGTYPE INTO type_name FROM pg_attribute a WHERE a.attrelid = 'public.order_items'::REGCLASS AND a.attname = 'status' AND NOT a.attisdropped;
  IF EXISTS (SELECT 1 FROM pg_type WHERE oid = type_name AND typtype = 'e') THEN EXECUTE format('ALTER TYPE %s ADD VALUE IF NOT EXISTS %L', type_name, 'requires_cleaning'); END IF;
END;
$$;

-- PostgreSQL exige confirmar un valor enum nuevo antes de utilizarlo.
COMMIT;

BEGIN;
SET LOCAL ROLE postgres;

UPDATE public.orders SET status = 'in_process' WHERE status::TEXT IN ('pending', 'requires_cleaning', 'in process');
UPDATE public.order_items SET status = 'received' WHERE status::TEXT IN ('pending', 'in_process');

ALTER TABLE public.orders ADD CONSTRAINT chk_orders_operational_status CHECK (status::TEXT IN ('received', 'in_process', 'delivered')) NOT VALID;
ALTER TABLE public.order_items ADD CONSTRAINT chk_order_items_operational_status CHECK (status::TEXT IN ('received', 'delivered', 'requires_cleaning')) NOT VALID;

CREATE OR REPLACE FUNCTION public.validate_order_delivery_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, laundry AS $$
DECLARE missing_items BOOLEAN; outstanding NUMERIC;
BEGIN
  IF NEW.status::TEXT = 'delivered' AND OLD.status::TEXT IS DISTINCT FROM NEW.status::TEXT THEN
    SELECT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = NEW.id AND status::TEXT <> 'delivered') INTO missing_items;
    SELECT GREATEST(NEW.total - COALESCE(SUM(amount), 0), 0) INTO outstanding FROM public.payments WHERE order_id = NEW.id;
    IF missing_items THEN RAISE EXCEPTION 'No se puede entregar la orden: todas las prendas deben estar entregadas.'; END IF;
    IF outstanding > 0 THEN RAISE EXCEPTION 'No se puede entregar la orden: existe un saldo pendiente de Bs %.', outstanding; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_order_delivery_status ON public.orders;
CREATE TRIGGER trg_validate_order_delivery_status BEFORE UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.validate_order_delivery_status();

CREATE OR REPLACE FUNCTION public.sync_order_after_garment_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, laundry AS $$
BEGIN
  IF NEW.status::TEXT = 'requires_cleaning' THEN UPDATE public.orders SET status = 'in_process' WHERE id = NEW.order_id AND status::TEXT = 'delivered';
  ELSIF NEW.status::TEXT = 'delivered' THEN UPDATE public.orders SET status = 'in_process' WHERE id = NEW.order_id AND status::TEXT = 'received'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_order_after_garment_status ON public.order_items;
CREATE TRIGGER trg_sync_order_after_garment_status AFTER UPDATE OF status ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.sync_order_after_garment_status();

COMMIT;
NOTIFY pgrst, 'reload schema';
