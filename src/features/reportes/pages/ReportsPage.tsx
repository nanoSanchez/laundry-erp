import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { useBranch } from "@/hooks/useBranch";
import { useOrders } from "@/features/ordenes/hooks/useOrders";

const today = new Date().toLocaleDateString("en-CA");
const money = (amount: number) => `Bs ${amount.toFixed(2)}`;

export default function ReportsPage() {
  const { activeBranch } = useBranch();
  const { data: orders = [], isLoading, error } = useOrders(activeBranch?.id);
  const [historyType, setHistoryType] = useState<"delivered" | "unclaimed">("delivered");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const history = useMemo(() => orders.filter((order) => {
    if (historyType === "unclaimed") return order.status === "unclaimed";
    const date = (order.delivered_at ?? order.created_at).slice(0, 10);
    return order.status === "delivered" && date < today && (!from || date >= from) && (!to || date <= to);
  }), [orders, historyType, from, to]);

  return <section className="space-y-6"><PageHeader title="Historial de órdenes" subtitle={`Consulta histórica de ${activeBranch?.name ?? "la sucursal"}.`} />
    <Card><div className="flex flex-wrap items-end gap-4"><div><label className="mb-1 block text-sm font-medium">Desde</label><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="rounded-lg border p-3" /></div><div><label className="mb-1 block text-sm font-medium">Hasta</label><input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="rounded-lg border p-3" /></div><button type="button" onClick={() => { setFrom(""); setTo(""); }} className="rounded-lg border px-4 py-3 text-sm font-medium hover:bg-slate-50">Limpiar fechas</button></div></Card>
    <Card className="overflow-hidden p-0"><div className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50 p-4"><div><h2 className="font-semibold">Órdenes históricas</h2><p className="text-sm text-slate-500">Las entregadas hoy se mantienen en la bandeja operativa.</p></div><div className="flex gap-2"><button type="button" onClick={() => setHistoryType("delivered")} className={`rounded-lg px-3 py-2 text-sm font-medium ${historyType === "delivered" ? "bg-blue-600 text-white" : "border bg-white hover:bg-slate-50"}`}>Entregadas anteriores</button><button type="button" onClick={() => setHistoryType("unclaimed")} className={`rounded-lg px-3 py-2 text-sm font-medium ${historyType === "unclaimed" ? "bg-blue-600 text-white" : "border bg-white hover:bg-slate-50"}`}>No recogidas</button></div></div>
      {isLoading ? <p className="p-6 text-center text-slate-500">Cargando historial...</p> : error ? <p className="p-6 text-center text-red-700">No se pudo cargar el historial.</p> : history.length === 0 ? <p className="p-6 text-center text-slate-500">No existen órdenes para los filtros seleccionados.</p> : <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-slate-100 text-sm"><tr><th className="p-3 text-left">Orden</th><th className="p-3 text-left">Cliente</th><th className="p-3 text-left">Fecha de entrega</th><th className="p-3 text-left">Estado</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Pagado</th><th className="p-3 text-right">Saldo</th></tr></thead><tbody>{history.map((order) => { const balance = Math.max(0, order.total - order.paid_amount); return <tr key={order.id} className="border-t hover:bg-slate-50"><td className="p-3 font-medium"><Link to={`/ordenes/${order.id}`} className="text-blue-600 hover:underline">{order.order_number}</Link></td><td className="p-3">{order.client?.name ?? "Cliente no disponible"}</td><td className="p-3">{order.status === "unclaimed" ? "—" : new Date(order.delivered_at ?? order.created_at).toLocaleDateString("es-BO")}</td><td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${order.status === "unclaimed" ? "bg-slate-200 text-slate-700" : "bg-green-100 text-green-700"}`}>{order.status === "unclaimed" ? "No recogida" : "Entregada"}</span></td><td className="p-3 text-right">{money(order.total)}</td><td className="p-3 text-right text-green-700">{money(order.paid_amount)}</td><td className={`p-3 text-right font-medium ${balance > 0 ? "text-amber-700" : "text-green-700"}`}>{money(balance)}</td></tr>; })}</tbody></table></div>}
    </Card>
  </section>;
}
