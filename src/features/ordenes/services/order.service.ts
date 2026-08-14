import { supabase } from "@/infrastructure/supabase/client";

/**
 * Estados de la orden completa.
 */
export type OrderStatus = "received" | "pending" | "delivered" | "requires_cleaning";

/**
 * Estados individuales de las prendas.
 */
export type OrderItemStatus = "received" | "pending" | "delivered" | "requires_cleaning";

export interface CreateOrderItem {
  garment_type_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  observations?: string;
}

export interface CreateOrder {
  branch_id: string;
  client_id: string;
  order_number: string;
  estimated_delivery_at?: string | null;
  observations?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  items: CreateOrderItem[];
}

/**
 * Crear una nueva orden.
 *
 * La orden inicia como "received".
 * Todas las prendas también inician como "received"
 * y delivered_quantity = 0.
 */
export async function createOrder(order: CreateOrder) {
  const {
    branch_id,
    client_id,
    order_number,
    estimated_delivery_at,
    observations,
    subtotal,
    discount,
    total,
    items,
  } = order;

  const { data: createdOrder, error: orderError } = await supabase
    .from("orders")
    .insert({
      branch_id,
      client_id,
      order_number,
      estimated_delivery_at: estimated_delivery_at ?? null,
      observations: observations ?? null,
      subtotal,
      discount,
      total,
      status: "received",
    })
    .select()
    .single();

  if (orderError) {
    throw orderError;
  }

  const orderItems = items.map((item) => ({
    order_id: createdOrder.id,
    garment_type_id: item.garment_type_id,
    quantity: item.quantity,
    delivered_quantity: 0,
    unit_price: item.unit_price,
    subtotal: item.subtotal,
    observations: item.observations ?? null,
    status: "received",
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

  if (itemsError) {
    await supabase.from("orders").delete().eq("id", createdOrder.id);

    throw itemsError;
  }

  return createdOrder;
}

/**
 * Actualiza el estado general de una orden.
 *
 * Si se marca toda la orden como entregada:
 *
 * - Todas las prendas pasan a delivered.
 * - delivered_quantity pasa a quantity.
 *
 * Si la orden pasa de received a pending:
 *
 * - Las prendas que todavía estén en received
 *   pasan también a pending.
 */
export async function updateOrderStatus(id: string, status: OrderStatus) {
  /**
   * Cuando la orden pasa de RECIBIDA a PENDIENTE,
   * las prendas que todavía están recibidas pasan
   * también a pendiente.
   *
   * No modificamos prendas que ya tengan otro estado.
   * Esto evita sobrescribir estados como:
   * - delivered
   * - requires_cleaning
   */
  if (status === "pending") {
    const { error: itemsUpdateError } = await supabase
      .from("order_items")
      .update({
        status: "pending",
      })
      .eq("order_id", id)
      .eq("status", "received");

    if (itemsUpdateError) {
      throw itemsUpdateError;
    }
  }

  /**
   * Cuando se marca toda la orden como entregada,
   * todas las prendas pasan a entregadas y la cantidad
   * entregada pasa a ser igual a la cantidad total.
   */
  if (status === "delivered") {
    const { data: items, error: itemsFetchError } = await supabase
      .from("order_items")
      .select("id, quantity")
      .eq("order_id", id);

    if (itemsFetchError) {
      throw itemsFetchError;
    }

    for (const item of items ?? []) {
      const { error } = await supabase
        .from("order_items")
        .update({
          status: "delivered",
          delivered_quantity: item.quantity,
        })
        .eq("id", item.id);

      if (error) {
        throw error;
      }
    }
  }

  const { data, error } = await supabase
    .from("orders")
    .update({
      status,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Actualiza el estado individual de una prenda.
 */
export async function updateOrderItemStatus(itemId: string, status: OrderItemStatus) {
  const { data: item, error: itemError } = await supabase
    .from("order_items")
    .select("id, order_id, quantity, delivered_quantity, status")
    .eq("id", itemId)
    .single();

  if (itemError) {
    throw itemError;
  }

  let deliveredQuantity = Number(item.delivered_quantity ?? 0);

  /**
   * Si la prenda pasa a entregada,
   * se considera entregada toda la cantidad.
   */
  if (status === "delivered") {
    deliveredQuantity = Number(item.quantity);
  }

  /**
   * Si la prenda deja de estar entregada y la cantidad
   * entregada era igual a la cantidad total, reiniciamos
   * la cantidad entregada a 0.
   *
   * Esto aplica, por ejemplo, al pasar de delivered
   * a requires_cleaning.
   */
  if (status !== "delivered" && deliveredQuantity >= Number(item.quantity)) {
    deliveredQuantity = 0;
  }

  const { data, error } = await supabase
    .from("order_items")
    .update({
      status,
      delivered_quantity: deliveredQuantity,
    })
    .eq("id", itemId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  /**
   * Después de modificar una prenda,
   * recalculamos automáticamente la orden.
   */
  await recalculateOrderStatus(item.order_id);

  return data;
}

/**
 * Actualiza la cantidad entregada de una prenda.
 *
 * Permite entregas parciales.
 *
 * Ejemplo:
 *
 * quantity = 5
 * delivered_quantity = 2
 *
 * La prenda queda:
 *
 * - 2 entregadas
 * - 3 pendientes
 * - estado pending
 */
export async function updateOrderItemDeliveredQuantity(itemId: string, deliveredQuantity: number) {
  const { data: item, error: itemError } = await supabase
    .from("order_items")
    .select("id, order_id, quantity, delivered_quantity, status")
    .eq("id", itemId)
    .single();

  if (itemError) {
    throw itemError;
  }

  const quantity = Number(item.quantity);

  /**
   * Aseguramos que la cantidad esté siempre entre:
   *
   * 0 y quantity.
   */
  const safeQuantity = Math.max(0, Math.min(deliveredQuantity, quantity));

  let status: OrderItemStatus;

  /**
   * Toda la cantidad entregada.
   */
  if (safeQuantity === quantity) {
    status = "delivered";
  }

  /**
   * Entrega parcial.
   */
  else if (safeQuantity > 0) {
    status = "pending";
  }

  /**
   * Si estaba marcada como requires_cleaning,
   * conservamos ese estado cuando la cantidad entregada
   * se mantiene en 0.
   */
  else if (item.status === "requires_cleaning") {
    status = "requires_cleaning";
  }

  /**
   * Sin prendas entregadas y sin requerimiento especial.
   */
  else {
    status = "pending";
  }

  const { data, error } = await supabase
    .from("order_items")
    .update({
      delivered_quantity: safeQuantity,
      status,
    })
    .eq("id", itemId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  /**
   * Recalculamos el estado general de la orden.
   */
  await recalculateOrderStatus(item.order_id);

  return data;
}

/**
 * Recalcula automáticamente el estado de la orden
 * según el estado de sus prendas.
 *
 * Prioridad:
 *
 * 1. requires_cleaning
 * 2. delivered
 * 3. pending
 */
export async function recalculateOrderStatus(orderId: string) {
  const { data: items, error } = await supabase
    .from("order_items")
    .select("quantity, delivered_quantity, status")
    .eq("order_id", orderId);

  if (error) {
    throw error;
  }

  if (!items || items.length === 0) {
    return;
  }

  /**
   * Verifica si todas las prendas están completamente entregadas.
   */
  const allDelivered = items.every(
    (item) => Number(item.delivered_quantity ?? 0) >= Number(item.quantity),
  );

  /**
   * Verifica si al menos una prenda requiere
   * otra limpieza.
   */
  const hasCleaningRequired = items.some((item) => item.status === "requires_cleaning");

  let orderStatus: OrderStatus;

  /**
   * requires_cleaning tiene prioridad.
   */
  if (hasCleaningRequired) {
    orderStatus = "requires_cleaning";
  }

  /**
   * Si todas las prendas están entregadas,
   * la orden está entregada.
   */
  else if (allDelivered) {
    orderStatus = "delivered";
  }

  /**
   * En cualquier otro caso, la orden está pendiente.
   */
  else {
    orderStatus = "pending";
  }

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: orderStatus,
    })
    .eq("id", orderId);

  if (updateError) {
    throw updateError;
  }
}
