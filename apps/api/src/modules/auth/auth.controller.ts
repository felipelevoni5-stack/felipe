import type { Request, Response } from "express";
import {
  signupEmpresaSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.schemas.js";
import * as authService from "./auth.service.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../middleware/errorHandler.js";

const REFRESH_COOKIE = "pdv_refresh_token";
// Em produção, frontend e backend ficam em subdomínios diferentes (ex.: *.vercel.app),
// o que o navegador trata como sites diferentes — por isso o cookie precisa de
// SameSite=None (só permitido junto com Secure) para ser enviado nas requisições da
// API feitas pelo frontend. Em desenvolvimento local ambos rodam em localhost com
// portas diferentes mas mesmo site, então Lax (sem exigir HTTPS) já é suficiente.
const cookieSameSite: "lax" | "none" = env.nodeEnv === "production" ? "none" : "lax";
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: cookieSameSite,
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function toUserResponse(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  storeId: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    storeId: user.storeId,
  };
}

export async function signupEmpresaHandler(req: Request, res: Response) {
  const input = signupEmpresaSchema.parse(req.body);
  const { tenant, store, user } = await authService.signupEmpresa({
    ...input,
    ipAddress: req.ip,
  });
  res.status(201).json({
    tenant: { id: tenant.id, name: tenant.name },
    store: { id: store.id, name: store.name },
    user: toUserResponse(user),
  });
}

export async function loginHandler(req: Request, res: Response) {
  const { email, senha } = loginSchema.parse(req.body);
  const { accessToken, refreshToken, user } = await authService.login(email, senha, req.ip);
  res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
  res.json({ accessToken, user: toUserResponse(user) });
}

export async function refreshHandler(req: Request, res: Response) {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  if (!rawToken) {
    throw new HttpError(401, "Sessão inválida. Faça login novamente.");
  }
  const { accessToken, refreshToken, user } = await authService.refreshSession(rawToken);
  res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS);
  res.json({ accessToken, user: toUserResponse(user) });
}

export async function logoutHandler(req: Request, res: Response) {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  if (rawToken) {
    await authService.logout(rawToken);
  }
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.status(204).send();
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  const { email } = forgotPasswordSchema.parse(req.body);
  const { devResetLink } = await authService.forgotPassword(email);
  const body: { message: string; devResetLink?: string } = {
    message:
      "Não há serviço de e-mail configurado nesta versão. Se o e-mail existir, um link de redefinição foi gerado.",
  };
  if (env.nodeEnv !== "production" && devResetLink) {
    body.devResetLink = devResetLink;
  }
  res.json(body);
}

export async function resetPasswordHandler(req: Request, res: Response) {
  const { token, senha } = resetPasswordSchema.parse(req.body);
  await authService.resetPassword(token, senha);
  res.json({ message: "Senha redefinida com sucesso." });
}
