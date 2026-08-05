export default function DashboardPage() {
  const cards = [
    {
      title: "Órdenes de hoy",
      value: "0",
    },
    {
      title: "Prendas recibidas",
      value: "0",
    },
    {
      title: "Ventas del día",
      value: "Bs 0.00",
    },
    {
      title: "Pendientes de entrega",
      value: "0",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Dashboard</h2>

        <p className="mt-1 text-slate-500">Bienvenido al sistema Laundry ERP</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className="rounded-xl bg-white p-6 shadow-sm border">
            <p className="text-sm text-slate-500">{card.title}</p>

            <h3 className="mt-3 text-3xl font-bold text-slate-800">{card.value}</h3>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Actividad reciente</h3>

        <p className="text-slate-500">Aún no existen movimientos registrados.</p>
      </div>
    </div>
  );
}
