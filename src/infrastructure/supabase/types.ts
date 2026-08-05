export type UserRole = "ADMINISTRADOR" | "OPERADOR";

export type OrderStatus = "RECIBIDA" | "PENDIENTE" | "ENTREGADA" | "REQUIERE_OTRA_LIMPIEZA";

export type PaymentMethod = "EFECTIVO" | "QR" | "TRANSFERENCIA" | "TARJETA" | "OTRO";

export interface Pagination {
  page: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
