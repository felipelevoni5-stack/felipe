import { apiRequest } from "./client";
import type { CashMovementType, CashSession } from "../types/cash";

export async function fetchCurrentSession() {
  const data = await apiRequest<{ session: CashSession | null }>("/api/cash/sessions/current");
  return data.session;
}

export async function fetchSession(id: string) {
  const data = await apiRequest<{ session: CashSession }>(`/api/cash/sessions/${id}`);
  return data.session;
}

export async function openCashSession(openingAmount: number) {
  const data = await apiRequest<{ session: CashSession }>("/api/cash/sessions", {
    method: "POST",
    body: { openingAmount },
  });
  return data.session;
}

export async function addCashMovement(
  sessionId: string,
  input: { type: CashMovementType; amount: number; reason: string },
) {
  const data = await apiRequest<{ movement: unknown }>(`/api/cash/sessions/${sessionId}/movements`, {
    method: "POST",
    body: input,
  });
  return data.movement;
}

export async function closeCashSession(
  sessionId: string,
  input: { countedCash: number; justification?: string },
) {
  const data = await apiRequest<{ session: CashSession }>(`/api/cash/sessions/${sessionId}/close`, {
    method: "POST",
    body: input,
  });
  return data.session;
}
