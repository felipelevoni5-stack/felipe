import { apiRequest } from "./client";
import type { Customer, CustomerPurchase } from "../types/customer";

export type CustomerFilters = {
  search?: string;
  status?: "ativos" | "inativos" | "todos";
};

export type CustomerInput = {
  name: string;
  phone?: string;
  email?: string;
  document?: string;
  notes?: string;
};

export async function listCustomers(filters: CustomerFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  const qs = params.toString();
  const data = await apiRequest<{ customers: Customer[] }>(`/api/customers${qs ? `?${qs}` : ""}`);
  return data.customers;
}

export async function createCustomer(input: CustomerInput) {
  const data = await apiRequest<{ customer: Customer }>("/api/customers", {
    method: "POST",
    body: input,
  });
  return data.customer;
}

export async function updateCustomer(id: string, input: Partial<CustomerInput & { active: boolean }>) {
  const data = await apiRequest<{ customer: Customer }>(`/api/customers/${id}`, {
    method: "PATCH",
    body: input,
  });
  return data.customer;
}

export async function fetchCustomerHistory(id: string) {
  const data = await apiRequest<{ sales: CustomerPurchase[] }>(`/api/customers/${id}/history`);
  return data.sales;
}
