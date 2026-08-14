import { useState } from "react";

interface GarmentType {
  id: string;
  code: string;
  name: string;
  price: number;
}

interface Props {
  garmentTypes: GarmentType[];
  onAdd: (item: {
    garment_type_id: string;
    garment_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    observations: string;
  }) => void;
}

export default function OrderItemForm({ garmentTypes, onAdd }: Props) {
  const [garmentTypeId, setGarmentTypeId] = useState("");

  const [quantity, setQuantity] = useState(1);

  const [observations, setObservations] = useState("");

  const selectedGarment = garmentTypes.find((garment) => garment.id === garmentTypeId);

  const subtotal = selectedGarment ? selectedGarment.price * quantity : 0;

  function handleAdd() {
    if (!selectedGarment) {
      return;
    }

    if (quantity <= 0) {
      return;
    }

    onAdd({
      garment_type_id: selectedGarment.id,

      garment_name: selectedGarment.name,

      quantity,

      unit_price: selectedGarment.price,

      subtotal,

      observations,
    });

    setGarmentTypeId("");
    setQuantity(1);
    setObservations("");
  }

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">Agregar prenda</h2>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium">Prenda</label>

          <select
            value={garmentTypeId}
            onChange={(event) => setGarmentTypeId(event.target.value)}
            className="w-full rounded-lg border p-3"
          >
            <option value="">Seleccione una prenda</option>

            {garmentTypes.map((garment) => (
              <option key={garment.id} value={garment.id}>
                {garment.name} - Bs {garment.price.toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Cantidad</label>

          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            className="w-full rounded-lg border p-3"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Subtotal</label>

          <div className="rounded-lg bg-slate-100 p-3">Bs {subtotal.toFixed(2)}</div>
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium">Observación de la prenda</label>

        <input
          type="text"
          value={observations}
          onChange={(event) => setObservations(event.target.value)}
          placeholder="Ej. Mancha en manga derecha"
          className="w-full rounded-lg border p-3"
        />
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!selectedGarment}
          className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Agregar prenda
        </button>
      </div>
    </div>
  );
}
