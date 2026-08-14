import { useQuery } from "@tanstack/react-query";
import Card from "@/components/ui/Card";
import { getOperationalReport } from "@/features/reportes/services/operationalReport.service";

const today = new Date().toLocaleDateString("en-CA");
export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard-daily", today], queryFn: () => getOperationalReport(today) });
  if (isLoading) return <Card>Cargando el movimiento diario...</Card>;
  if (error || !data) return <Card className="bg-red-100 text-red-700">No se pudo cargar el movimiento diario.</Card>;
  const cards = [
    { title: "Órdenes de hoy", value: String(data.orders) }, { title: "Prendas recibidas", value: String(data.receivedGarments) },
    { title: "Ventas cobradas", value: `Bs ${data.revenue.toFixed(2)}` }, { title: "Pendientes de entrega", value: String(data.pendingGarments) },
  ];
  return <section className="space-y-6"><div><h2 className="text-3xl font-bold text-slate-800">Dashboard</h2><p className="mt-1 text-slate-500">Movimiento diario consolidado de todas las sucursales.</p></div>
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <Card key={card.title}><p className="text-sm text-slate-500">{card.title}</p><h3 className="mt-3 text-3xl font-bold text-slate-800">{card.value}</h3></Card>)}</div>
    <Card><h3 className="mb-4 text-lg font-semibold">Alertas operativas</h3><div className="grid gap-4 sm:grid-cols-2"><p><span className="font-semibold">Requieren otra limpieza:</span> {data.rewashGarments}</p><p><span className="font-semibold">Prendas entregadas hoy:</span> {data.deliveredGarments}</p></div></Card>
  </section>;
}
