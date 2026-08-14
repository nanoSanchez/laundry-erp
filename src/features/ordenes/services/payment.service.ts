import { supabase } from "@/infrastructure/supabase/client";

export type PaymentMethod = "cash" | "qr" | "transfer" | "card";

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePayment {
  order_id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
}

/**
 * Obtiene todos los pagos de una orden.
 */
export async function getOrderPayments(orderId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}

/**
 * Calcula el total pagado de una orden.
 */
export async function getOrderPaidAmount(orderId: string): Promise<number> {
  const payments = await getOrderPayments(orderId);

  return payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
}

/**
 * Registra un nuevo pago.
 *
 * No permite:
 * - importes menores o iguales a cero
 * - pagos superiores al saldo pendiente
 */
export async function createPayment(payment: CreatePayment): Promise<Payment> {
  const { order_id, amount, payment_method, reference, notes } = payment;

  const safeAmount = Number(amount);

  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    throw new Error("El importe del pago debe ser mayor a cero.");
  }

  /**
   * Obtenemos el total de la orden.
   */
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, total")
    .eq("id", order_id)
    .single();

  if (orderError) {
    throw orderError;
  }

  /**
   * Obtenemos los pagos existentes.
   */
  const currentPayments = await getOrderPayments(order_id);

  const paidAmount = currentPayments.reduce(
    (sum, currentPayment) => sum + Number(currentPayment.amount),
    0,
  );

  const orderTotal = Number(order.total);

  const balance = Math.max(0, orderTotal - paidAmount);

  /**
   * No permitimos pagar más que el saldo.
   */
  if (safeAmount > balance) {
    throw new Error(`El importe supera el saldo pendiente de Bs ${balance.toFixed(2)}.`);
  }

  /**
   * Registramos el pago.
   */
  const { data, error } = await supabase
    .from("payments")
    .insert({
      order_id,
      amount: safeAmount,
      payment_method,
      reference: reference ?? null,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
