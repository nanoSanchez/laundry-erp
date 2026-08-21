import { useQuery } from "@tanstack/react-query";

import Card from "@/components/ui/Card";
import { useBranch } from "@/hooks/useBranch";
import { getOperationalReport, type OperationalReport } from "@/features/reportes/services/operationalReport.service";

const today = new Date().toLocaleDateString("en-CA");
const money = (value: number) => `Bs ${value.toFixed(2)}`;

export default function DashboardPage() {
  const { activeBranch, branches, isGeneralAdmin } = useBranch();
  const reportQuery = useQuery({
    queryKey: ["dashboard-daily", today, activeBranch?.id, isGeneralAdmin],
    queryFn: () => getOperationalReport(today, isGeneralAdmin ? undefined : activeBranch?.id),
    enabled: Boolean(activeBranch),
  });
  const branchReportsQuery = useQuery({
    queryKey: ["dashboard-branch-breakdown", today, branches.map((branch) => branch.id).join(",")],
    queryFn: async () => Promise.all(branches.map(async (branch) => ({ branch, report: await getOperationalReport(today, branch.id) }))),
    enabled: isGeneralAdmin && branches.length > 0,
  });

  if (reportQuery.isLoading) return <Card>Cargando el movimiento diario...</Card>;
  if (reportQuery.error || !reportQuery.data) return <Card className="bg-red-100 text-red-700">No se pudo cargar el movimiento diario.</Card>;
  const data = reportQuery.data;
  return <section className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-3xl font-bold text-slate-800">Dashboard</h2><p className="mt-1 text-slate-500">Movimiento diario · {today}</p></div><div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900"><span className="text-blue-700">Sucursal activa: </span><strong>{activeBranch?.name}</strong> <span className="text-blue-700">({activeBranch?.code})</span></div></div>
    <DashboardMetrics data={data} />
    <Card><h3 className="mb-4 text-lg font-semibold">Alertas operativas de {activeBranch?.name}</h3><div className="grid gap-4 sm:grid-cols-2"><p><span className="font-semibold">Requieren otra limpieza:</span> {data.rewashGarments}</p><p><span className="font-semibold">Prendas entregadas hoy:</span> {data.deliveredGarments}</p></div></Card>
    {isGeneralAdmin && <BranchBreakdown loading={branchReportsQuery.isLoading} rows={branchReportsQuery.data ?? []} />}
  </section>;
}

function DashboardMetrics({ data }: { data: OperationalReport }) {
  const cards = [{ title: "Órdenes de hoy", value: String(data.orders) }, { title: "Prendas recibidas", value: String(data.receivedGarments) }, { title: "Ventas cobradas", value: money(data.revenue) }, { title: "Pendientes de entrega", value: String(data.pendingGarments) }];
  return <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <Card key={card.title}><p className="text-sm text-slate-500">{card.title}</p><h3 className="mt-3 text-3xl font-bold text-slate-800">{card.value}</h3></Card>)}</div>;
}

function BranchBreakdown({ loading, rows }: { loading: boolean; rows: { branch: { id: string; name: string; code: string }; report: OperationalReport }[] }) {
  return <Card className="overflow-hidden p-0"><div className="border-b p-6"><h3 className="text-lg font-semibold">Resumen diario por sucursal</h3><p className="mt-1 text-sm text-slate-500">Vista disponible solo para el administrador general.</p></div>{loading ? <p className="p-6 text-slate-500">Cargando sucursales...</p> : <div className="overflow-x-auto"><table className="min-w-full"><thead className="bg-slate-100"><tr><th className="p-3 text-left">Sucursal</th><th className="p-3 text-right">Ventas</th><th className="p-3 text-right">Órdenes</th><th className="p-3 text-right">Recibidas</th><th className="p-3 text-right">Entregadas</th><th className="p-3 text-right">Pendientes</th></tr></thead><tbody>{rows.map(({ branch, report }) => <tr key={branch.id} className="border-t"><td className="p-3"><p className="font-medium">{branch.name}</p><p className="text-sm text-slate-500">{branch.code}</p></td><td className="p-3 text-right">{money(report.revenue)}</td><td className="p-3 text-right">{report.orders}</td><td className="p-3 text-right">{report.receivedGarments}</td><td className="p-3 text-right">{report.deliveredGarments}</td><td className="p-3 text-right">{report.pendingGarments}</td></tr>)}</tbody></table></div>}</Card>;
}
