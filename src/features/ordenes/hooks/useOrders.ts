import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/infrastructure/supabase/client";

export interface Order {
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
}

async function fetchOrders(): Promise<Order[]> {
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
      )
    `,
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return (data ?? []).map((order) => ({
    id: order.id,
    order_number: order.order_number,
    client_id: order.client_id,
    status: order.status,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    total: Number(order.total),
    estimated_delivery_at: order.estimated_delivery_at,
    created_at: order.created_at,
    observations: order.observations,

    client: Array.isArray(order.clients) ? (order.clients[0] ?? null) : order.clients,
  })) as Order[];
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    staleTime: 1000 * 30,
  });
}
