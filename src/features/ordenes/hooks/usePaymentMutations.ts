import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createPayment, type CreatePayment } from "../services/payment.service";

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payment: CreatePayment) => createPayment(payment),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["order-payments", variables.order_id],
      });

      queryClient.invalidateQueries({
        queryKey: ["order", variables.order_id],
      });

      queryClient.invalidateQueries({
        queryKey: ["orders"],
      });
    },
  });
}
