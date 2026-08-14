import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { serviceSchema, type ServiceFormData } from "../validations/service.schema";

import { useCreateService, useUpdateService } from "../hooks/useServiceMutations";

import type { Service } from "../types/service";

interface Props {
  service?: Service | null;
  onSuccess?: () => void;
}

export default function ServiceForm({ service, onSuccess }: Props) {
  const createMutation = useCreateService();
  const updateMutation = useUpdateService();

  const editing = Boolean(service);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),

    defaultValues: {
      code: "",
      name: "",
      description: "",
      price: 0,
    },
  });

  useEffect(() => {
    if (service) {
      reset({
        code: service.code,
        name: service.name,
        description: service.description ?? "",
        price: service.price,
      });
    } else {
      reset({
        code: "",
        name: "",
        description: "",
        price: 0,
      });
    }
  }, [service, reset]);

  async function onSubmit(data: ServiceFormData) {
    if (service) {
      await updateMutation.mutateAsync({
        id: service.id,
        service: {
          ...data,
          active: service.active,
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
          className="w-full rounded-lg border p-3"
          placeholder="Ej. LAV"
        />

        {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Nombre</label>

        <input
          {...register("name")}
          className="w-full rounded-lg border p-3"
          placeholder="Ej. Lavado"
        />

        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Descripción</label>

        <input
          {...register("description")}
          className="w-full rounded-lg border p-3"
          placeholder="Descripción opcional"
        />
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
          placeholder="0.00"
        />

        {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Guardando..." : editing ? "Actualizar servicio" : "Guardar servicio"}
      </button>
    </form>
  );
}
