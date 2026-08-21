-- Estados operativos de órdenes y prendas, con entrega final validada.
BEGIN;
SET LOCAL ROLE postgres;

UPDATE public.orders SET status = 'in_process' WHERE status IN ('pending', 'requires_cleaning');
UPDATE public.order_items SET status = 'received' WHERE status = 'pending';

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS chk_orders_operational_status;
ALTER TABLE public.orders ADD CONSTRAINT chk_orders_operational_status CHECK (status IN ('received', 'in_process', 'delivered')) NOT VALID;
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS chk_order_items_operational_status;
ALTER TABLE public.order_items ADD CONSTRAINT chk_order_items_operational_status CHECK (status IN ('received', 'delivered', 'requires_cleaning')) NOT VALID;

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
  IF NEW.status = 'requires_cleaning' THEN
    UPDATE public.orders SET status = 'in_process' WHERE id = NEW.order_id AND status = 'delivered';
  ELSIF NEW.status = 'delivered' THEN
    UPDATE public.orders SET status = 'in_process' WHERE id = NEW.order_id AND status = 'received';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_order_after_garment_status ON public.order_items;
CREATE TRIGGER trg_sync_order_after_garment_status AFTER UPDATE OF status ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.sync_order_after_garment_status();

COMMIT;
NOTIFY pgrst, 'reload schema';
