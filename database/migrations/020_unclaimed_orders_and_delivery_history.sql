-- Estado administrativo para órdenes que el cliente no recogió.
BEGIN;
SET LOCAL ROLE postgres;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

DO $$
DECLARE type_name REGTYPE;
BEGIN
  SELECT atttypid::regtype INTO type_name FROM pg_attribute
  WHERE attrelid = 'public.orders'::regclass AND attname = 'status' AND NOT attisdropped;
  IF (SELECT typtype = 'e' FROM pg_type WHERE oid = type_name::oid) THEN
    EXECUTE format('ALTER TYPE %s ADD VALUE IF NOT EXISTS ''unclaimed''', type_name);
  END IF;
END;
$$;
COMMIT;

BEGIN;
SET LOCAL ROLE postgres;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS chk_orders_operational_status;
ALTER TABLE public.orders ADD CONSTRAINT chk_orders_operational_status
  CHECK (status::TEXT IN ('received', 'in_process', 'delivered', 'unclaimed')) NOT VALID;

UPDATE public.orders SET delivered_at = COALESCE(delivered_at, updated_at, created_at)
WHERE status::TEXT = 'delivered' AND delivered_at IS NULL;

CREATE OR REPLACE FUNCTION public.validate_unclaimed_order_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, laundry AS $$
BEGIN
  IF (NEW.status::TEXT = 'unclaimed' OR OLD.status::TEXT = 'unclaimed')
     AND OLD.status::TEXT IS DISTINCT FROM NEW.status::TEXT
     AND NOT laundry.is_general_admin() THEN
    RAISE EXCEPTION 'Solo un administrador general puede gestionar una orden no recogida.';
  END IF;
  IF NEW.status::TEXT = 'delivered' AND OLD.status::TEXT IS DISTINCT FROM NEW.status::TEXT THEN
    NEW.delivered_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_unclaimed_order_admin ON public.orders;
CREATE TRIGGER trg_validate_unclaimed_order_admin BEFORE UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_unclaimed_order_admin();

CREATE OR REPLACE FUNCTION public.validate_unclaimed_order_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, laundry AS $$
DECLARE target_order UUID; current_status TEXT;
BEGIN
  target_order := CASE WHEN TG_TABLE_NAME = 'order_items' THEN NEW.order_id ELSE NEW.order_id END;
  SELECT status::TEXT INTO current_status FROM public.orders WHERE id = target_order;
  IF current_status = 'unclaimed' AND NOT laundry.is_general_admin() THEN
    RAISE EXCEPTION 'Solo un administrador general puede continuar una orden no recogida.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_validate_unclaimed_item_change ON public.order_items;
CREATE TRIGGER trg_validate_unclaimed_item_change BEFORE UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.validate_unclaimed_order_change();
DROP TRIGGER IF EXISTS trg_validate_unclaimed_payment_change ON public.payments;
CREATE TRIGGER trg_validate_unclaimed_payment_change BEFORE INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.validate_unclaimed_order_change();

NOTIFY pgrst, 'reload schema';
COMMIT;
