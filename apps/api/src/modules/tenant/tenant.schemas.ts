import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

export const updateTenantSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa.").optional(),
  document: z.preprocess(emptyToUndefined, z.string().trim().optional().nullable()),
  allowNegativeStock: z.boolean().optional(),
  operatorMaxDiscountPercent: z.coerce
    .number()
    .min(0, "O limite não pode ser negativo.")
    .max(100, "O limite não pode passar de 100%.")
    .optional(),
});
