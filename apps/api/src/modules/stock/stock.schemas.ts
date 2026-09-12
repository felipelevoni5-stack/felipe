import { z } from "zod";

export const createStockMovementSchema = z
  .object({
    type: z.enum(["ENTRADA", "SAIDA", "AJUSTE", "INVENTARIO"]),
    quantity: z.coerce.number().positive("Informe uma quantidade maior que zero.").optional(),
    newQuantity: z.coerce.number().min(0, "A quantidade não pode ser negativa.").optional(),
    reason: z.string().trim().min(1, "Informe o motivo.").optional(),
  })
  .refine(
    (data) => (data.type === "ENTRADA" || data.type === "SAIDA" ? data.quantity !== undefined : true),
    { message: "Informe a quantidade.", path: ["quantity"] },
  )
  .refine(
    (data) =>
      data.type === "AJUSTE" || data.type === "INVENTARIO" ? data.newQuantity !== undefined : true,
    { message: "Informe a nova quantidade em estoque.", path: ["newQuantity"] },
  )
  .refine((data) => (data.type === "SAIDA" ? !!data.reason : true), {
    message: "Informe o motivo da saída.",
    path: ["reason"],
  });
