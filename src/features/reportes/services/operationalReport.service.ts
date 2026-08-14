import { supabase } from "@/infrastructure/supabase/client";

export interface OperationalReport { orders: number; receivedGarments: number; deliveredGarments: number; rewashGarments: number; pendingGarments: number; revenue: number; paymentsByMethod: Record<string, number>; }

export async function getOperationalReport(date: string, branchId?: string): Promise<OperationalReport> {
  const start = new Date(`${date}T00:00:00`).toISOString();
  const end = new Date(`${date}T23:59:59.999`).toISOString();
  let ordersQuery = supabase.from("orders").select("id").gte("created_at", start).lte("created_at", end);
  let paymentsQuery = supabase.from("payments").select("amount, payment_method").gte("created_at", start).lte("created_at", end);
  if (branchId) { ordersQuery = ordersQuery.eq("branch_id", branchId); paymentsQuery = paymentsQuery.eq("branch_id", branchId); }
  const [{ data: orders, error: ordersError }, { data: payments, error: paymentsError }] = await Promise.all([ordersQuery, paymentsQuery]);
  if (ordersError) throw ordersError; if (paymentsError) throw paymentsError;
  const orderIds = (orders ?? []).map((order) => order.id);
  if (!orderIds.length) return { orders: 0, receivedGarments: 0, deliveredGarments: 0, rewashGarments: 0, pendingGarments: 0, revenue: 0, paymentsByMethod: {} };
  const { data: items, error: itemsError } = await supabase.from("order_items").select("quantity, delivered_quantity, status").in("order_id", orderIds);
  if (itemsError) throw itemsError;
  const report = (items ?? []).reduce((acc, item) => ({ ...acc, receivedGarments: acc.receivedGarments + Number(item.quantity), deliveredGarments: acc.deliveredGarments + Number(item.delivered_quantity ?? 0), rewashGarments: acc.rewashGarments + (item.status === "requires_cleaning" ? Number(item.quantity) : 0), pendingGarments: acc.pendingGarments + (item.status !== "delivered" ? Math.max(0, Number(item.quantity) - Number(item.delivered_quantity ?? 0)) : 0) }), { receivedGarments: 0, deliveredGarments: 0, rewashGarments: 0, pendingGarments: 0 });
  const paymentsByMethod = (payments ?? []).reduce<Record<string, number>>((totals, payment) => ({ ...totals, [payment.payment_method]: (totals[payment.payment_method] ?? 0) + Number(payment.amount) }), {});
  return { orders: orderIds.length, ...report, revenue: Object.values(paymentsByMethod).reduce((sum, value) => sum + value, 0), paymentsByMethod };
}
