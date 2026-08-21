import { supabase } from "@/infrastructure/supabase/client";

export type OrderStatus = "received" | "in_process" | "delivered" | "unclaimed";
export type OrderItemStatus = "received" | "delivered" | "requires_cleaning";
export interface CreateOrderItem { garment_type_id: string; quantity: number; unit_price: number; subtotal: number; observations?: string; }
export interface CreateOrder { branch_id: string; client_id: string; order_number: string; estimated_delivery_at?: string | null; observations?: string | null; subtotal: number; discount: number; total: number; items: CreateOrderItem[]; }

export async function createOrder(order: CreateOrder) {
  const { items, ...header } = order;
  const { data: createdOrder, error: orderError } = await supabase.from("orders").insert({ ...header, estimated_delivery_at: header.estimated_delivery_at ?? null, observations: header.observations ?? null, status: "received" }).select().single();
  if (orderError) throw orderError;
  const { error: itemsError } = await supabase.from("order_items").insert(items.map((item) => ({ ...item, order_id: createdOrder.id, delivered_quantity: 0, observations: item.observations ?? null, status: "received" })));
  if (itemsError) { await supabase.from("orders").delete().eq("id", createdOrder.id); throw itemsError; }
  return createdOrder;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const { data, error } = await supabase.from("orders").update({ status }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function updateOrderItemStatus(itemId: string, status: OrderItemStatus) {
  const { data: item, error: itemError } = await supabase.from("order_items").select("id, quantity, status").eq("id", itemId).single();
  if (itemError) throw itemError;
  const delivered_quantity = status === "delivered" ? Number(item.quantity) : 0;
  const { data, error } = await supabase.from("order_items").update({ status, delivered_quantity }).eq("id", itemId).select().single();
  if (error) throw error;
  return data;
}

/** Compatibilidad con entregas por cantidad: una prenda conserva estado Recibida hasta entregar toda la línea. */
export async function updateOrderItemDeliveredQuantity(itemId: string, deliveredQuantity: number) {
  const { data: item, error: itemError } = await supabase.from("order_items").select("quantity, status").eq("id", itemId).single();
  if (itemError) throw itemError;
  const quantity = Number(item.quantity); const safeQuantity = Math.max(0, Math.min(deliveredQuantity, quantity));
  const status: OrderItemStatus = safeQuantity === quantity ? "delivered" : item.status === "requires_cleaning" ? "requires_cleaning" : "received";
  const { data, error } = await supabase.from("order_items").update({ delivered_quantity: safeQuantity, status }).eq("id", itemId).select().single();
  if (error) throw error;
  return data;
}
