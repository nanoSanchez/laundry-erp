import { z } from "zod";

export const serviceSchema = z.object({
  code: z.string().min(2, "Ingrese un código").max(20),

  name: z.string().min(3, "Ingrese el nombre"),

  description: z.string().optional(),

  price: z
    .number({
      error: "Ingrese un precio válido",
    })
    .min(0),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;
