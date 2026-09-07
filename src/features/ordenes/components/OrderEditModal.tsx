import { useEffect, useMemo, useState } from "react";

import Modal from "@/components/ui/Modal";
import ClienteSearch from "@/features/clientes/components/ClienteSearch";
import type { Cliente } from "@/features/clientes/types/cliente";
import { useGarmentTypes } from "@/features/prendas/hooks/useGarmentTypes";

import { useEditReceivedOrder } from "../hooks/useOrderMutations";
import type { OrderDetail } from "../hooks/useOrder";

interface DraftItem {
  id: string;
  garment_type_id: string;
  quantity: string;
  subtotal: string;
  observations: string;
}

interface Props {
  open: boolean;
  order: OrderDetail;
  onClose: () => void;
}

function dateAndTime(value: string | null) {
  if (!value) return { date: "", time: "" };
  const parsed = new Date(value);
  const pad = (number: number) => String(number).padStart(2, "0");
  return {
    date: `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`,
    time: `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`,
  };
}

function makeDrafts(order: OrderDetail): DraftItem[] {
  return order.items.map((item) => ({
    id: item.id,
    garment_type_id: item.garment_type_id,
    quantity: String(item.quantity),
    subtotal: Number(item.subtotal).toFixed(2),
    observations: item.observations ?? "",
  }));
}

