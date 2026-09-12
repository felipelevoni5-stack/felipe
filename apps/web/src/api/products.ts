import { apiRequest } from "./client";
import type { Product } from "../types/product";

export type ProductFilters = {
  search?: string;
  categoryId?: string;
  status?: "ativos" | "inativos" | "todos";
  lowStock?: boolean;
};

export type ProductInput = {
  name: string;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  brand?: string;
  description?: string;
  costPrice: number;
  salePrice: number;
  stockQuantity?: number;
  minStock?: number;
  unit?: string;
  supplierName?: string;
};

export async function listProducts(filters: ProductFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.status) params.set("status", filters.status);
  if (filters.lowStock) params.set("lowStock", "true");
  const qs = params.toString();
  const data = await apiRequest<{ products: Product[] }>(`/api/products${qs ? `?${qs}` : ""}`);
  return data.products;
}

export async function lookupProduct(code: string) {
  const data = await apiRequest<{ product: Product }>(
    `/api/products/lookup?code=${encodeURIComponent(code)}`,
  );
  return data.product;
}

export async function createProduct(input: ProductInput) {
  const data = await apiRequest<{ product: Product }>("/api/products", {
    method: "POST",
    body: input,
  });
  return data.product;
}

export async function updateProduct(id: string, input: Partial<ProductInput & { active: boolean }>) {
  const data = await apiRequest<{ product: Product }>(`/api/products/${id}`, {
    method: "PATCH",
    body: input,
  });
  return data.product;
}
