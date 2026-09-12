import { apiRequest, setAccessToken } from "./client";
import type { AuthUser } from "../types/auth";

export async function signupEmpresa(input: {
  empresaNome: string;
  lojaNome?: string;
  adminNome: string;
  email: string;
  senha: string;
}) {
  return apiRequest<{ tenant: { id: string; name: string }; user: AuthUser }>(
    "/api/auth/signup-empresa",
    { method: "POST", body: input },
  );
}

export async function login(email: string, senha: string) {
  const data = await apiRequest<{ accessToken: string; user: AuthUser }>("/api/auth/login", {
    method: "POST",
    body: { email, senha },
  });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function logout() {
  await apiRequest("/api/auth/logout", { method: "POST" });
  setAccessToken(null);
}

export async function fetchMe() {
  const data = await apiRequest<{ user: AuthUser }>("/api/me");
  return data.user;
}

export async function forgotPassword(email: string) {
  return apiRequest<{ message: string; devResetLink?: string }>("/api/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export async function resetPassword(token: string, senha: string) {
  return apiRequest<{ message: string }>("/api/auth/reset-password", {
    method: "POST",
    body: { token, senha },
  });
}
