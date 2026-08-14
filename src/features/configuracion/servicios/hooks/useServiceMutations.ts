import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createService, setServiceStatus, updateService } from "../services/service.service";

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createService,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["services"],
      });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, service }: { id: string; service: Parameters<typeof updateService>[1] }) =>
      updateService(id, service),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["services"],
      });
    },
  });
}

export function useSetServiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setServiceStatus(id, active),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["services"],
      });
    },
  });
}
