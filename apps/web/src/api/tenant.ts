import { apiRequest } from "./client";

export type TenantInfo = {
  id: string;
  name: string;
  document: string | null;
  allowNegativeStock: boolean;
  operatorMaxDiscountPercent: string;
  createdAt: string;
  stores: { id: string; name: string; active: boolean }[];
};

export type Overview = {
  userCount: number;
  storeCount: number;
  productCount: number;
  lowStockCount: number;
  salesTodayCount: number;
  revenueToday: number;
  cashRegisterOpen: boolean;
};

export type UpdateTenantInput = Partial<{
  name: string;
  document: string;
  allowNegativeStock: boolean;
  operatorMaxDiscountPercent: number;
}>;

export async function fetchTenant() {
  const data = await apiRequest<{ tenant: TenantInfo }>("/api/tenant");
  return data.tenant;
}

export async function updateTenant(input: UpdateTenantInput) {
  const data = await apiRequest<{ tenant: TenantInfo }>("/api/tenant", {
    method: "PATCH",
    body: input,
  });
  return data.tenant;
}

export async function fetchOverview() {
  const data = await apiRequest<{ overview: Overview }>("/api/tenant/overview");
  return data.overview;
}
