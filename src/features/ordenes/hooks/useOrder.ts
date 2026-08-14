import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/infrastructure/supabase/client";

export interface OrderDetailItem {
  id: string;
  garment_type_id: string;
  quantity: number;
  delivered_quantity: number;
  unit_price: number;
  subtotal: number;
  status: string;
  observations: string | null;

  garment_type?: {
    code: string;
    name: string;
  } | null;
}

export interface OrderDetail {
  id: string;
  order_number: string;
  client_id: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  estimated_delivery_at: string | null;
  created_at: string;
  observations: string | null;

  client?: {
    name: string;
    phone: string;
  } | null;

  items: OrderDetailItem[];
}

async function fetchOrder(orderId: string): Promise<OrderDetail> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      order_number,
      client_id,
      status,
      subtotal,
      discount,
      total,
      estimated_delivery_at,
      created_at,
      observations,
      clients (
        name,
        phone
      ),
      order_items (
        id,
        garment_type_id,
        quantity,
        delivered_quantity,
        unit_price,
        subtotal,
        status,
        observations,
        garment_types (
          code,
          name
        )
      )
    `,
    )
    .eq("id", orderId)
    .single();

  if (error) {
    throw error;
  }

  const client = Array.isArray(data.clients) ? (data.clients[0] ?? null) : data.clients;

  const items: OrderDetailItem[] = (data.order_items ?? []).map((item) => ({
    id: item.id,
    garment_type_id: item.garment_type_id,
    quantity: Number(item.quantity),
    delivered_quantity: Number(item.delivered_quantity ?? 0),
    unit_price: Number(item.unit_price),
    subtotal: Number(item.subtotal),
    status: item.status,
    observations: item.observations,

    garment_type: Array.isArray(item.garment_types)
      ? (item.garment_types[0] ?? null)
      : item.garment_types,
  }));

  return {
    id: data.id,
    order_number: data.order_number,
    client_id: data.client_id,
    status: data.status,
    subtotal: Number(data.subtotal),
    discount: Number(data.discount),
    total: Number(data.total),
    estimated_delivery_at: data.estimated_delivery_at,
    created_at: data.created_at,
    observations: data.observations,
    client,
    items,
  };
}

export function useOrder(orderId?: string) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrder(orderId!),
    enabled: Boolean(orderId),
  });
}
