import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import ClienteSearch from "@/features/clientes/components/ClienteSearch";
import type { Cliente } from "@/features/clientes/types/cliente";
import { useGarmentTypes } from "@/features/prendas/hooks/useGarmentTypes";
import { useBranch } from "@/hooks/useBranch";
import { useCashReadiness } from "@/features/caja/hooks/useCashReadiness";

import OrderItemForm from "../components/OrderItemForm";
import { useCreateOrder } from "../hooks/useOrderMutations";
import { useCreatePayment } from "../hooks/usePaymentMutations";
import type { PaymentMethod } from "../services/payment.service";
import { generateOrderNumber } from "../utils/orderNumber";

interface OrderItem {
  garment_type_id: string;
  garment_name: string;
  service_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  observations: string;
}

interface InitialPayment {
  id: string;
  amount: string;
  method: PaymentMethod;
  reference: string;
}

export default function ReceptionPage() {
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const { activeBranch } = useBranch();
  const { data: cashReadiness } = useCashReadiness(activeBranch?.id);

  const [items, setItems] = useState<OrderItem[]>([]);

  const [deliveryDate, setDeliveryDate] = useState("");

  const [observations, setObservations] = useState("");

  const [initialPayments, setInitialPayments] = useState<InitialPayment[]>([]);

  const createOrderMutation = useCreateOrder();
  const createPaymentMutation = useCreatePayment();

  const {
    data: garmentTypes = [],
    isLoading: garmentTypesLoading,
    error: garmentTypesError,
  } = useGarmentTypes();

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.subtotal, 0), [items]);

  const total = subtotal;
  const initialPaymentTotal = initialPayments.reduce((sum, payment) => {
    const amount = Number(payment.amount);
    return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
  }, 0);
  const pendingBalance = Math.max(0, total - initialPaymentTotal);

  useEffect(() => {
    if (cashReadiness && !cashReadiness.ready) {
      navigate("/caja", { replace: true, state: { cashMessage: cashReadiness.message, returnTo: "/ordenes" } });
    }
  }, [cashReadiness, navigate]);

  function handleAddItem(item: OrderItem) {
    setItems((current) => [...current, item]);
  }

  function handleRemoveItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function addInitialPayment() {
    setInitialPayments((payments) => [...payments, {
      id: crypto.randomUUID(), amount: "", method: "cash", reference: "",
    }]);
  }

  function updateInitialPayment(id: string, changes: Partial<InitialPayment>) {
    setInitialPayments((payments) => payments.map((payment) => payment.id === id ? { ...payment, ...changes } : payment));
  }

  function removeInitialPayment(id: string) {
    setInitialPayments((payments) => payments.filter((payment) => payment.id !== id));
  }

  async function handleCreateOrder() {
    if (!cliente) {
      alert("Debe seleccionar un cliente.");
      return;
    }

    if (!activeBranch?.id || !cashReadiness?.ready) {
      navigate("/caja", { state: { cashMessage: cashReadiness?.message ?? "Debe abrir la caja antes de recepcionar órdenes.", returnTo: "/ordenes" } });
      return;
    }

    if (items.length === 0) {
      alert("Debe agregar al menos una prenda.");
      return;
    }

    if (!deliveryDate) {
      alert("Debe registrar la fecha estimada de entrega.");
      return;
    }

    const paymentsToCreate = initialPayments.map((payment) => ({ ...payment, numericAmount: Number(payment.amount) }));
    if (paymentsToCreate.some((payment) => !Number.isFinite(payment.numericAmount) || payment.numericAmount <= 0)) {
      alert("Cada forma de pago debe tener un importe mayor a cero.");
      return;
    }

    if (initialPaymentTotal > total) {
      alert(`La suma de pagos no puede superar el total de Bs ${total.toFixed(2)}.`);
      return;
    }

    try {
      const order = await createOrderMutation.mutateAsync({
        branch_id: activeBranch.id,
        client_id: cliente.id,

        order_number: generateOrderNumber(),

        estimated_delivery_at: deliveryDate
          ? new Date(`${deliveryDate}T18:00:00`).toISOString()
          : null,

        observations,

        subtotal,

        discount: 0,

        total,

        items: items.map((item) => ({
          garment_type_id: item.garment_type_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          observations: item.observations,
        })),
      });

      for (const payment of paymentsToCreate) {
        await createPaymentMutation.mutateAsync({
          order_id: order.id,
          amount: payment.numericAmount,
          payment_method: payment.method,
          reference: payment.reference.trim() || null,
        });
      }

      alert(paymentsToCreate.length > 0 ? "Orden y pagos iniciales registrados correctamente." : "Orden registrada correctamente.");

      setCliente(null);
      setItems([]);
      setDeliveryDate("");
      setObservations("");
      setInitialPayments([]);
    } catch (error) {
      console.error("Error al registrar la orden:", error);

      const detail = typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
        ? error.message
        : "No se pudo registrar la orden.";
      alert(detail);
    }
  }

  return (
    <section className="space-y-6">
      {/* Encabezado */}

      <div>
        <h1 className="text-3xl font-bold">Recepción de prendas</h1>

        <p className="mt-1 text-slate-500">Registre una nueva orden de lavandería.</p>
      </div>

      {cashReadiness && !cashReadiness.ready && <div className="rounded-xl bg-amber-50 p-4 text-amber-800">{cashReadiness.message}</div>}

      {/* Cliente */}

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">1. Cliente</h2>

        <ClienteSearch
          onSelect={setCliente}
          onCreateNew={(phone) => {
            alert(`Crear cliente con celular: ${phone}`);
          }}
        />

        {cliente && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-700">Cliente seleccionado</p>

            <p className="font-semibold text-green-900">{cliente.name}</p>

            <p className="text-sm text-green-700">{cliente.phone}</p>
          </div>
        )}
      </div>

      {/* Prendas */}

      <div>
        <h2 className="mb-4 text-lg font-semibold">2. Prendas</h2>

        {garmentTypesLoading && (
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-slate-500">Cargando tipos de prendas...</p>
          </div>
        )}

        {garmentTypesError && (
          <div className="rounded-xl bg-red-100 p-6 text-red-700">
            <p className="font-medium">Error al cargar los tipos de prendas.</p>

            <p className="mt-1 text-sm">
              Verifique la conexión con Supabase y las políticas de la tabla garment_types.
            </p>
          </div>
        )}

        {!garmentTypesLoading && !garmentTypesError && (
          <OrderItemForm garmentTypes={garmentTypes} onAdd={handleAddItem} />
        )}
      </div>

      {/* Detalle de prendas */}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b bg-slate-50 p-4">
          <h2 className="font-semibold">Prendas de la orden</h2>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No se han agregado prendas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left">Prenda</th>

                  <th className="px-4 py-3 text-left">Servicio</th>

                  <th className="px-4 py-3 text-center">Cantidad</th>

                  <th className="px-4 py-3 text-right">Precio</th>

                  <th className="px-4 py-3 text-right">Subtotal</th>

                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr key={`${item.garment_type_id}-${index}`} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.garment_name}</div>

                      {item.observations && (
                        <div className="text-sm text-slate-500">{item.observations}</div>
                      )}
                    </td>

                    <td className="px-4 py-3">{item.service_name}</td>

                    <td className="px-4 py-3 text-center">{item.quantity}</td>

                    <td className="px-4 py-3 text-right">Bs {item.unit_price.toFixed(2)}</td>

                    <td className="px-4 py-3 text-right font-medium">
                      Bs {item.subtotal.toFixed(2)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-sm font-medium text-red-600 hover:text-red-800"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Entrega */}

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">3. Entrega</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Fecha estimada de entrega</label>

            <input
              type="date"
              value={deliveryDate}
              onChange={(event) => setDeliveryDate(event.target.value)}
              className="w-full rounded-lg border p-3"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Observaciones de la orden</label>

            <input
              type="text"
              value={observations}
              onChange={(event) => setObservations(event.target.value)}
              placeholder="Observaciones generales"
              className="w-full rounded-lg border p-3"
            />
          </div>
        </div>
      </div>

      {/* Pago inicial */}

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">4. Pago inicial</h2>
          <p className="mt-1 text-sm text-slate-500">Opcional. Puede dividir el cobro entre QR, efectivo, transferencia o tarjeta.</p>
        </div>

        <div className="space-y-3">
          {initialPayments.map((payment, index) => (
            <div key={payment.id} className="grid gap-3 rounded-lg border bg-slate-50 p-3 md:grid-cols-[1.1fr_1fr_1fr_auto] md:items-end">
              <div>
                <label className="mb-1 block text-sm font-medium">Forma de pago {index + 1}</label>
                <select value={payment.method} onChange={(event) => updateInitialPayment(payment.id, { method: event.target.value as PaymentMethod })} className="w-full rounded-lg border bg-white p-3">
                  <option value="cash">Efectivo</option><option value="qr">QR</option><option value="transfer">Transferencia</option><option value="card">Tarjeta</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Importe</label>
                <input type="number" min="0.01" max={total} step="0.01" value={payment.amount} onChange={(event) => updateInitialPayment(payment.id, { amount: event.target.value })} placeholder="0.00" className="w-full rounded-lg border bg-white p-3" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Referencia <span className="font-normal text-slate-400">(opcional)</span></label>
                <input value={payment.reference} onChange={(event) => updateInitialPayment(payment.id, { reference: event.target.value })} placeholder="N.º de operación" className="w-full rounded-lg border bg-white p-3" />
              </div>
              <button type="button" onClick={() => removeInitialPayment(payment.id)} className="rounded-lg border border-red-200 px-3 py-3 text-sm font-medium text-red-700 hover:bg-red-50">Quitar</button>
            </div>
          ))}
        </div>

        <button type="button" onClick={addInitialPayment} className="mt-4 rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">+ Agregar forma de pago</button>
      </div>

      {/* Total */}

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">Total</span>

          <span className="text-3xl font-bold">Bs {total.toFixed(2)}</span>
        </div>

        <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3">
          <div><p className="text-sm text-slate-500">Total de la orden</p><p className="text-lg font-semibold">Bs {total.toFixed(2)}</p></div>
          <div><p className="text-sm text-slate-500">Pagado ahora</p><p className="text-lg font-semibold text-green-700">Bs {initialPaymentTotal.toFixed(2)}</p></div>
          <div><p className="text-sm text-slate-500">Saldo pendiente</p><p className="text-lg font-semibold text-amber-700">Bs {pendingBalance.toFixed(2)}</p></div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleCreateOrder}
            disabled={createOrderMutation.isPending || createPaymentMutation.isPending || !cashReadiness?.ready}
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createOrderMutation.isPending || createPaymentMutation.isPending ? "Registrando..." : "Registrar orden"}
          </button>
        </div>
      </div>
    </section>
  );
}
