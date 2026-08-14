import { z } from "zod";

export const clienteSchema = z.object({
  phone: z.string().min(5, "Ingrese un número de celular válido").max(20, "Máximo 20 caracteres"),

  name: z.string().min(2, "Ingrese el nombre del cliente").max(150, "Máximo 150 caracteres"),

  observations: z.string().max(500, "Máximo 500 caracteres").optional(),
});

export type ClienteFormData = z.infer<typeof clienteSchema>;
