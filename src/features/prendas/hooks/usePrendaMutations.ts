import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createPrenda, setPrendaStatus, updatePrenda } from "../services/prenda.service";

import type { CreatePrenda, UpdatePrenda } from "../types/prenda";

export function useCreatePrenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (prenda: CreatePrenda) => createPrenda(prenda),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["prendas"],
      });
    },
  });
}

export function useUpdatePrenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, prenda }: { id: string; prenda: UpdatePrenda }) => updatePrenda(id, prenda),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["prendas"],
      });
    },
  });
}

export function useSetPrendaStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setPrendaStatus(id, active),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["prendas"],
      });
    },
  });
}
