-- Normaliza los tipos de estado para soportar el flujo operativo actual.
BEGIN;
SET LOCAL ROLE postgres;

-- Los triggers que observan status deben retirarse antes de cambiar el tipo.
DROP TRIGGER IF EXISTS trg_require_ready_cash_for_order_delivery ON public.orders;
DROP TRIGGER IF EXISTS trg_require_ready_cash_for_item_delivery ON public.order_items;
DROP TRIGGER IF EXISTS trg_validate_order_delivery_status ON public.orders;
DROP TRIGGER IF EXISTS trg_sync_order_after_garment_status ON public.order_items;

ALTER TABLE public.orders
  ALTER COLUMN status TYPE TEXT USING LOWER(status::TEXT);
ALTER TABLE public.order_items
  ALTER COLUMN status TYPE TEXT USING LOWER(status::TEXT);

UPDATE public.orders SET status = 'in_process' WHERE status IN ('pending', 'requires_cleaning', 'in process');
UPDATE public.order_items SET status = 'received' WHERE status IN ('pending', 'in_process');

DO $$
DECLARE constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', constraint_name); END LOOP;
  FOR constraint_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.order_items'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP EXECUTE format('ALTER TABLE public.order_items DROP CONSTRAINT %I', constraint_name); END LOOP;
END;
$$;

ALTER TABLE public.orders ADD CONSTRAINT chk_orders_operational_status CHECK (status IN ('received', 'in_process', 'delivered'));
ALTER TABLE public.order_items ADD CONSTRAINT chk_order_items_operational_status CHECK (status IN ('received', 'delivered', 'requires_cleaning'));

CREATE OR REPLACE FUNCTION public.validate_order_delivery_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, laundry AS $$
DECLARE missing_items BOOLEAN; outstanding NUMERIC;
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = NEW.id AND status <> 'delivered') INTO missing_items;
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
  IF NEW.status = 'requires_cleaning' THEN UPDATE public.orders SET status = 'in_process' WHERE id = NEW.order_id AND status = 'delivered';
  ELSIF NEW.status = 'delivered' THEN UPDATE public.orders SET status = 'in_process' WHERE id = NEW.order_id AND status = 'received';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_order_after_garment_status ON public.order_items;
CREATE TRIGGER trg_sync_order_after_garment_status AFTER UPDATE OF status ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.sync_order_after_garment_status();

-- Restablece el control de caja antes de cualquier entrega.
CREATE TRIGGER trg_require_ready_cash_for_order_delivery
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.require_ready_cash_for_delivery();
CREATE TRIGGER trg_require_ready_cash_for_item_delivery
BEFORE UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.require_ready_cash_for_delivery();

COMMIT;
NOTIFY pgrst, 'reload schema';
