import { useMemo, useState } from "react";

import ClienteSearch from "@/features/clientes/components/ClienteSearch";
import type { Cliente } from "@/features/clientes/types/cliente";
import { useGarmentTypes } from "@/features/prendas/hooks/useGarmentTypes";
import { useBranches } from "@/features/configuracion/sucursales/hooks/useBranches";

import OrderItemForm from "../components/OrderItemForm";
import { useCreateOrder } from "../hooks/useOrderMutations";
import { generateOrderNumber } from "../utils/orderNumber";

interface OrderItem {
  garment_type_id: string;
  garment_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  observations: string;
}

export default function ReceptionPage() {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [branchId, setBranchId] = useState("");

  const [items, setItems] = useState<OrderItem[]>([]);

  const [deliveryDate, setDeliveryDate] = useState("");

  const [observations, setObservations] = useState("");

  const createOrderMutation = useCreateOrder();

  const {
    data: garmentTypes = [],
    isLoading: garmentTypesLoading,
    error: garmentTypesError,
  } = useGarmentTypes();
  const { data: branches = [] } = useBranches();

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.subtotal, 0), [items]);

  const total = subtotal;

  function handleAddItem(item: OrderItem) {
    setItems((current) => [...current, item]);
  }

  function handleRemoveItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleCreateOrder() {
    if (!cliente) {
      alert("Debe seleccionar un cliente.");
      return;
    }

    if (!branchId) {
      alert("Debe seleccionar una sucursal.");
      return;
    }

    if (items.length === 0) {
      alert("Debe agregar al menos una prenda.");
      return;
    }

    try {
      await createOrderMutation.mutateAsync({
        branch_id: branchId,
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

      alert("Orden registrada correctamente.");

      setCliente(null);
      setItems([]);
      setDeliveryDate("");
      setObservations("");
    } catch (error) {
      console.error("Error al registrar la orden:", error);

      alert("No se pudo registrar la orden.");
    }
  }

  return (
    <section className="space-y-6">
      {/* Encabezado */}

      <div>
        <h1 className="text-3xl font-bold">Recepción de prendas</h1>

        <p className="mt-1 text-slate-500">Registre una nueva orden de lavandería.</p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Sucursal</h2>
        <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="w-full rounded-lg border p-3">
          <option value="">Seleccione una sucursal</option>
          {branches.filter((branch) => branch.is_active).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
      </div>

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

      {/* Total */}

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">Total</span>

          <span className="text-3xl font-bold">Bs {total.toFixed(2)}</span>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleCreateOrder}
            disabled={createOrderMutation.isPending}
            className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createOrderMutation.isPending ? "Registrando..." : "Registrar orden"}
          </button>
        </div>
      </div>
    </section>
  );
}
