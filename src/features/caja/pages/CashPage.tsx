import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { useBranch } from "@/hooks/useBranch";
import { closeCashSession, getCashSessions, getSessionMovements, getSessionOrderPayments, openCashSession, reopenCashSession, type CashMovement, type PaymentMethod } from "../services/cash.service";

const money = (value: number) => `Bs ${value.toFixed(2)}`;
const labels: Record<PaymentMethod, string> = { cash: "Efectivo", qr: "QR", transfer: "Transferencia", card: "Tarjeta", other: "Otro" };
type DetailRow = { label: string; date: string; amount: number };

export default function CashPage() {
  const { activeBranch } = useBranch(); const branchId = activeBranch?.id ?? "";
  const location = useLocation(); const navigate = useNavigate(); const state = location.state as { cashMessage?: string; returnTo?: string } | null;
  const [opening, setOpening] = useState(""); const [closing, setClosing] = useState(""); const [reopeningReason, setReopeningReason] = useState(""); const [message, setMessage] = useState<string | null>(state?.cashMessage ?? null);
  const queryClient = useQueryClient();
  const sessions = useQuery({ queryKey: ["cash-sessions", branchId], queryFn: () => getCashSessions(branchId), enabled: Boolean(branchId) });
  const active = sessions.data?.find((session) => session.status === "open");
  const now = new Date(); const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const closedToday = sessions.data?.find((session) => session.business_date === today && session.status === "closed");
  const payments = useQuery({ queryKey: ["cash-order-payments", active?.id], queryFn: () => getSessionOrderPayments(active!.id), enabled: Boolean(active) });
  const movements = useQuery({ queryKey: ["cash-movements", active?.id], queryFn: () => getSessionMovements(active!.id), enabled: Boolean(active) });
  useEffect(() => { if (state?.cashMessage) setMessage(state.cashMessage); }, [state?.cashMessage]);
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ["cash-sessions", branchId] }); queryClient.invalidateQueries({ queryKey: ["cash-readiness", branchId] }); };
  const extraIncome = (movements.data ?? []).filter((item) => item.movement_type === "income");
  const expenses = (movements.data ?? []).filter((item) => item.movement_type === "expense");
  const orderIncome = (payments.data ?? []).reduce((sum, item) => sum + item.amount, 0);
  const otherIncome = extraIncome.reduce((sum, item) => sum + item.amount, 0);
  const totalIncome = orderIncome + otherIncome;
  const totalSum = (active?.opening_cash_amount ?? 0) + totalIncome;
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const balance = (active?.opening_cash_amount ?? 0) + totalIncome - totalExpenses;
  const cashBalance = (active?.opening_cash_amount ?? 0)
    + (payments.data ?? []).filter((item) => item.payment_method === "cash").reduce((sum, item) => sum + item.amount, 0)
    + extraIncome.filter((item) => item.payment_method === "cash").reduce((sum, item) => sum + item.amount, 0)
    - expenses.filter((item) => item.payment_method === "cash").reduce((sum, item) => sum + item.amount, 0);
  const byMethod = useMemo(() => [...(payments.data ?? []), ...extraIncome].reduce<Record<string, number>>((totals, item) => ({ ...totals, [item.payment_method]: (totals[item.payment_method] ?? 0) + item.amount }), {}), [payments.data, extraIncome]);
  useEffect(() => { if (active && closing === "") setClosing(Math.max(0, cashBalance).toFixed(2)); }, [active, cashBalance, closing]);
  async function open() { try { await openCashSession(branchId, Number(opening)); setOpening(""); setMessage("Caja abierta."); refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo abrir la caja."); } }
  async function close() { if (!active) return; try { await closeCashSession(active.id, Number(closing)); setClosing(""); setMessage("Cierre registrado."); refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo cerrar la caja."); } }
  async function reopen() { if (!closedToday || !reopeningReason.trim()) return; if (!window.confirm("¿Desea reabrir la caja de hoy? El cierre anterior quedará registrado en la bitácora.")) return; try { await reopenCashSession(closedToday.id, reopeningReason); setReopeningReason(""); setClosing(""); setMessage("Caja del día reabierta. Registre nuevamente el cierre cuando corresponda."); refresh(); } catch (error) { setMessage(getErrorMessage(error, "No se pudo reabrir la caja.")); } }
  const paymentRows: DetailRow[] = (payments.data ?? []).map((item) => ({ label: `${item.order_number} · ${labels[item.payment_method]}`, date: item.created_at, amount: item.amount }));
  return <section className="space-y-6"><PageHeader title="Caja" subtitle={`Apertura, cierre y detalle diario · ${activeBranch?.name ?? ""}.`} />
    {message && <div className="rounded-lg bg-blue-50 p-4 text-blue-800"><p>{message}</p>{state?.returnTo && <button onClick={() => navigate(state.returnTo!)} className="mt-2 text-sm font-medium underline">Volver a órdenes</button>}</div>}
    {!active && !closedToday && branchId && <Card><h2 className="mb-3 text-lg font-semibold">Abrir caja</h2><div className="flex flex-wrap gap-3"><input type="number" min="0" step="0.01" value={opening} onChange={(event) => setOpening(event.target.value)} placeholder="Monto inicial en efectivo" className="rounded-lg border p-3"/><button onClick={open} disabled={opening === ""} className="rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-50">Abrir caja</button></div></Card>}
    {!active && closedToday && <Card className="border-amber-200 bg-amber-50"><h2 className="mb-1 text-lg font-semibold text-amber-950">Caja de hoy cerrada</h2><p className="mb-4 text-sm text-amber-900">Puede reabrirla si necesita corregir o registrar un movimiento adicional. El cierre anterior quedará en la bitácora.</p><div className="flex flex-wrap gap-3"><input value={reopeningReason} onChange={(event) => setReopeningReason(event.target.value)} placeholder="Motivo de la reapertura" className="min-w-64 flex-1 rounded-lg border bg-white p-3"/><button onClick={reopen} disabled={!reopeningReason.trim()} className="rounded-lg bg-amber-700 px-5 py-2 font-medium text-white disabled:opacity-50">Reabrir caja de hoy</button></div></Card>}
    {active && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6"><Metric label="Monto inicial" value={money(active.opening_cash_amount)} /><Metric label="Monto por órdenes" value={money(orderIncome)} /><Metric label="Otros ingresos" value={money(otherIncome)} /><Metric label="Suma total" value={money(totalSum)} /><Metric label="Monto egresos" value={money(totalExpenses)} /><Metric label="Saldo" value={money(balance)} /></div>
      <Detail title="Ingresos por órdenes" empty="Aún no hay pagos de órdenes en esta caja." rows={paymentRows} />
      <Detail title="Ingresos extra" empty="No hay ingresos extra." rows={extraIncome.map(toMovementRow)} />
      <Detail title="Egresos extra" empty="No hay egresos extra." rows={expenses.map(toMovementRow)} negative />
      <Card><h2 className="mb-3 text-lg font-semibold">Detalle por tipo de ingreso</h2><div className="grid gap-3 sm:grid-cols-5">{Object.keys(byMethod).length === 0 ? <p className="text-sm text-slate-500">No hay ingresos registrados.</p> : Object.entries(byMethod).map(([method, amount]) => <div key={method} className="rounded-lg bg-slate-50 p-3"><p className="text-sm text-slate-500">{labels[method as PaymentMethod] ?? method}</p><p className="font-semibold">{money(amount)}</p></div>)}</div></Card>
      <Card><h2 className="mb-3 text-lg font-semibold">Cerrar caja</h2><p className="mb-3 text-sm text-slate-500">El importe se carga inicialmente con el saldo calculado en efectivo. Ajústelo según el efectivo contado.</p><div className="flex flex-wrap gap-3"><input value={closing} onChange={(event) => setClosing(event.target.value)} type="number" min="0" step="0.01" placeholder="Efectivo contado" className="rounded-lg border p-3"/><button onClick={close} disabled={closing === ""} className="rounded-lg bg-slate-900 px-5 py-2 text-white disabled:opacity-50">Cerrar caja</button></div></Card>
    </>}
    <Card className="overflow-hidden p-0"><table className="min-w-full"><thead className="bg-slate-100"><tr><th className="p-3 text-left">Fecha</th><th className="p-3 text-left">Estado</th><th className="p-3 text-right">Inicial</th><th className="p-3 text-right">Final</th><th className="p-3 text-right">Diferencia</th></tr></thead><tbody>{(sessions.data ?? []).map((session) => <tr className="border-t" key={session.id}><td className="p-3">{session.business_date}</td><td className="p-3">{session.status === "open" ? "Abierta" : "Cerrada"}</td><td className="p-3 text-right">{money(session.opening_cash_amount)}</td><td className="p-3 text-right">{session.closing_cash_amount == null ? "—" : money(session.closing_cash_amount)}</td><td className="p-3 text-right">{session.cash_difference_amount == null ? "—" : money(session.cash_difference_amount)}</td></tr>)}</tbody></table></Card>
  </section>;
}
function Metric({ label, value }: { label: string; value: string }) { return <Card><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></Card>; }
function toMovementRow(item: CashMovement): DetailRow { return { label: `${item.reason} · ${labels[item.payment_method]}`, date: item.created_at, amount: item.amount }; }
function Detail({ title, rows, empty, negative = false }: { title: string; rows: DetailRow[]; empty: string; negative?: boolean }) { return <Card className="overflow-hidden p-0"><div className="border-b bg-slate-50 p-4"><h2 className="font-semibold">{title}</h2></div>{rows.length === 0 ? <p className="p-5 text-sm text-slate-500">{empty}</p> : <table className="min-w-full"><thead className="bg-slate-50 text-sm"><tr><th className="p-3 text-left">Detalle</th><th className="p-3 text-left">Hora</th><th className="p-3 text-right">Monto</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.label}-${index}`} className="border-t"><td className="p-3">{row.label}</td><td className="p-3">{new Date(row.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td><td className={`p-3 text-right font-medium ${negative ? "text-red-700" : "text-green-700"}`}>{negative ? "-" : "+"}{money(row.amount)}</td></tr>)}</tbody></table>}</Card>; }
function getErrorMessage(error: unknown, fallback: string) { return typeof error === "object" && error !== null && "message" in error && typeof error.message === "string" ? error.message : fallback; }
