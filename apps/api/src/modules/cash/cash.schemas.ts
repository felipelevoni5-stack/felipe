import { z } from "zod";

export const openSessionSchema = z.object({
  openingAmount: z.coerce.number().min(0, "Informe o valor do fundo inicial."),
});

export const cashMovementSchema = z.object({
  type: z.enum(["SANGRIA", "SUPRIMENTO"]),
  amount: z.coerce.number().positive("Informe um valor maior que zero."),
  reason: z.string().trim().min(1, "Informe o motivo."),
});

export const closeSessionSchema = z.object({
  countedCash: z.coerce.number().min(0, "Informe o valor contado em dinheiro."),
  justification: z.string().trim().optional(),
});
