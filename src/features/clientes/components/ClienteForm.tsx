import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useCreateCliente, useUpdateCliente } from "../hooks/useClienteMutations";

import type { Cliente } from "../types/cliente";

import { clienteSchema, type ClienteFormData } from "../validations/cliente.schema";

interface Props {
  cliente?: Cliente | null;
  onSuccess?: () => void;
}

export default function ClienteForm({ cliente, onSuccess }: Props) {
  const createMutation = useCreateCliente();
  const updateMutation = useUpdateCliente();

  const editing = Boolean(cliente);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      phone: "",
      name: "",
      observations: "",
    },
  });

  useEffect(() => {
    if (cliente) {
      reset({
        phone: cliente.phone,
        name: cliente.name,
        observations: cliente.observations ?? "",
      });
    } else {
      reset({
        phone: "",
        name: "",
        observations: "",
      });
    }
  }, [cliente, reset]);

  async function onSubmit(data: ClienteFormData) {
    try {
      if (cliente) {
        await updateMutation.mutateAsync({
          id: cliente.id,
          cliente: {
            ...data,
            active: cliente.active,
          },
        });
      } else {
        await createMutation.mutateAsync(data);
      }

      reset();

      onSuccess?.();
    } catch (error) {
      console.error("Error al guardar cliente:", error);
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  const mutationError = createMutation.error || updateMutation.error;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {mutationError && (
        <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700">
          {mutationError instanceof Error && mutationError.message.includes("duplicate")
            ? "Ya existe un cliente registrado con este número de celular."
            : "No se pudo guardar el cliente. Verifique los datos e intente nuevamente."}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">Celular</label>

        <input
          {...register("phone")}
          placeholder="Ej. 71567287"
          className="w-full rounded-lg border p-3"
        />

        {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Nombre completo</label>

        <input
          {...register("name")}
          placeholder="Ej. Juan Pérez"
          className="w-full rounded-lg border p-3"
        />

        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Observaciones</label>

        <textarea
          {...register("observations")}
          rows={3}
          placeholder="Observaciones opcionales"
          className="w-full rounded-lg border p-3"
        />

        {errors.observations && (
          <p className="mt-1 text-sm text-red-600">{errors.observations.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Guardando..." : editing ? "Actualizar cliente" : "Guardar cliente"}
      </button>
    </form>
  );
}
