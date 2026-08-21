import { z } from "zod";

export const prendaSchema = z.object({
  code: z.string().min(2, "Ingrese un código").max(20, "Máximo 20 caracteres"),

  name: z.string().min(2, "Ingrese el nombre").max(100, "Máximo 100 caracteres"),

  description: z.string().max(250, "Máximo 250 caracteres").optional(),

  service_id: z.string().uuid("Seleccione un servicio"),

  price: z
    .number({
      error: "Ingrese un precio válido",
    })
    .min(0, "El precio no puede ser negativo"),
});

export type PrendaFormData = z.infer<typeof prendaSchema>;
