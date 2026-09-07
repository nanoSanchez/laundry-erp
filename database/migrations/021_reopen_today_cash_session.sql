-- Permite reabrir únicamente la caja cerrada de la fecha actual.
-- Conserva el cierre anterior en una bitácora antes de volver la sesión a estado abierto.
-- Ejecutar en Supabase SQL Editor después de 020_unclaimed_orders_and_delivery_history.sql.

BEGIN;
SET LOCAL ROLE postgres;

CREATE TABLE IF NOT EXISTS public.cash_session_reopenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_session_id UUID NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES laundry.branches(id),
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) > 0),
  previous_expected_cash_amount NUMERIC(12,2),
  previous_closing_cash_amount NUMERIC(12,2),
  previous_cash_difference_amount NUMERIC(12,2),
  previous_payment_totals JSONB,
  previous_closing_notes TEXT,
  previously_closed_by UUID REFERENCES auth.users(id),
  previously_closed_at TIMESTAMPTZ,
  reopened_by UUID REFERENCES auth.users(id),
  reopened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_session_reopenings_session
  ON public.cash_session_reopenings(cash_session_id, reopened_at DESC);

ALTER TABLE public.cash_session_reopenings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own branch cash reopenings" ON public.cash_session_reopenings;
CREATE POLICY "Users view own branch cash reopenings"
  ON public.cash_session_reopenings FOR SELECT TO authenticated
  USING (laundry.can_access_branch(branch_id));

CREATE OR REPLACE FUNCTION public.reopen_cash_session(
  p_session_id UUID,
  p_reason TEXT
)
RETURNS public.cash_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, laundry
AS $$
DECLARE
  session_row public.cash_sessions;
BEGIN
  SELECT * INTO session_row
  FROM public.cash_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La sesión de caja no existe.';
  END IF;
  IF NOT laundry.can_access_branch(session_row.branch_id) THEN
    RAISE EXCEPTION 'No tiene permiso para reabrir caja en esta sucursal.';
  END IF;
  IF session_row.business_date <> CURRENT_DATE THEN
    RAISE EXCEPTION 'Solo se puede reabrir la caja de la fecha actual.';
  END IF;
  IF session_row.status <> 'closed' THEN
    RAISE EXCEPTION 'Solo se puede reabrir una caja cerrada.';
  END IF;
  IF NULLIF(trim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Debe indicar el motivo de la reapertura.';
  END IF;

  INSERT INTO public.cash_session_reopenings (
    cash_session_id, branch_id, reason,
    previous_expected_cash_amount, previous_closing_cash_amount,
    previous_cash_difference_amount, previous_payment_totals,
    previous_closing_notes, previously_closed_by, previously_closed_at,
    reopened_by
  ) VALUES (
    session_row.id, session_row.branch_id, trim(p_reason),
    session_row.expected_cash_amount, session_row.closing_cash_amount,
    session_row.cash_difference_amount, session_row.payment_totals,
    session_row.closing_notes, session_row.closed_by, session_row.closed_at,
    auth.uid()
  );

  UPDATE public.cash_sessions
  SET status = 'open',
      expected_cash_amount = NULL,
      closing_cash_amount = NULL,
      cash_difference_amount = NULL,
      payment_totals = NULL,
      closing_notes = NULL,
      closed_by = NULL,
      closed_at = NULL,
      updated_at = NOW()
  WHERE id = p_session_id
  RETURNING * INTO session_row;

  RETURN session_row;
END;
$$;

GRANT SELECT ON public.cash_session_reopenings TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_cash_session(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
