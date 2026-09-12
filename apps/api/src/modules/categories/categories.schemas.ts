import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria."),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(2).optional(),
  active: z.boolean().optional(),
});
