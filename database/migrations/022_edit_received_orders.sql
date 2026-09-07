-- Edición controlada de órdenes aún recibidas.
-- Ejecutar en Supabase SQL Editor después de 021_reopen_today_cash_session.sql.
-- Los pagos y el correlativo de orden no se alteran para conservar la trazabilidad contable.

BEGIN;
SET LOCAL ROLE postgres;

CREATE OR REPLACE FUNCTION public.edit_received_order(
  p_order_id UUID,
  p_client_id UUID,
  p_estimated_delivery_at TIMESTAMPTZ,
  p_observations TEXT,
  p_discount NUMERIC,
  p_items JSONB
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, laundry
AS $$
DECLARE
  order_row public.orders;
  calculated_subtotal NUMERIC(12,2);
  calculated_total NUMERIC(12,2);
  paid_total NUMERIC(12,2);
  item_count INTEGER;
BEGIN
  SELECT * INTO order_row
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La orden no existe.';
  END IF;
  IF NOT laundry.can_access_branch(order_row.branch_id) THEN
    RAISE EXCEPTION 'No tiene permiso para editar esta orden.';
  END IF;
  IF order_row.status::TEXT <> 'received' THEN
    RAISE EXCEPTION 'Solo se pueden editar órdenes en estado Recibida.';
  END IF;
  IF p_client_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id AND active = TRUE) THEN
    RAISE EXCEPTION 'Seleccione un cliente activo.';
  END IF;
  IF p_estimated_delivery_at IS NULL THEN
    RAISE EXCEPTION 'Registre la fecha y hora estimadas de entrega.';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La orden debe tener al menos una prenda.';
  END IF;

  SELECT COUNT(*), COALESCE(SUM(item.subtotal), 0)::NUMERIC(12,2)
  INTO item_count, calculated_subtotal
  FROM jsonb_to_recordset(p_items) AS item(
    garment_type_id UUID,
    quantity NUMERIC,
    unit_price NUMERIC,
    subtotal NUMERIC,
    observations TEXT
  );

  IF item_count = 0 OR EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items) AS item(
      garment_type_id UUID,
      quantity NUMERIC,
      unit_price NUMERIC,
      subtotal NUMERIC,
      observations TEXT
    )
    WHERE item.garment_type_id IS NULL
       OR item.quantity IS NULL OR item.quantity <= 0
       OR item.unit_price IS NULL OR item.unit_price < 0
       OR item.subtotal IS NULL OR item.subtotal <= 0
       OR NOT EXISTS (SELECT 1 FROM public.garment_types gt WHERE gt.id = item.garment_type_id AND gt.active = TRUE)
  ) THEN
    RAISE EXCEPTION 'Verifique las prendas, cantidades e importes de la orden.';
  END IF;

  IF COALESCE(p_discount, 0) < 0 OR COALESCE(p_discount, 0) > calculated_subtotal THEN
    RAISE EXCEPTION 'El descuento no es válido.';
  END IF;
  calculated_total := calculated_subtotal - COALESCE(p_discount, 0);

  SELECT COALESCE(SUM(amount), 0) INTO paid_total
  FROM public.payments
  WHERE order_id = p_order_id;
  IF paid_total > calculated_total THEN
    RAISE EXCEPTION 'El total editado no puede ser menor que los pagos ya registrados (Bs %).', paid_total;
  END IF;

  DELETE FROM public.order_items WHERE order_id = p_order_id;

  INSERT INTO public.order_items (
    order_id, garment_type_id, quantity, delivered_quantity,
    unit_price, subtotal, observations, status
  )
  SELECT
    p_order_id, item.garment_type_id, item.quantity, 0,
    item.unit_price, item.subtotal, NULLIF(trim(item.observations), ''), 'received'
  FROM jsonb_to_recordset(p_items) AS item(
    garment_type_id UUID,
    quantity NUMERIC,
    unit_price NUMERIC,
    subtotal NUMERIC,
    observations TEXT
  );

  UPDATE public.orders
  SET client_id = p_client_id,
      estimated_delivery_at = p_estimated_delivery_at,
      observations = NULLIF(trim(p_observations), ''),
      subtotal = calculated_subtotal,
      discount = COALESCE(p_discount, 0),
      total = calculated_total,
      updated_at = NOW()
  WHERE id = p_order_id
  RETURNING * INTO order_row;

  RETURN order_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.edit_received_order(UUID, UUID, TIMESTAMPTZ, TEXT, NUMERIC, JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
