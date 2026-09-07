import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createOrder,
  updateOrderStatus,
  updateOrderItemStatus,
  updateOrderItemDeliveredQuantity,
  editReceivedOrder,
  type CreateOrder,
  type EditReceivedOrder,
  type OrderStatus,
  type OrderItemStatus,
} from "../services/order.service";

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (order: CreateOrder) => createOrder(order),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["orders"],
      });
    },
  });
}

export function useEditReceivedOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (order: EditReceivedOrder) => editReceivedOrder(order),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", variables.order_id] });
    },
  });
}

interface UpdateOrderStatusParams {
  id: string;
  status: OrderStatus;
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: UpdateOrderStatusParams) => updateOrderStatus(id, status),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["orders"],
      });

      queryClient.invalidateQueries({
        queryKey: ["order", variables.id],
      });
    },
  });
}

interface UpdateOrderItemStatusParams {
  itemId: string;
  status: OrderItemStatus;
}

export function useUpdateOrderItemStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, status }: UpdateOrderItemStatusParams) =>
      updateOrderItemStatus(itemId, status),

    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["orders"],
      });

      queryClient.invalidateQueries({
        queryKey: ["order", data.order_id],
      });
    },
  });
}

interface UpdateDeliveredQuantityParams {
  itemId: string;
  deliveredQuantity: number;
}

export function useUpdateDeliveredQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, deliveredQuantity }: UpdateDeliveredQuantityParams) =>
      updateOrderItemDeliveredQuantity(itemId, deliveredQuantity),

    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["orders"],
      });

      queryClient.invalidateQueries({
        queryKey: ["order", data.order_id],
      });
    },
  });
}
