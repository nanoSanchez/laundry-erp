-- Acceso por sucursal y controles de operación vinculados a caja.
-- Ejecutar después de 007_cash_and_operational_reports.sql.

BEGIN;

-- En Supabase SQL Editor la consulta puede ejecutarse con el rol authenticated.
-- La sesión pertenece a postgres, por lo que se eleva solo durante esta migración.
SET LOCAL ROLE postgres;

CREATE TABLE IF NOT EXISTS laundry.user_permissions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_general_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS laundry.user_branch_access (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES laundry.branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, branch_id)
);

CREATE OR REPLACE FUNCTION laundry.is_general_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = laundry, public AS $$
  SELECT COALESCE((SELECT is_general_admin FROM laundry.user_permissions WHERE user_id = auth.uid()), FALSE);
$$;

CREATE OR REPLACE FUNCTION laundry.can_access_branch(p_branch_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = laundry, public AS $$
  SELECT laundry.is_general_admin()
    OR EXISTS (SELECT 1 FROM laundry.user_branch_access WHERE user_id = auth.uid() AND branch_id = p_branch_id);
$$;

CREATE OR REPLACE FUNCTION public.my_accessible_branches()
RETURNS TABLE (id UUID, code VARCHAR, name TEXT, is_active BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = laundry, public AS $$
  SELECT b.id, b.code, b.name, b.is_active
  FROM laundry.branches b
  WHERE b.is_active AND laundry.can_access_branch(b.id)
  ORDER BY b.name;
$$;

CREATE OR REPLACE FUNCTION public.my_branch_access_context()
RETURNS TABLE (is_general_admin BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = laundry, public AS $$
  SELECT laundry.is_general_admin();
$$;

CREATE OR REPLACE FUNCTION public.cash_readiness(p_branch_id UUID)
RETURNS TABLE (ready BOOLEAN, message TEXT, cash_session_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = laundry, public AS $$
DECLARE
  current_session UUID;
  previous_open_date DATE;
BEGIN
  IF NOT laundry.can_access_branch(p_branch_id) THEN
    RAISE EXCEPTION 'No tiene permiso para operar esta sucursal.';
  END IF;
  SELECT id INTO current_session FROM public.cash_sessions
  WHERE branch_id = p_branch_id AND business_date = CURRENT_DATE AND status = 'open';
  SELECT business_date INTO previous_open_date FROM public.cash_sessions
  WHERE branch_id = p_branch_id AND business_date < CURRENT_DATE AND status = 'open'
  ORDER BY business_date DESC LIMIT 1;
  IF previous_open_date IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, format('Debe cerrar la caja pendiente del %s antes de operar.', previous_open_date), NULL::UUID;
  ELSIF current_session IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Debe abrir la caja de la fecha antes de recibir o entregar órdenes.', NULL::UUID;
  ELSE
    RETURN QUERY SELECT TRUE, NULL::TEXT, current_session;
  END IF;
END;
$$;

GRANT USAGE ON SCHEMA laundry TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON laundry.user_permissions, laundry.user_branch_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_accessible_branches(), public.cash_readiness(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_branch_access_context() TO authenticated;

ALTER TABLE laundry.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE laundry.user_branch_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "General admins manage user permissions" ON laundry.user_permissions;
CREATE POLICY "General admins manage user permissions" ON laundry.user_permissions FOR ALL TO authenticated USING (laundry.is_general_admin()) WITH CHECK (laundry.is_general_admin());
DROP POLICY IF EXISTS "General admins manage user branch access" ON laundry.user_branch_access;
CREATE POLICY "General admins manage user branch access" ON laundry.user_branch_access FOR ALL TO authenticated USING (laundry.is_general_admin()) WITH CHECK (laundry.is_general_admin());

DROP POLICY IF EXISTS "Authenticated users manage branches" ON laundry.branches;
DROP POLICY IF EXISTS "Users view allowed branches" ON laundry.branches;
DROP POLICY IF EXISTS "General admins manage branches" ON laundry.branches;
CREATE POLICY "Users view allowed branches" ON laundry.branches FOR SELECT TO authenticated USING (laundry.can_access_branch(id));
CREATE POLICY "General admins manage branches" ON laundry.branches FOR ALL TO authenticated USING (laundry.is_general_admin()) WITH CHECK (laundry.is_general_admin());

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access own branch orders" ON public.orders;
CREATE POLICY "Users access own branch orders" ON public.orders FOR ALL TO authenticated USING (laundry.can_access_branch(branch_id)) WITH CHECK (laundry.can_access_branch(branch_id));
DROP POLICY IF EXISTS "Users access own branch payments" ON public.payments;
CREATE POLICY "Users access own branch payments" ON public.payments FOR ALL TO authenticated USING (laundry.can_access_branch(branch_id)) WITH CHECK (laundry.can_access_branch(branch_id));
DROP POLICY IF EXISTS "Users access own branch order items" ON public.order_items;
CREATE POLICY "Users access own branch order items" ON public.order_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND laundry.can_access_branch(o.branch_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND laundry.can_access_branch(o.branch_id)));

DROP POLICY IF EXISTS "Authenticated users manage cash sessions" ON public.cash_sessions;
DROP POLICY IF EXISTS "Users access own branch cash sessions" ON public.cash_sessions;
CREATE POLICY "Users access own branch cash sessions" ON public.cash_sessions FOR ALL TO authenticated USING (laundry.can_access_branch(branch_id)) WITH CHECK (laundry.can_access_branch(branch_id));
DROP POLICY IF EXISTS "Authenticated users manage cash movements" ON public.cash_movements;
DROP POLICY IF EXISTS "Users access own branch cash movements" ON public.cash_movements;
CREATE POLICY "Users access own branch cash movements" ON public.cash_movements FOR ALL TO authenticated USING (laundry.can_access_branch(branch_id)) WITH CHECK (laundry.can_access_branch(branch_id));

CREATE OR REPLACE FUNCTION public.validate_cash_opening()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = laundry, public AS $$
DECLARE pending_date DATE;
BEGIN
  IF NOT laundry.can_access_branch(NEW.branch_id) THEN
    RAISE EXCEPTION 'No tiene permiso para abrir caja en esta sucursal.';
  END IF;
  IF NEW.business_date <> CURRENT_DATE THEN
    RAISE EXCEPTION 'La caja solo puede abrirse para la fecha actual.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.cash_sessions WHERE branch_id = NEW.branch_id AND business_date = NEW.business_date) THEN
    RAISE EXCEPTION 'Ya existe una caja registrada para esta sucursal en la fecha actual.';
  END IF;
  SELECT business_date INTO pending_date FROM public.cash_sessions
  WHERE branch_id = NEW.branch_id AND status = 'open' ORDER BY business_date DESC LIMIT 1;
  IF pending_date IS NOT NULL THEN
    RAISE EXCEPTION 'Debe cerrar la caja pendiente del % antes de abrir una nueva.', pending_date;
  END IF;
  NEW.opened_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_cash_opening ON public.cash_sessions;
CREATE TRIGGER trg_validate_cash_opening
BEFORE INSERT ON public.cash_sessions
FOR EACH ROW EXECUTE FUNCTION public.validate_cash_opening();

CREATE OR REPLACE FUNCTION public.require_ready_cash_for_order()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = laundry, public AS $$
DECLARE readiness RECORD;
BEGIN
  SELECT * INTO readiness FROM public.cash_readiness(NEW.branch_id);
  IF NOT readiness.ready THEN RAISE EXCEPTION '%', readiness.message; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_require_ready_cash_for_order ON public.orders;
CREATE TRIGGER trg_require_ready_cash_for_order
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.require_ready_cash_for_order();

CREATE OR REPLACE FUNCTION public.require_ready_cash_for_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = laundry, public AS $$
DECLARE branch_uuid UUID; readiness RECORD;
BEGIN
  IF (TG_TABLE_NAME = 'orders' AND NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM NEW.status)
     OR (TG_TABLE_NAME = 'order_items' AND (NEW.status = 'delivered' OR NEW.delivered_quantity > COALESCE(OLD.delivered_quantity, 0))) THEN
    SELECT branch_id INTO branch_uuid FROM public.orders WHERE id = CASE WHEN TG_TABLE_NAME = 'orders' THEN NEW.id ELSE NEW.order_id END;
    SELECT * INTO readiness FROM public.cash_readiness(branch_uuid);
    IF NOT readiness.ready THEN RAISE EXCEPTION '%', readiness.message; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_require_ready_cash_for_order_delivery ON public.orders;
CREATE TRIGGER trg_require_ready_cash_for_order_delivery
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.require_ready_cash_for_delivery();
DROP TRIGGER IF EXISTS trg_require_ready_cash_for_item_delivery ON public.order_items;
CREATE TRIGGER trg_require_ready_cash_for_item_delivery
BEFORE UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.require_ready_cash_for_delivery();

COMMIT;

-- Bootstrap (ejecutar una sola vez reemplazando el UUID):
-- INSERT INTO laundry.user_permissions (user_id, is_general_admin)
-- VALUES ('UUID_DEL_USUARIO_ADMIN', TRUE)
-- ON CONFLICT (user_id) DO UPDATE SET is_general_admin = TRUE;
-- Para otro usuario: INSERT INTO laundry.user_branch_access (user_id, branch_id) VALUES ('UUID_USUARIO', 'UUID_SUCURSAL');
