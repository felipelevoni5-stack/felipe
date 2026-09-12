import { apiRequest } from "./client";
import type { PaymentMethod, Sale } from "../types/sale";

export type CreateSaleInput = {
  items: { productId: string; quantity: number; discount?: number }[];
  discountTotal?: number;
  payments: { method: PaymentMethod; amount: number }[];
  clientRequestId: string;
  customerId?: string;
};

export async function createSale(input: CreateSaleInput) {
  const data = await apiRequest<{ sale: Sale }>("/api/sales", { method: "POST", body: input });
  return data.sale;
}

export async function getSale(id: string) {
  const data = await apiRequest<{ sale: Sale }>(`/api/sales/${id}`);
  return data.sale;
}

export async function cancelSale(id: string, reason: string) {
  const data = await apiRequest<{ sale: Sale }>(`/api/sales/${id}/cancel`, {
    method: "POST",
    body: { reason },
  });
  return data.sale;
}
