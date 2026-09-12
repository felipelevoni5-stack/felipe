import { apiRequest } from "./client";
import type { Category } from "../types/product";

export async function listCategories() {
  const data = await apiRequest<{ categories: Category[] }>("/api/categories");
  return data.categories;
}

export async function createCategory(name: string) {
  const data = await apiRequest<{ category: Category }>("/api/categories", {
    method: "POST",
    body: { name },
  });
  return data.category;
}
