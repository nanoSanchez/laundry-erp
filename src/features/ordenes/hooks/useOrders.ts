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
  paid_amount: number;
  estimated_delivery_at: string | null;
  delivered_at: string | null;
  created_at: string;
  observations: string | null;
  branch_id: string;

  client?: {
    name: string;
    phone: string;
  } | null;
}

async function fetchOrders(branchId: string): Promise<Order[]> {
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
      delivered_at,
      created_at,
      observations,
      branch_id,
      payments ( amount ),
      clients (
        name,
        phone
      )
    `,
    )
    .eq("branch_id", branchId)
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
    paid_amount: (order.payments ?? []).reduce((sum: number, payment: { amount: number | string }) => sum + Number(payment.amount), 0),
    estimated_delivery_at: order.estimated_delivery_at,
    delivered_at: order.delivered_at,
    created_at: order.created_at,
    observations: order.observations,
    branch_id: order.branch_id,

    client: Array.isArray(order.clients) ? (order.clients[0] ?? null) : order.clients,
  })) as Order[];
}

export function useOrders(branchId?: string) {
  return useQuery({
    queryKey: ["orders", branchId],
    queryFn: () => fetchOrders(branchId!),
    enabled: Boolean(branchId),
    staleTime: 1000 * 30,
  });
}
