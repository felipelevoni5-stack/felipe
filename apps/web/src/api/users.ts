import { apiRequest } from "./client";
import type { Role } from "../types/auth";

export type TenantUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  storeId: string | null;
  createdAt: string;
};

export async function listUsers() {
  const data = await apiRequest<{ users: TenantUser[] }>("/api/users");
  return data.users;
}

export async function createUser(input: {
  name: string;
  email: string;
  senha: string;
  role: Role;
}) {
  const data = await apiRequest<{ user: TenantUser }>("/api/users", {
    method: "POST",
    body: input,
  });
  return data.user;
}

export async function updateUser(
  id: string,
  input: Partial<{ name: string; role: Role; active: boolean }>,
) {
  const data = await apiRequest<{ user: TenantUser }>(`/api/users/${id}`, {
    method: "PATCH",
    body: input,
  });
  return data.user;
}
