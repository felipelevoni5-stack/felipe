import { z } from "zod";

const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().positive("Quantidade deve ser maior que zero."),
  discount: z.coerce.number().min(0).default(0),
});

const paymentSchema = z.object({
  method: z.enum(["DINHEIRO", "PIX", "DEBITO", "CREDITO", "OUTRO"]),
  amount: z.coerce.number().positive("Informe um valor de pagamento maior que zero."),
});

export const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Adicione ao menos um item à venda."),
  discountTotal: z.coerce.number().min(0).default(0),
  payments: z.array(paymentSchema).min(1, "Informe ao menos uma forma de pagamento."),
  clientRequestId: z.string().trim().min(1).optional(),
  customerId: z.string().trim().min(1).optional(),
});

export const cancelSaleSchema = z.object({
  reason: z.string().trim().min(1, "Informe o motivo do cancelamento."),
});
