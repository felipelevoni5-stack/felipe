import { apiRequest } from "./client";
import type { AuditLog } from "../types/auditLog";

export type AuditLogFilters = {
  from?: string;
  to?: string;
  action?: string;
  entity?: string;
  limit?: number;
};

export async function listAuditLogs(filters: AuditLogFilters = {}) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.action) params.set("action", filters.action);
  if (filters.entity) params.set("entity", filters.entity);
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  const data = await apiRequest<{ logs: AuditLog[] }>(`/api/audit-logs${qs ? `?${qs}` : ""}`);
  return data.logs;
}
