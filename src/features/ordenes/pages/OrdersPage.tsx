import { Link } from "react-router-dom";

import { useOrders } from "../hooks/useOrders";
import { useUpdateOrderStatus } from "../hooks/useOrderMutations";
import type { OrderStatus } from "../services/order.service";

function getStatusLabel(status: string) {
  switch (status) {
    case "received":
      return "Recibida";

    case "pending":
      return "Pendiente";

    case "delivered":
      return "Entregada";

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

    case "pending":
      return "bg-yellow-100 text-yellow-700";

    case "delivered":
      return "bg-green-100 text-green-700";

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
        label: "Pasar a pendiente",
        nextStatus: "pending" as OrderStatus,
      };

    case "pending":
      return {
        label: "Marcar entregada",
        nextStatus: "delivered" as OrderStatus,
      };

    case "requires_cleaning":
      return {
        label: "Volver a pendiente",
        nextStatus: "pending" as OrderStatus,
      };

    default:
      return null;
  }
}

export default function OrdersPage() {
  const { data: orders = [], isLoading, error } = useOrders();

  const updateStatusMutation = useUpdateOrderStatus();

  async function handleChangeStatus(id: string, status: OrderStatus) {
    try {
      await updateStatusMutation.mutateAsync({
        id,
        status,
      });
    } catch (error) {
      console.error("Error al actualizar el estado:", error);

      alert("No se pudo actualizar el estado de la orden.");
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

      {/* Tabla */}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        {orders.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No existen órdenes registradas.</div>
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

                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => {
                  const action = getNextAction(order.status);

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

                      {/* Acción */}

                      <td className="px-4 py-3 text-center">
                        {action ? (
                          <button
                            type="button"
                            disabled={updateStatusMutation.isPending}
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
