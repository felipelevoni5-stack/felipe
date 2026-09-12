export type Role = "ADMIN" | "GERENTE" | "OPERADOR";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string;
  storeId: string | null;
};
