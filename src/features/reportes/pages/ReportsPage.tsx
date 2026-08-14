import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { useBranches } from "@/features/configuracion/sucursales/hooks/useBranches";
import { getOperationalReport } from "../services/operationalReport.service";

const today = new Date().toLocaleDateString("en-CA");
const money = (value: number) => `Bs ${value.toFixed(2)}`;
export default function ReportsPage() {
  const [date, setDate] = useState(today); const [branchId, setBranchId] = useState("");
  const { data: branches = [] } = useBranches();
  const report = useQuery({ queryKey: ["operational-report", date, branchId], queryFn: () => getOperationalReport(date, branchId || undefined) });
  const data = report.data;
  return <section className="space-y-6"><PageHeader title="Reportes operativos" subtitle="Resultados diarios por sucursal y tipo de pago." />
    <Card><div className="grid gap-4 sm:grid-cols-2"><div><label className="mb-1 block text-sm font-medium">Fecha</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border p-3" /></div><div><label className="mb-1 block text-sm font-medium">Sucursal</label><select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-full rounded-lg border p-3"><option value="">Todas las sucursales</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div></div></Card>
    {report.isLoading && <Card>Cargando reporte...</Card>}{report.error && <Card className="bg-red-100 text-red-700">No se pudo cargar el reporte.</Card>}
    {data && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Ventas cobradas" value={money(data.revenue)} /><Metric label="Órdenes recibidas" value={String(data.orders)} /><Metric label="Prendas recibidas" value={String(data.receivedGarments)} /><Metric label="Prendas entregadas" value={String(data.deliveredGarments)} /><Metric label="Pendientes" value={String(data.pendingGarments)} /><Metric label="Requieren otra limpieza" value={String(data.rewashGarments)} /></div><Card><h2 className="mb-4 text-lg font-semibold">Cobros por tipo de pago</h2><div className="grid gap-3 sm:grid-cols-5">{Object.entries(data.paymentsByMethod).length ? Object.entries(data.paymentsByMethod).map(([method, value]) => <div key={method} className="rounded-lg bg-slate-50 p-3"><p className="capitalize text-slate-500">{method}</p><p className="font-semibold">{money(value)}</p></div>) : <p className="text-slate-500">No existen pagos en esta fecha.</p>}</div></Card></>}
  </section>;
}
function Metric({ label, value }: { label: string; value: string }) { return <Card><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></Card>; }
