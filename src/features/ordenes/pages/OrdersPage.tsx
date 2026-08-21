import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useOrders } from "../hooks/useOrders";
import { useUpdateOrderStatus } from "../hooks/useOrderMutations";
import type { OrderStatus } from "../services/order.service";
import { useBranch } from "@/hooks/useBranch";
import { useCashReadiness } from "@/features/caja/hooks/useCashReadiness";

function getStatusLabel(status: string) {
  switch (status) {
    case "received":
      return "Recibida";

    case "in_process":
      return "En proceso";

    case "delivered":
      return "Entregada";

    case "unclaimed":
      return "No recogida";

    case "requires_cleaning":
      return "Requiere otra limpieza";


    default:
      return status;
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "received":
      return "bg-blue-100 text-blue-700";

    case "in_process":
      return "bg-yellow-100 text-yellow-700";

    case "delivered":
      return "bg-green-100 text-green-700";

    case "unclaimed":
      return "bg-slate-200 text-slate-700";

    case "requires_cleaning":
      return "bg-red-100 text-red-700";


    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getNextAction(status: string) {
  switch (status) {
    case "received":
      return {
        label: "Pasar a proceso",
        nextStatus: "in_process" as OrderStatus,
      };

    case "in_process":
      return {
        label: "Intentar entrega",
        nextStatus: "delivered" as OrderStatus,
      };

    default:
      return null;
  }
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const { activeBranch } = useBranch();
  const { data: cashReadiness } = useCashReadiness(activeBranch?.id);
  const { data: orders = [], isLoading, error } = useOrders(activeBranch?.id);

  const updateStatusMutation = useUpdateOrderStatus();
  const [statusFilter, setStatusFilter] = useState<"pending" | "received" | "in_process" | "delivered_today" | "due_today">("due_today");
  const today = new Date().toLocaleDateString("en-CA");
  const filteredOrders = statusFilter === "pending"
    ? orders.filter((order) => order.status === "received" || order.status === "in_process")
    : statusFilter === "due_today"
      ? orders.filter((order) => order.estimated_delivery_at?.slice(0, 10) === today && (order.status === "received" || order.status === "in_process"))
      : statusFilter === "delivered_today"
        ? orders.filter((order) => order.status === "delivered" && (order.delivered_at ?? order.created_at).slice(0, 10) === today)
      : orders.filter((order) => order.status === statusFilter);

  async function handleChangeStatus(id: string, status: OrderStatus) {
    if (status === "delivered" && !cashReadiness?.ready) { navigate("/caja", { state: { cashMessage: cashReadiness?.message ?? "Debe abrir la caja antes de entregar.", returnTo: "/ordenes/listado" } }); return; }
    try {
      await updateStatusMutation.mutateAsync({
        id,
        status,
      });
    } catch (error) {
      console.error("Error al actualizar el estado:", error);

      const detail = typeof error === "object" && error !== null
        ? [
            "message" in error && typeof error.message === "string" ? error.message : null,
            "details" in error && typeof error.details === "string" ? error.details : null,
            "hint" in error && typeof error.hint === "string" ? `Sugerencia: ${error.hint}` : null,
            "code" in error && typeof error.code === "string" ? `Código: ${error.code}` : null,
          ].filter(Boolean).join("\n")
        : error instanceof Error ? error.message : "";

      alert(detail || "No se pudo actualizar el estado de la orden.");
    }
  }

  if (isLoading) {
    return <div className="rounded-xl bg-white p-6 shadow-sm">Cargando órdenes...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-100 p-6 text-red-700">Error al cargar las órdenes.</div>
    );
  }

  return (
    <section className="space-y-6">
      {/* Encabezado */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Órdenes</h1>

          <p className="mt-1 text-slate-500">Seguimiento de las órdenes de lavandería.</p>
        </div>

        <Link
          to="/ordenes"
          className="rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700"
        >
          Nueva recepción
        </Link>
      </div>
      {cashReadiness && !cashReadiness.ready && <div className="rounded-lg bg-amber-50 p-4 text-amber-800">{cashReadiness.message}</div>}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-4 shadow-sm">
        <span className="mr-2 text-sm font-medium text-slate-700">Estado:</span>
        {([
          ["pending", "Pendientes"],
          ["received", "Creadas"],
          ["in_process", "En proceso"],
          ["due_today", "Por entregar hoy"],
          ["delivered_today", "Entregadas hoy"],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setStatusFilter(value)} className={`rounded-lg px-4 py-2 text-sm font-medium ${statusFilter === value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>{label}</button>
        ))}
      </div>

      {/* Tabla */}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No existen órdenes para el filtro seleccionado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left">Orden</th>

                  <th className="px-4 py-3 text-left">Cliente</th>

                  <th className="px-4 py-3 text-left">Fecha</th>

                  <th className="px-4 py-3 text-left">Entrega</th>

                  <th className="px-4 py-3 text-center">Estado</th>

                  <th className="px-4 py-3 text-right">Total</th>

                  <th className="px-4 py-3 text-right">Monto pagado</th>

                  <th className="px-4 py-3 text-right">Saldo</th>

                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => {
                  const action = getNextAction(order.status);
                  const balance = Math.max(0, Number(order.total) - order.paid_amount);

                  return (
                    <tr key={order.id} className="border-t hover:bg-slate-50">
                      {/* Número de orden */}

                      <td className="px-4 py-3 font-semibold">
                        <Link
                          to={`/ordenes/${order.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {order.order_number}
                        </Link>
                      </td>

                      {/* Cliente */}

                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {order.client?.name ?? "Cliente no disponible"}
                        </div>

                        {order.client?.phone && (
                          <div className="text-sm text-slate-500">{order.client.phone}</div>
                        )}
                      </td>

                      {/* Fecha */}

                      <td className="px-4 py-3 text-sm">
                        {new Date(order.created_at).toLocaleDateString("es-BO")}
                      </td>

                      {/* Entrega */}

                      <td className="px-4 py-3 text-sm">
                        {order.estimated_delivery_at
                          ? new Date(order.estimated_delivery_at).toLocaleDateString("es-BO")
                          : "-"}
                      </td>

                      {/* Estado */}

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            order.status,
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </td>

                      {/* Total */}

                      <td className="px-4 py-3 text-right font-semibold">
                        Bs {Number(order.total).toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-right text-green-700">
                        Bs {order.paid_amount.toFixed(2)}
                      </td>

                      <td className={`px-4 py-3 text-right font-semibold ${balance > 0 ? "text-amber-700" : "text-green-700"}`}>
                        Bs {balance.toFixed(2)}
                      </td>

                      {/* Acción */}

                      <td className="px-4 py-3 text-center">
                        {action ? (
                          <button
                            type="button"
                            disabled={updateStatusMutation.isPending || (action.nextStatus === "delivered" && !cashReadiness?.ready)}
                            onClick={() => handleChangeStatus(order.id, action.nextStatus)}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updateStatusMutation.isPending ? "Actualizando..." : action.label}
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400">Finalizada</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
