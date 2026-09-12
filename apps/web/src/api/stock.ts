import { apiRequest } from "./client";
import type { StockMovement, StockMovementType } from "../types/product";

export async function listStockMovements(productId: string) {
  const data = await apiRequest<{ movements: StockMovement[] }>(
    `/api/products/${productId}/stock-movements`,
  );
  return data.movements;
}

export async function createStockMovement(
  productId: string,
  input: { type: StockMovementType; quantity?: number; newQuantity?: number; reason?: string },
) {
  const data = await apiRequest<{ movement: StockMovement }>(
    `/api/products/${productId}/stock-movements`,
    { method: "POST", body: input },
  );
  return data.movement;
}
