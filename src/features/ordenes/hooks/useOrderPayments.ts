import { useQuery } from "@tanstack/react-query";

import { getOrderPayments } from "../services/payment.service";

export function useOrderPayments(orderId: string | undefined) {
  return useQuery({
    queryKey: ["order-payments", orderId],

    queryFn: () => {
      if (!orderId) {
        throw new Error("No se proporcionó el ID de la orden.");
      }

      return getOrderPayments(orderId);
    },

    enabled: Boolean(orderId),
  });
}
