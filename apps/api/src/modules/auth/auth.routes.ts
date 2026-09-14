import { Router, type Request, type RequestHandler } from "express";
import { createRequire } from "node:module";
import { asyncHandler } from "../../lib/asyncHandler.js";
import * as authController from "./auth.controller.js";

// Ver comentário equivalente em app.ts: o build da Vercel não trata esse import default
// como chamável, mesmo com esModuleInterop ativado.
const require = createRequire(import.meta.url);
const rateLimit = require("express-rate-limit") as (options: {
  windowMs: number;
  limit: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  skip: () => boolean;
  keyGenerator?: (req: Request) => string;
  message: unknown;
}) => RequestHandler;

// Testes automatizados fazem muito mais cadastros/logins por hora do que qualquer
// uso real, e todos a partir do mesmo IP — sem isso, a suíte de testes esgota os
// limites e começa a falhar por causa do próprio rate limiter, não por bugs reais.
const skipInTests = () => process.env.NODE_ENV === "test";

// Chave = IP + e-mail tentado, não só IP: várias contas por trás do mesmo IP/rede
// (funcionários da mesma loja) não devem travar umas às outras por força bruta em uma só conta.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email ?? "").toLowerCase()}`,
  message: { error: "Muitas tentativas de login. Tente novamente em alguns minutos." },
});

// Protege o formulário público de cadastro contra criação em massa de empresas.
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: "Muitas tentativas de cadastro. Tente novamente mais tarde." },
});

// Mesmo não revelando se o e-mail existe, limita a geração de tokens de redefinição
// e o número de tentativas de uso de um token por IP+e-mail.
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email ?? "").toLowerCase()}`,
  message: { error: "Muitas tentativas. Tente novamente em alguns minutos." },
});

export const authRouter = Router();

authRouter.post(
  "/signup-empresa",
  signupLimiter,
  asyncHandler(authController.signupEmpresaHandler),
);
authRouter.post("/login", loginLimiter, asyncHandler(authController.loginHandler));
authRouter.post("/refresh", asyncHandler(authController.refreshHandler));
authRouter.post("/logout", asyncHandler(authController.logoutHandler));
authRouter.post(
  "/forgot-password",
  passwordResetLimiter,
  asyncHandler(authController.forgotPasswordHandler),
);
authRouter.post(
  "/reset-password",
  passwordResetLimiter,
  asyncHandler(authController.resetPasswordHandler),
);
