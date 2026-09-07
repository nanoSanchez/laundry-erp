import { supabase } from "@/infrastructure/supabase/client";

export type PaymentMethod = "cash" | "qr" | "transfer" | "card" | "other";
export interface CashSession { id: string; branch_id: string; business_date: string; status: "open" | "closed"; opening_cash_amount: number; expected_cash_amount: number | null; closing_cash_amount: number | null; cash_difference_amount: number | null; payment_totals: Record<string, number> | null; opening_notes: string | null; closing_notes: string | null; opened_at: string; closed_at: string | null; }
export interface CashMovement { id: string; cash_session_id: string; movement_type: "income" | "expense"; payment_method: PaymentMethod; amount: number; reason: string; created_at: string; }
export interface CashOrderPayment { id: string; amount: number; payment_method: PaymentMethod; created_at: string; order_number: string; }

export async function getCashSessions(branchId: string) {
  const { data, error } = await supabase.from("cash_sessions").select("*").eq("branch_id", branchId).order("opened_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toSession);
}
export async function openCashSession(branchId: string, openingCashAmount: number, openingNotes?: string) {
  const { data, error } = await supabase.from("cash_sessions").insert({ branch_id: branchId, opening_cash_amount: openingCashAmount, opening_notes: openingNotes || null }).select().single();
  if (error) throw error;
  return toSession(data);
}
export async function closeCashSession(id: string, closingCashAmount: number, notes?: string) {
  const { data, error } = await supabase.rpc("close_cash_session", { p_session_id: id, p_closing_cash_amount: closingCashAmount, p_closing_notes: notes || null });
  if (error) throw error;
  return toSession(data);
}
export async function reopenCashSession(id: string, reason: string) {
  const { data, error } = await supabase.rpc("reopen_cash_session", { p_session_id: id, p_reason: reason.trim() });
  if (error) throw error;
  return toSession(data);
}
export async function getSessionMovements(id: string) {
  const { data, error } = await supabase.from("cash_movements").select("*").eq("cash_session_id", id).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((item) => ({ ...item, amount: Number(item.amount) })) as CashMovement[];
}
export async function addCashMovement(input: Omit<CashMovement, "id" | "created_at"> & { branch_id: string; reason: string }) {
  const { error } = await supabase.from("cash_movements").insert(input);
  if (error) throw error;
}
export async function getSessionPaymentTotals(id: string): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("payments").select("payment_method, amount").eq("cash_session_id", id);
  if (error) throw error;
  return (data ?? []).reduce<Record<string, number>>((totals, payment) => ({ ...totals, [payment.payment_method]: (totals[payment.payment_method] ?? 0) + Number(payment.amount) }), {});
}
export async function getSessionOrderPayments(id: string): Promise<CashOrderPayment[]> {
  const { data, error } = await supabase.from("payments").select("id, amount, payment_method, created_at, order:orders(order_number)").eq("cash_session_id", id).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((payment) => ({ id: payment.id, amount: Number(payment.amount), payment_method: payment.payment_method as PaymentMethod, created_at: payment.created_at, order_number: payment.order?.[0]?.order_number ?? "Orden" }));
}
function toSession(data: Record<string, unknown>): CashSession { return { ...data, opening_cash_amount: Number(data.opening_cash_amount), expected_cash_amount: data.expected_cash_amount == null ? null : Number(data.expected_cash_amount), closing_cash_amount: data.closing_cash_amount == null ? null : Number(data.closing_cash_amount), cash_difference_amount: data.cash_difference_amount == null ? null : Number(data.cash_difference_amount) } as CashSession; }
