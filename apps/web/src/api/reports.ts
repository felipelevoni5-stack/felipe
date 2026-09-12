import { apiRequest } from "./client";
import type { PaymentsReport, SalesSummary, StockReport, TopProduct } from "../types/report";

export type DateRange = { from?: string; to?: string };

function toQuery(range: DateRange): string {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchSalesSummary(range: DateRange) {
  const data = await apiRequest<{ summary: SalesSummary }>(
    `/api/reports/sales-summary${toQuery(range)}`,
  );
  return data.summary;
}

export async function fetchTopProducts(range: DateRange, limit = 10) {
  const params = new URLSearchParams(toQuery(range).replace("?", ""));
  params.set("limit", String(limit));
  const data = await apiRequest<{ products: TopProduct[] }>(`/api/reports/top-products?${params}`);
  return data.products;
}

export async function fetchPaymentsReport(range: DateRange) {
  const data = await apiRequest<{ report: PaymentsReport }>(`/api/reports/payments${toQuery(range)}`);
  return data.report;
}

export async function fetchStockReport() {
  const data = await apiRequest<{ report: StockReport }>("/api/reports/stock");
  return data.report;
}
