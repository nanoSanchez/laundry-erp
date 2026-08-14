import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createCliente, setClienteStatus, updateCliente } from "../services/cliente.service";

import type { CreateCliente, UpdateCliente } from "../types/cliente";

export function useCreateCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cliente: CreateCliente) => createCliente(cliente),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["clientes"],
      });
    },
  });
}

export function useUpdateCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, cliente }: { id: string; cliente: UpdateCliente }) =>
      updateCliente(id, cliente),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["clientes"],
      });
    },
  });
}

export function useSetClienteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setClienteStatus(id, active),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["clientes"],
      });
    },
  });
}
