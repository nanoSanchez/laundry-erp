import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { useBranches } from "@/features/configuracion/sucursales/hooks/useBranches";
import { addCashMovement, closeCashSession, getCashSessions, getSessionMovements, getSessionPaymentTotals, openCashSession, type CashSession, type PaymentMethod } from "../services/cash.service";

const money = (value: number) => `Bs ${value.toFixed(2)}`;
const methodLabels: Record<string, string> = { cash: "Efectivo", qr: "QR", transfer: "Transferencia", card: "Tarjeta", other: "Otro" };

export default function CashPage() {
  const { data: branches = [] } = useBranches();
  const [branchId, setBranchId] = useState("");
  const [opening, setOpening] = useState(""); const [closing, setClosing] = useState(""); const [reason, setReason] = useState(""); const [amount, setAmount] = useState(""); const [type, setType] = useState<"income" | "expense">("expense"); const [message, setMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  useEffect(() => { if (!branchId && branches[0]) setBranchId(branches[0].id); }, [branches, branchId]);
  const sessionsQuery = useQuery({ queryKey: ["cash-sessions", branchId], queryFn: () => getCashSessions(branchId), enabled: Boolean(branchId) });
  const active = sessionsQuery.data?.find((session) => session.status === "open");
  const movementQuery = useQuery({ queryKey: ["cash-movements", active?.id], queryFn: () => getSessionMovements(active!.id), enabled: Boolean(active) });
  const paymentQuery = useQuery({ queryKey: ["cash-payments", active?.id], queryFn: () => getSessionPaymentTotals(active!.id), enabled: Boolean(active) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["cash-sessions", branchId] });
  const expected = active ? active.opening_cash_amount + (paymentQuery.data?.cash ?? 0) + (movementQuery.data ?? []).filter((m) => m.payment_method === "cash").reduce((sum, m) => sum + (m.movement_type === "income" ? m.amount : -m.amount), 0) : 0;
  async function open() { try { await openCashSession(branchId, Number(opening)); setOpening(""); setMessage("Caja abierta."); refresh(); } catch (e) { setMessage(e instanceof Error ? e.message : "No se pudo abrir la caja."); } }
  async function close() { if (!active) return; try { await closeCashSession(active.id, Number(closing)); setClosing(""); setMessage("Cierre registrado."); refresh(); } catch (e) { setMessage(e instanceof Error ? e.message : "No se pudo cerrar la caja."); } }
  async function registerMovement() { if (!active) return; try { await addCashMovement({ cash_session_id: active.id, branch_id: branchId, movement_type: type, payment_method: "cash" as PaymentMethod, amount: Number(amount), reason }); setAmount(""); setReason(""); await queryClient.invalidateQueries({ queryKey: ["cash-movements", active.id] }); } catch (e) { setMessage(e instanceof Error ? e.message : "No se pudo registrar el movimiento."); } }
  return <section className="space-y-6"><PageHeader title="Caja" subtitle="Apertura, movimientos y cierre diario por sucursal." />
    <Card><label className="mb-2 block text-sm font-medium">Sucursal</label><select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-full max-w-md rounded-lg border p-3"><option value="">Seleccione una sucursal</option>{branches.filter((b) => b.is_active).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Card>
    {message && <p className="rounded-lg bg-blue-50 p-3 text-blue-800">{message}</p>}
    {!active && branchId && <Card><h2 className="mb-3 text-lg font-semibold">Abrir caja</h2><div className="flex flex-wrap gap-3"><input type="number" min="0" step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="Monto inicial en efectivo" className="rounded-lg border p-3" /><button onClick={open} disabled={!opening} className="rounded-lg bg-blue-600 px-5 py-2 text-white disabled:opacity-50">Abrir caja</button></div></Card>}
    {active && <><div className="grid gap-4 sm:grid-cols-3"><Metric label="Monto inicial" value={money(active.opening_cash_amount)} /><Metric label="Efectivo esperado" value={money(expected)} /><Metric label="Pagos del día" value={money(Object.values(paymentQuery.data ?? {}).reduce((sum, item) => sum + item, 0))} /></div>
      <Card><h2 className="mb-3 text-lg font-semibold">Pagos por tipo</h2><div className="grid gap-3 sm:grid-cols-5">{Object.entries(paymentQuery.data ?? {}).map(([method, total]) => <div key={method} className="rounded-lg bg-slate-50 p-3"><p className="text-sm text-slate-500">{methodLabels[method] ?? method}</p><p className="font-semibold">{money(total)}</p></div>)}</div></Card>
      <Card><h2 className="mb-3 text-lg font-semibold">Movimiento manual</h2><div className="flex flex-wrap gap-3"><select value={type} onChange={(e) => setType(e.target.value as "income" | "expense")} className="rounded-lg border p-3"><option value="expense">Egreso</option><option value="income">Ingreso</option></select><input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0.01" step="0.01" placeholder="Monto" className="rounded-lg border p-3" /><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo" className="min-w-56 rounded-lg border p-3" /><button onClick={registerMovement} disabled={!amount || !reason} className="rounded-lg border px-5 py-2 disabled:opacity-50">Registrar</button></div></Card>
      <Card><h2 className="mb-3 text-lg font-semibold">Cerrar caja</h2><p className="mb-3 text-sm text-slate-500">Cuenta el efectivo físico. La diferencia quedará registrada y no se podrá modificar el cierre.</p><div className="flex flex-wrap gap-3"><input value={closing} onChange={(e) => setClosing(e.target.value)} type="number" min="0" step="0.01" placeholder="Efectivo contado" className="rounded-lg border p-3" /><button onClick={close} disabled={!closing} className="rounded-lg bg-slate-900 px-5 py-2 text-white disabled:opacity-50">Cerrar caja</button></div></Card>
    </>}
    <Card className="overflow-hidden p-0"><table className="min-w-full"><thead className="bg-slate-100"><tr><th className="p-3 text-left">Fecha</th><th className="p-3 text-left">Estado</th><th className="p-3 text-right">Inicial</th><th className="p-3 text-right">Final</th><th className="p-3 text-right">Diferencia</th></tr></thead><tbody>{(sessionsQuery.data ?? []).map((s: CashSession) => <tr className="border-t" key={s.id}><td className="p-3">{s.business_date}</td><td className="p-3">{s.status === "open" ? "Abierta" : "Cerrada"}</td><td className="p-3 text-right">{money(s.opening_cash_amount)}</td><td className="p-3 text-right">{s.closing_cash_amount == null ? "—" : money(s.closing_cash_amount)}</td><td className="p-3 text-right">{s.cash_difference_amount == null ? "—" : money(s.cash_difference_amount)}</td></tr>)}</tbody></table></Card>
  </section>;
}
function Metric({ label, value }: { label: string; value: string }) { return <Card><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></Card>; }