export default function OrderEditModal({ open, order, onClose }: Props) {
  const delivery = dateAndTime(order.estimated_delivery_at);
  const [clientId, setClientId] = useState(order.client_id);
  const [clientName, setClientName] = useState(order.client?.name ?? "Cliente seleccionado");
  const [deliveryDate, setDeliveryDate] = useState(delivery.date);
  const [deliveryTime, setDeliveryTime] = useState(delivery.time);
  const [observations, setObservations] = useState(order.observations ?? "");
  const [discount, setDiscount] = useState(Number(order.discount).toFixed(2));
  const [items, setItems] = useState<DraftItem[]>(() => makeDrafts(order));
  const [formError, setFormError] = useState("");
  const { data: garmentTypes = [], isLoading: garmentsLoading } = useGarmentTypes();
  const editMutation = useEditReceivedOrder();

  useEffect(() => {
    if (!open) return;
    const resetDelivery = dateAndTime(order.estimated_delivery_at);
    setClientId(order.client_id);
    setClientName(order.client?.name ?? "Cliente seleccionado");
    setDeliveryDate(resetDelivery.date);
    setDeliveryTime(resetDelivery.time);
    setObservations(order.observations ?? "");
    setDiscount(Number(order.discount).toFixed(2));
    setItems(makeDrafts(order));
    setFormError("");
  }, [open, order]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0),
    [items],
  );
  const discountAmount = Number(discount) || 0;
  const total = Math.max(0, subtotal - discountAmount);
  const sortedGarments = useMemo(() => [...garmentTypes].sort((a, b) => a.name.localeCompare(b.name, "es")), [garmentTypes]);

  function updateItem(id: string, changes: Partial<DraftItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item));
  }

  function chooseGarment(id: string, garmentTypeId: string) {
    const garment = garmentTypes.find((item) => item.id === garmentTypeId);
    const current = items.find((item) => item.id === id);
    const quantity = Number(current?.quantity) || 1;
    updateItem(id, {
      garment_type_id: garmentTypeId,
      subtotal: garment ? (garment.price * quantity).toFixed(2) : "",
    });
  }

  function addItem() {
    setItems((current) => [...current, {
      id: crypto.randomUUID(), garment_type_id: "", quantity: "1", subtotal: "", observations: "",
    }]);
  }

  async function save() {
    if (!clientId || !deliveryDate || !deliveryTime || items.length === 0) {
      setFormError("Seleccione un cliente, fecha, hora y al menos una prenda.");
      return;
    }
    if (!Number.isFinite(discountAmount) || discountAmount < 0 || discountAmount > subtotal) {
      setFormError("El descuento no es válido.");
      return;
    }

    const normalizedItems = items.map((item) => {
      const quantity = Number(item.quantity);
      const itemSubtotal = Number(item.subtotal);
      return {
        garment_type_id: item.garment_type_id,
        quantity,
        unit_price: quantity > 0 ? itemSubtotal / quantity : 0,
        subtotal: itemSubtotal,
        observations: item.observations,
      };
    });
    if (normalizedItems.some((item) => !item.garment_type_id || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.subtotal) || item.subtotal <= 0)) {
      setFormError("Verifique la prenda, cantidad y total parcial de cada línea.");
      return;
    }

    try {
      await editMutation.mutateAsync({
        order_id: order.id,
        client_id: clientId,
        estimated_delivery_at: new Date(`${deliveryDate}T${deliveryTime}`).toISOString(),
        observations,
        discount: discountAmount,
        items: normalizedItems,
      });
      onClose();
    } catch (error) {
      const detail = typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
        ? error.message
        : "No se pudo guardar la edición de la orden.";
      setFormError(detail);
    }
  }

  return (
    <Modal open={open} title={`Editar orden ${order.order_number}`} onClose={onClose} size="wide">
      <div className="space-y-6">
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Los pagos y el número de orden no se modifican, para mantener el historial financiero y el correlativo.</p>

        <section>
          <h3 className="mb-3 font-semibold">Cliente</h3>
          <p className="mb-3 text-sm text-slate-600">Actual: <strong>{clientName}</strong>. Busque otro cliente solo si necesita cambiarlo.</p>
          <ClienteSearch onSelect={(client: Cliente) => { setClientId(client.id); setClientName(client.name); setFormError(""); }} />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div><label className="mb-1 block text-sm font-medium">Fecha de entrega</label><input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} className="w-full rounded-lg border p-3" /></div>
          <div><label className="mb-1 block text-sm font-medium">Hora de entrega</label><input type="time" value={deliveryTime} onChange={(event) => setDeliveryTime(event.target.value)} className="w-full rounded-lg border p-3" /></div>
          <div><label className="mb-1 block text-sm font-medium">Descuento</label><input type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} className="w-full rounded-lg border p-3" /></div>
          <div className="md:col-span-3"><label className="mb-1 block text-sm font-medium">Observaciones de la orden</label><textarea rows={2} value={observations} onChange={(event) => setObservations(event.target.value)} className="w-full rounded-lg border p-3" /></div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Prendas</h3><button type="button" onClick={addItem} className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-700">+ Agregar prenda</button></div>
          {garmentsLoading ? <p className="text-sm text-slate-500">Cargando prendas...</p> : <div className="space-y-3">{items.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-lg border bg-slate-50 p-3 md:grid-cols-[2fr_0.7fr_1fr_auto] md:items-end">
              <div><label className="mb-1 block text-sm font-medium">Prenda</label><select value={item.garment_type_id} onChange={(event) => chooseGarment(item.id, event.target.value)} className="w-full rounded-lg border bg-white p-3"><option value="">Seleccione una prenda</option>{sortedGarments.map((garment) => <option key={garment.id} value={garment.id}>{garment.name} · Bs {garment.price.toFixed(2)}</option>)}</select></div>
              <div><label className="mb-1 block text-sm font-medium">Cantidad</label><input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: event.target.value })} className="w-full rounded-lg border bg-white p-3" /></div>
              <div><label className="mb-1 block text-sm font-medium">Total parcial</label><input type="number" min="0.01" step="0.01" value={item.subtotal} onChange={(event) => updateItem(item.id, { subtotal: event.target.value })} className="w-full rounded-lg border bg-white p-3" /></div>
              <button type="button" onClick={() => setItems((current) => current.filter((currentItem) => currentItem.id !== item.id))} className="rounded-lg border border-red-200 px-3 py-3 text-sm font-medium text-red-700">Quitar</button>
              <div className="md:col-span-4"><label className="mb-1 block text-sm font-medium">Detalle de la prenda</label><input value={item.observations} onChange={(event) => updateItem(item.id, { observations: event.target.value })} className="w-full rounded-lg border bg-white p-3" /></div>
            </div>
          ))}</div>}
        </section>

        <div className="rounded-lg bg-slate-100 p-4 text-right"><p className="text-sm text-slate-600">Subtotal: Bs {subtotal.toFixed(2)} · Descuento: Bs {discountAmount.toFixed(2)}</p><p className="text-xl font-bold">Total: Bs {total.toFixed(2)}</p></div>
        {formError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-lg border px-5 py-3 font-medium">Cancelar</button><button type="button" onClick={save} disabled={editMutation.isPending || garmentsLoading} className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white disabled:opacity-50">{editMutation.isPending ? "Guardando..." : "Guardar cambios"}</button></div>
      </div>
    </Modal>
  );
}
