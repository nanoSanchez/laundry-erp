import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { useCreatePrenda, useUpdatePrenda } from "../hooks/usePrendaMutations";
import { useServices } from "@/features/configuracion/servicios/hooks/useServices";

import type { Prenda } from "../types/prenda";

import { prendaSchema, type PrendaFormData } from "../validations/prenda.schema";

interface Props {
  prenda?: Prenda | null;
  onSuccess?: () => void;
}

export default function PrendaForm({ prenda, onSuccess }: Props) {
  const createMutation = useCreatePrenda();
  const updateMutation = useUpdatePrenda();
  const { data: services = [], isLoading: servicesLoading } = useServices();
  const activeServices = services.filter((service) => service.active || service.id === prenda?.service_id);

  const editing = Boolean(prenda);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PrendaFormData>({
    resolver: zodResolver(prendaSchema),

    defaultValues: {
      code: "",
      name: "",
      description: "",
      service_id: "",
      price: 0,
    },
  });

  useEffect(() => {
    if (prenda) {
      reset({
        code: prenda.code,
        name: prenda.name,
        description: prenda.description ?? "",
        service_id: prenda.service_id ?? "",
        price: prenda.price,
      });
    } else {
      reset({
        code: "",
        name: "",
        description: "",
        service_id: "",
        price: 0,
      });
    }
  }, [prenda, reset]);

  async function onSubmit(data: PrendaFormData) {
    if (prenda) {
      await updateMutation.mutateAsync({
        id: prenda.id,

        prenda: {
          ...data,
          active: prenda.active,
        },
      });
    } else {
      await createMutation.mutateAsync(data);
    }

    reset();

    onSuccess?.();
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Código</label>

        <input
          {...register("code")}
          placeholder="Ej. CAM"
          className="w-full rounded-lg border p-3"
        />

        {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Nombre</label>

        <input
          {...register("name")}
          placeholder="Ej. Camisa"
          className="w-full rounded-lg border p-3"
        />

        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Descripción</label>

        <input
          {...register("description")}
          placeholder="Descripción opcional"
          className="w-full rounded-lg border p-3"
        />

        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Servicio aplicable</label>

        <select
          {...register("service_id")}
          disabled={servicesLoading}
          className="w-full rounded-lg border p-3 disabled:bg-slate-100"
        >
          <option value="">{servicesLoading ? "Cargando servicios..." : "Seleccione un servicio"}</option>
          {activeServices.map((service) => (
            <option key={service.id} value={service.id}>{service.name}</option>
          ))}
        </select>

        {errors.service_id && <p className="mt-1 text-sm text-red-600">{errors.service_id.message}</p>}
        {!servicesLoading && activeServices.length === 0 && (
          <p className="mt-1 text-sm text-amber-700">Primero registre y active al menos un servicio.</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Precio</label>

        <input
          type="number"
          step="0.01"
          {...register("price", {
            valueAsNumber: true,
          })}
          className="w-full rounded-lg border p-3"
        />

        {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Guardando..." : editing ? "Actualizar prenda" : "Guardar prenda"}
      </button>
    </form>
  );
}
