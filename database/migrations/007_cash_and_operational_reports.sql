-- Caja por sucursal, cierre diario y datos para reportes operativos.
-- Ejecutar después de 006_branch_company_data.sql.

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES laundry.branches(id);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES laundry.branches(id),
  ADD COLUMN IF NOT EXISTS cash_session_id UUID;

CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES laundry.branches(id),
  business_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opening_cash_amount NUMERIC(12,2) NOT NULL CHECK (opening_cash_amount >= 0),
  expected_cash_amount NUMERIC(12,2),
  closing_cash_amount NUMERIC(12,2),
  cash_difference_amount NUMERIC(12,2),
  payment_totals JSONB,
  opening_notes TEXT,
  closing_notes TEXT,
  opened_by UUID REFERENCES auth.users(id),
  closed_by UUID REFERENCES auth.users(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payments
  ADD CONSTRAINT fk_payments_cash_session
  FOREIGN KEY (cash_session_id) REFERENCES public.cash_sessions(id);

CREATE TABLE IF NOT EXISTS public.cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_session_id UUID NOT NULL REFERENCES public.cash_sessions(id),
  branch_id UUID NOT NULL REFERENCES laundry.branches(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('income', 'expense')),
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'qr', 'transfer', 'card', 'other')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_branch_created_at ON public.orders(branch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_branch_created_at ON public.payments(branch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_cash_session ON public.payments(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON public.cash_movements(cash_session_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_open_cash_session_per_branch
  ON public.cash_sessions(branch_id) WHERE status = 'open';

CREATE OR REPLACE FUNCTION public.assign_payment_to_cash_session()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  active_session_id UUID;
BEGIN
  SELECT branch_id INTO NEW.branch_id FROM public.orders WHERE id = NEW.order_id;

  IF NEW.branch_id IS NULL THEN
    RAISE EXCEPTION 'La orden debe tener una sucursal antes de registrar pagos.';
  END IF;

  SELECT id INTO active_session_id
  FROM public.cash_sessions
  WHERE branch_id = NEW.branch_id AND status = 'open'
  LIMIT 1;

  IF active_session_id IS NULL THEN
    RAISE EXCEPTION 'Debe abrir la caja de la sucursal antes de registrar pagos.';
  END IF;

  NEW.cash_session_id := active_session_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_payment_to_cash_session ON public.payments;
CREATE TRIGGER trg_assign_payment_to_cash_session
BEFORE INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.assign_payment_to_cash_session();

CREATE OR REPLACE FUNCTION public.validate_cash_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  session_branch UUID;
  session_status TEXT;
BEGIN
  SELECT branch_id, status INTO session_branch, session_status
  FROM public.cash_sessions WHERE id = NEW.cash_session_id;
  IF NOT FOUND OR session_status <> 'open' THEN
    RAISE EXCEPTION 'Solo se pueden registrar movimientos en una caja abierta.';
  END IF;
  IF session_branch <> NEW.branch_id THEN
    RAISE EXCEPTION 'El movimiento debe pertenecer a la misma sucursal que la caja.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_cash_movement ON public.cash_movements;
CREATE TRIGGER trg_validate_cash_movement
BEFORE INSERT ON public.cash_movements
FOR EACH ROW EXECUTE FUNCTION public.validate_cash_movement();

CREATE OR REPLACE FUNCTION public.close_cash_session(
  p_session_id UUID,
  p_closing_cash_amount NUMERIC,
  p_closing_notes TEXT DEFAULT NULL
)
RETURNS public.cash_sessions
LANGUAGE plpgsql
AS $$
DECLARE
  session_row public.cash_sessions;
  cash_payments NUMERIC(12,2);
  cash_movements NUMERIC(12,2);
  calculated_expected NUMERIC(12,2);
  totals JSONB;
BEGIN
  SELECT * INTO session_row FROM public.cash_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La sesión de caja no existe.'; END IF;
  IF session_row.status <> 'open' THEN RAISE EXCEPTION 'La caja ya fue cerrada.'; END IF;
  IF p_closing_cash_amount < 0 THEN RAISE EXCEPTION 'El monto final no puede ser negativo.'; END IF;

  SELECT COALESCE(jsonb_object_agg(payment_method, total), '{}'::jsonb)
  INTO totals
  FROM (
    SELECT payment_method, SUM(amount)::NUMERIC(12,2) AS total
    FROM public.payments WHERE cash_session_id = p_session_id GROUP BY payment_method
  ) payment_summary;

  SELECT COALESCE(SUM(amount), 0) INTO cash_payments
  FROM public.payments WHERE cash_session_id = p_session_id AND payment_method = 'cash';

  SELECT COALESCE(SUM(CASE WHEN movement_type = 'income' THEN amount ELSE -amount END), 0)
  INTO cash_movements
  FROM public.cash_movements WHERE cash_session_id = p_session_id AND payment_method = 'cash';

  calculated_expected := session_row.opening_cash_amount + cash_payments + cash_movements;

  UPDATE public.cash_sessions
  SET status = 'closed', expected_cash_amount = calculated_expected,
      closing_cash_amount = p_closing_cash_amount,
      cash_difference_amount = p_closing_cash_amount - calculated_expected,
      payment_totals = totals, closing_notes = p_closing_notes,
      closed_by = auth.uid(), closed_at = NOW(), updated_at = NOW()
  WHERE id = p_session_id
  RETURNING * INTO session_row;

  RETURN session_row;
END;
$$;

GRANT SELECT, INSERT, UPDATE ON public.cash_sessions, public.cash_movements TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_cash_session(UUID, NUMERIC, TEXT) TO authenticated;

ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users manage cash sessions" ON public.cash_sessions;
CREATE POLICY "Authenticated users manage cash sessions" ON public.cash_sessions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Authenticated users manage cash movements" ON public.cash_movements;
CREATE POLICY "Authenticated users manage cash movements" ON public.cash_movements FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

COMMIT;
