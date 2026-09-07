import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useOrder } from "../hooks/useOrder";

import {
  useUpdateDeliveredQuantity,
  useUpdateOrderItemStatus,
  useUpdateOrderStatus,
} from "../hooks/useOrderMutations";

import { useOrderPayments } from "../hooks/useOrderPayments";
import { useCreatePayment } from "../hooks/usePaymentMutations";
import OrderReceipt from "../components/OrderReceipt";
import OrderEditModal from "../components/OrderEditModal";

import type { OrderItemStatus, OrderStatus } from "../services/order.service";

import type { PaymentMethod } from "../services/payment.service";
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

function getPaymentMethodLabel(method: PaymentMethod) {
  switch (method) {
    case "cash":
      return "Efectivo";

    case "qr":
      return "QR";

    case "transfer":
      return "Transferencia";

    case "card":
      return "Tarjeta";

    default:
      return method;
  }
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();
  const { activeBranch, isGeneralAdmin } = useBranch();
  const { data: cashReadiness } = useCashReadiness(activeBranch?.id);

  const { data: order, isLoading, error } = useOrder(id);

  const updateOrderStatusMutation = useUpdateOrderStatus();

  const updateItemStatusMutation = useUpdateOrderItemStatus();

  const updateDeliveredQuantityMutation = useUpdateDeliveredQuantity();

  const { data: payments = [], isLoading: isLoadingPayments } = useOrderPayments(id);

  const createPaymentMutation = useCreatePayment();

  /**
   * Datos del formulario de pago.
   */
  const [paymentAmount, setPaymentAmount] = React.useState("");

  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("cash");

  const [paymentReference, setPaymentReference] = React.useState("");

  const [paymentNotes, setPaymentNotes] = React.useState("");
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  /**
   * Cambiar cantidad entregada de una prenda.
   */
  async function updateQuantity(itemId: string, quantity: number) {
    if (!order) {
      return;
    }

    if (quantity > 0 && !cashReadiness?.ready) { navigate("/caja", { state: { cashMessage: cashReadiness?.message ?? "Debe abrir la caja antes de entregar.", returnTo: `/ordenes/${id}` } }); return; }
    try {
      await updateDeliveredQuantityMutation.mutateAsync({
        itemId,
        deliveredQuantity: quantity,
      });
    } catch (error) {
      console.error("Error al actualizar la cantidad entregada:", error);

      alert("No se pudo actualizar la cantidad entregada.");
    }
  }

  /**
   * Cambiar estado de una prenda.
   */
  async function changeItemStatus(itemId: string, status: OrderItemStatus) {
    if (!order) {
      return;
    }

    if (status === "delivered" && !cashReadiness?.ready) { navigate("/caja", { state: { cashMessage: cashReadiness?.message ?? "Debe abrir la caja antes de entregar.", returnTo: `/ordenes/${id}` } }); return; }
    try {
      await updateItemStatusMutation.mutateAsync({
        itemId,
        status,
      });
    } catch (error) {
      console.error("Error al actualizar el estado de la prenda:", error);

      alert("No se pudo actualizar el estado de la prenda.");
    }
  }

  /**
   * Cambiar estado general de la orden.
   */
  async function changeOrderStatus(status: OrderStatus) {
    if (!order) {
      return;
    }

    if (status === "delivered" && !cashReadiness?.ready) { navigate("/caja", { state: { cashMessage: cashReadiness?.message ?? "Debe abrir la caja antes de entregar.", returnTo: `/ordenes/${id}` } }); return; }
    try {
      await updateOrderStatusMutation.mutateAsync({
        id: order.id,
        status,
      });
    } catch (error) {
      console.error("Error al actualizar el estado de la orden:", error);

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

  /**
   * Registrar pago.
   */
  async function handleCreatePayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!order) {
      return;
    }

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Ingrese un importe de pago válido.");

      return;
    }

    if (amount > balance) {
      alert(`El importe supera el saldo pendiente de Bs ${balance.toFixed(2)}.`);

      return;
    }

    try {
      await createPaymentMutation.mutateAsync({
        order_id: order.id,
        amount,
        payment_method: paymentMethod,
        reference: paymentReference.trim() || null,
        notes: paymentNotes.trim() || null,
      });

      setPaymentAmount("");
      setPaymentReference("");
      setPaymentNotes("");

      alert("Pago registrado correctamente.");
    } catch (error) {
      console.error("Error al registrar el pago:", error);

      const message = error instanceof Error ? error.message : "No se pudo registrar el pago.";

      alert(message);
    }
  }

  if (isLoading) {
    return <div className="rounded-xl bg-white p-6 shadow-sm">Cargando orden...</div>;
  }

  if (error || !order) {
    return (
      <section className="space-y-4">
        <div className="rounded-xl bg-red-100 p-6 text-red-700">No se pudo cargar la orden.</div>

        <button
          type="button"
          onClick={() => navigate("/ordenes/listado")}
          className="rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-900"
        >
          Volver a órdenes
        </button>
      </section>
    );
  }

  /**
   * Resumen de cantidades.
   */
  const totalGarments = order.items.reduce((sum, item) => sum + Number(item.quantity), 0);

  const deliveredGarments = order.items.reduce(
    (sum, item) => sum + Number(item.delivered_quantity ?? 0),
    0,
  );

  const pendingGarments = Math.max(0, totalGarments - deliveredGarments);

  /**
   * Resumen financiero.
   */
  const orderTotal = Number(order.total);

  const paidAmount = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  const balance = Math.max(0, orderTotal - paidAmount);

  const isFullyPaid = balance <= 0.009;
  const allItemsDelivered = order.items.every((item) => item.status === "delivered");

  return (
    <section className="space-y-6">
      {/* ENCABEZADO */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-500">Detalle de orden</p>

          <h1 className="text-3xl font-bold">{order.order_number}</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {order.status === "received" && (
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              Editar orden
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
          >
            Imprimir comprobante
          </button>
        </div>

        <Link
          to="/ordenes/listado"
          className="rounded-lg border bg-white px-4 py-2 text-center text-sm font-medium hover:bg-slate-50"
        >
          Volver a órdenes
        </Link>
      </div>

      {/* CLIENTE Y ESTADO */}

      <div className="grid gap-6 md:grid-cols-2">
        {/* CLIENTE */}

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Cliente</h2>

          <p className="font-medium">{order.client?.name ?? "Cliente no disponible"}</p>

          <p className="mt-1 text-slate-500">{order.client?.phone ?? "-"}</p>
        </div>

        {/* ESTADO */}

        <div className="relative rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Estado de la orden</h2>

          {isGeneralAdmin && (order.status === "received" || order.status === "in_process") && (
            <button
              type="button"
              disabled={updateOrderStatusMutation.isPending}
              onClick={() => { if (window.confirm("La orden saldrá de la bandeja operativa y quedará como no recogida en el historial. ¿Desea continuar?")) void changeOrderStatus("unclaimed"); }}
              className="absolute right-6 top-6 rounded-lg border border-slate-400 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Marcar no recogida
            </button>
          )}

          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusClass(
              order.status,
            )}`}
          >
            {getStatusLabel(order.status)}
          </span>

          <div className="mt-4 flex flex-wrap gap-2">
            {/* RECIBIDA → EN PROCESO */}

            {order.status === "received" && (
              <button
                type="button"
                disabled={updateOrderStatusMutation.isPending}
                onClick={() => changeOrderStatus("in_process")}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Pasar a proceso
              </button>
            )}

            {/* EN PROCESO → ENTREGADA: todas las prendas y pago completo */}

            {order.status === "in_process" && (
              <button
                type="button"
                disabled={updateOrderStatusMutation.isPending || !allItemsDelivered || !isFullyPaid}
                onClick={() => changeOrderStatus("delivered")}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Entregar toda la orden
              </button>
            )}

            {order.status === "in_process" && (!allItemsDelivered || !isFullyPaid) && <p className="w-full text-sm text-amber-700">Para entregar la orden, todas las prendas deben estar entregadas y el saldo debe ser Bs 0.00.</p>}

            {/* REQUIERE LIMPIEZA → PENDIENTE */}

            {/* ENTREGADA */}

            {order.status === "delivered" && (
              <span className="text-sm text-slate-500">Orden finalizada.</span>
            )}

            {isGeneralAdmin && order.status === "unclaimed" && (
              <button
                type="button"
                disabled={updateOrderStatusMutation.isPending}
                onClick={() => { if (window.confirm("¿Reactivar esta orden para continuar el proceso?")) void changeOrderStatus("in_process"); }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Reactivar orden
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RESUMEN DE PRENDAS */}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total prendas</p>

          <p className="mt-1 text-2xl font-bold">{totalGarments}</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Prendas entregadas</p>

          <p className="mt-1 text-2xl font-bold text-green-600">{deliveredGarments}</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Prendas pendientes</p>

          <p className="mt-1 text-2xl font-bold text-yellow-600">{pendingGarments}</p>
        </div>
      </div>

      {/* INFORMACIÓN */}

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Información de recepción</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">Fecha de recepción</p>

            <p className="font-medium">{new Date(order.created_at).toLocaleDateString("es-BO")}</p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Entrega estimada</p>

            <p className="font-medium">
              {order.estimated_delivery_at
                ? new Date(order.estimated_delivery_at).toLocaleDateString("es-BO")
                : "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-slate-500">Cantidad de prendas</p>

            <p className="font-medium">{totalGarments}</p>
          </div>
        </div>
      </div>

      {/* PRENDAS */}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b bg-slate-50 p-4">
          <h2 className="font-semibold">Prendas de la orden</h2>
        </div>

        {order.items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No existen prendas asociadas a esta orden.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left">Prenda</th>

                  <th className="px-4 py-3 text-center">Cantidad</th>

                  <th className="px-4 py-3 text-center">Entregadas</th>

                  <th className="px-4 py-3 text-center">Pendientes</th>

                  <th className="px-4 py-3 text-center">Estado</th>

                  <th className="px-4 py-3 text-right">Precio</th>

                  <th className="px-4 py-3 text-right">Subtotal</th>

                  <th className="px-4 py-3 text-center">Entrega</th>
                </tr>
              </thead>

              <tbody>
                {order.items.map((item) => {
                  const quantity = Number(item.quantity);

                  const deliveredQuantity = Number(item.delivered_quantity ?? 0);

                  const pendingQuantity = Math.max(0, quantity - deliveredQuantity);

                  const isBusy =
                    updateDeliveredQuantityMutation.isPending || updateItemStatusMutation.isPending;

                  return (
                    <tr key={item.id} className="border-t">
                      {/* PRENDA */}

                      <td className="px-4 py-4">
                        <div className="font-medium">
                          {item.garment_type?.name ?? "Prenda no disponible"}
                        </div>

                        <div className="text-sm text-slate-500">
                          {item.garment_type?.code ?? "-"}
                        </div>

                        {item.observations && (
                          <div className="mt-1 text-sm text-slate-500">{item.observations}</div>
                        )}
                      </td>

                      {/* TOTAL */}

                      <td className="px-4 py-4 text-center font-semibold">{quantity}</td>

                      {/* ENTREGADAS */}

                      <td className="px-4 py-4 text-center">
                        <span className="font-semibold text-green-600">{deliveredQuantity}</span>
                      </td>

                      {/* PENDIENTES */}

                      <td className="px-4 py-4 text-center">
                        <span className="font-semibold text-yellow-600">{pendingQuantity}</span>
                      </td>

                      {/* ESTADO */}

                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            item.status,
                          )}`}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </td>

                      {/* PRECIO */}

                      <td className="px-4 py-4 text-right">
                        Bs {Number(item.unit_price).toFixed(2)}
                      </td>

                      {/* SUBTOTAL */}

                      <td className="px-4 py-4 text-right font-medium">
                        Bs {Number(item.subtotal).toFixed(2)}
                      </td>

                      {/* ENTREGA */}

                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* MENOS */}

                          <button
                            type="button"
                            disabled={deliveredQuantity <= 0 || isBusy}
                            onClick={() =>
                              updateQuantity(item.id, Math.max(0, deliveredQuantity - 1))
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border text-lg font-bold hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            −
                          </button>

                          {/* CANTIDAD */}

                          <div className="w-12 text-center">
                            <div className="text-lg font-bold">{deliveredQuantity}</div>

                            <div className="text-xs text-slate-400">de {quantity}</div>
                          </div>

                          {/* MÁS */}

                          <button
                            type="button"
                            disabled={deliveredQuantity >= quantity || isBusy}
                            onClick={() =>
                              updateQuantity(item.id, Math.min(quantity, deliveredQuantity + 1))
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border text-lg font-bold hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>

                        {/* ENTREGAR TODO */}

                        {deliveredQuantity < quantity && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => updateQuantity(item.id, quantity)}
                            className="mt-2 w-full rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            Entregar todo
                          </button>
                        )}

                        {/* REQUIERE OTRA LIMPIEZA */}

                        {item.status !== "requires_cleaning" && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => changeItemStatus(item.id, "requires_cleaning")}
                            className="mt-2 w-full rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Requiere otra limpieza
                          </button>
                        )}

                        {/* VOLVER A PENDIENTE */}

                        {item.status === "requires_cleaning" && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => changeItemStatus(item.id, "delivered")}
                            className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            Marcar entregada
                          </button>
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

      {/* OBSERVACIONES */}

      {order.observations && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold">Observaciones</h2>

          <p className="text-slate-600">{order.observations}</p>
        </div>
      )}

      {/* PAGOS */}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* RESUMEN DE PAGO */}

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold">Resumen de pago</h2>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Total de la orden</span>

              <span className="font-medium">Bs {orderTotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Total pagado</span>

              <span className="font-medium text-green-600">Bs {paidAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between border-t pt-3 text-xl font-bold">
              <span>{isFullyPaid ? "Pagado" : "Saldo pendiente"}</span>

              <span className={isFullyPaid ? "text-green-600" : "text-red-600"}>
                Bs {balance.toFixed(2)}
              </span>
            </div>
          </div>

          {isFullyPaid && (
            <div className="mt-5 rounded-lg bg-green-50 p-4 text-sm font-medium text-green-700">
              ✓ La orden está completamente pagada.
            </div>
          )}
        </div>

        {/* REGISTRAR PAGO */}

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold">Registrar pago</h2>

          {isFullyPaid ? (
            <div className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">
              No existe saldo pendiente para registrar un nuevo pago.
            </div>
          ) : (
            <form onSubmit={handleCreatePayment} className="space-y-4">
              {/* IMPORTE */}

              <div>
                <label className="mb-1 block text-sm font-medium">Importe</label>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    Bs
                  </span>

                  <input
                    type="number"
                    min="0.01"
                    max={balance}
                    step="0.01"
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                    placeholder={balance.toFixed(2)}
                    disabled={createPaymentMutation.isPending}
                    className="w-full rounded-lg border px-10 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    required
                  />
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Máximo permitido: Bs {balance.toFixed(2)}
                </p>
              </div>

              {/* MÉTODO */}

              <div>
                <label className="mb-1 block text-sm font-medium">Método de pago</label>

                <select
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                  disabled={createPaymentMutation.isPending}
                  className="w-full rounded-lg border px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  <option value="cash">Efectivo</option>

                  <option value="qr">QR</option>

                  <option value="transfer">Transferencia</option>

                  <option value="card">Tarjeta</option>
                </select>
              </div>

              {/* REFERENCIA */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Referencia
                  <span className="font-normal text-slate-400"> (opcional)</span>
                </label>

                <input
                  type="text"
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  placeholder="N.º de operación"
                  disabled={createPaymentMutation.isPending}
                  className="w-full rounded-lg border px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </div>

              {/* OBSERVACIONES */}

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Observaciones
                  <span className="font-normal text-slate-400"> (opcional)</span>
                </label>

                <textarea
                  value={paymentNotes}
                  onChange={(event) => setPaymentNotes(event.target.value)}
                  rows={2}
                  placeholder="Observaciones del pago"
                  disabled={createPaymentMutation.isPending}
                  className="w-full rounded-lg border px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </div>

              {/* BOTÓN */}

              <button
                type="submit"
                disabled={createPaymentMutation.isPending}
                className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createPaymentMutation.isPending ? "Registrando..." : "Registrar pago"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* HISTORIAL DE PAGOS */}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b bg-slate-50 p-4">
          <h2 className="font-semibold">Historial de pagos</h2>
        </div>

        {isLoadingPayments ? (
          <div className="p-6 text-center text-slate-500">Cargando pagos...</div>
        ) : payments.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            Esta orden todavía no tiene pagos registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha</th>

                  <th className="px-4 py-3 text-left">Método</th>

                  <th className="px-4 py-3 text-left">Referencia</th>

                  <th className="px-4 py-3 text-left">Observaciones</th>

                  <th className="px-4 py-3 text-right">Importe</th>
                </tr>
              </thead>

              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t">
                    <td className="px-4 py-4">
                      {new Date(payment.created_at).toLocaleString("es-BO")}
                    </td>

                    <td className="px-4 py-4 font-medium">
                      {getPaymentMethodLabel(payment.payment_method)}
                    </td>

                    <td className="px-4 py-4 text-slate-600">{payment.reference || "-"}</td>

                    <td className="px-4 py-4 text-slate-600">{payment.notes || "-"}</td>

                    <td className="px-4 py-4 text-right font-semibold text-green-600">
                      Bs {Number(payment.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TOTALES DE LA ORDEN */}

      <div className="flex justify-end">
        <div className="w-full rounded-xl border bg-white p-6 shadow-sm md:w-96">
          <div className="flex justify-between py-2">
            <span className="text-slate-500">Subtotal</span>

            <span>Bs {Number(order.subtotal).toFixed(2)}</span>
          </div>

          <div className="flex justify-between py-2">
            <span className="text-slate-500">Descuento</span>

            <span>Bs {Number(order.discount).toFixed(2)}</span>
          </div>

          <div className="mt-2 flex justify-between border-t pt-4 text-xl font-bold">
            <span>Total</span>

            <span>Bs {orderTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <OrderReceipt order={order} paidAmount={paidAmount} />
      <OrderEditModal open={isEditOpen} order={order} paidAmount={paidAmount} onClose={() => setIsEditOpen(false)} />
    </section>
  );
}
