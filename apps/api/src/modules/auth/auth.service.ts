import { prisma } from "../../lib/prisma.js";
import { hashPassword, comparePassword } from "../../lib/password.js";
import { signAccessToken } from "../../lib/jwt.js";
import { generateOpaqueToken, hashOpaqueToken } from "../../lib/opaqueToken.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { recordAudit } from "../../lib/audit.js";

const REFRESH_TOKEN_TTL_DAYS = 7;
const RESET_TOKEN_TTL_MINUTES = 30;

type SignupInput = {
  empresaNome: string;
  lojaNome?: string;
  adminNome: string;
  email: string;
  senha: string;
  ipAddress?: string | null;
};

export async function signupEmpresa(input: SignupInput) {
  const existing = await prisma.user.findFirst({ where: { email: input.email } });
  if (existing) {
    throw new HttpError(409, "Já existe uma conta com este e-mail.");
  }

  const passwordHash = await hashPassword(input.senha);

  const result = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: input.empresaNome },
    });
    const store = await tx.store.create({
      data: { tenantId: tenant.id, name: input.lojaNome?.trim() || "Loja principal" },
    });
    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        storeId: store.id,
        name: input.adminNome,
        email: input.email,
        passwordHash,
        role: "ADMIN",
      },
    });
    await tx.cashRegister.create({
      data: { tenantId: tenant.id, storeId: store.id, name: "Caixa 1" },
    });
    return { tenant, store, user };
  });

  await recordAudit({
    tenantId: result.tenant.id,
    userId: result.user.id,
    action: "SIGNUP_EMPRESA",
    entity: "Tenant",
    entityId: result.tenant.id,
    ipAddress: input.ipAddress,
  });

  return result;
}

export async function login(email: string, senha: string, ipAddress?: string | null) {
  const user = await prisma.user.findFirst({ where: { email } });

  if (!user || !user.active) {
    throw new HttpError(401, "E-mail ou senha inválidos.");
  }

  const valid = await comparePassword(senha, user.passwordHash);
  if (!valid) {
    await recordAudit({
      tenantId: user.tenantId,
      userId: user.id,
      action: "LOGIN_FAILED",
      entity: "User",
      entityId: user.id,
      ipAddress,
    });
    throw new HttpError(401, "E-mail ou senha inválidos.");
  }

  const accessToken = signAccessToken({
    sub: user.id,
    tenantId: user.tenantId,
    storeId: user.storeId,
    role: user.role,
  });

  const { raw, hash } = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hash, expiresAt },
  });

  await recordAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "LOGIN_SUCCESS",
    entity: "User",
    entityId: user.id,
    ipAddress,
  });

  return { accessToken, refreshToken: raw, user };
}

export async function refreshSession(rawToken: string) {
  const tokenHash = hashOpaqueToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new HttpError(401, "Sessão inválida. Faça login novamente.");
  }

  // Rotaciona o refresh token: revoga o antigo e emite um novo.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const { raw, hash } = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { userId: stored.userId, tokenHash: hash, expiresAt },
  });

  const accessToken = signAccessToken({
    sub: stored.user.id,
    tenantId: stored.user.tenantId,
    storeId: stored.user.storeId,
    role: stored.user.role,
  });

  return { accessToken, refreshToken: raw, user: stored.user };
}

export async function logout(rawToken: string) {
  const tokenHash = hashOpaqueToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findFirst({ where: { email, active: true } });
  // Não revela se o e-mail existe ou não (evita enumeração de contas).
  if (!user) {
    return { devResetLink: null as string | null };
  }

  const { raw, hash } = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tenantId: user.tenantId, tokenHash: hash, expiresAt },
  });

  await recordAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "PASSWORD_RESET_REQUESTED",
    entity: "User",
    entityId: user.id,
  });

  // Não há serviço de e-mail configurado nesta etapa. Em desenvolvimento, devolvemos
  // o link para o fluxo poder ser testado; em produção isso deve virar um envio real.
  const devResetLink = `${process.env.WEB_ORIGIN ?? "http://localhost:5173"}/redefinir-senha?token=${raw}`;
  return { devResetLink };
}

export async function resetPassword(rawToken: string, novaSenha: string) {
  const tokenHash = hashOpaqueToken(rawToken);
  const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    throw new HttpError(400, "Link de redefinição inválido ou expirado.");
  }

  const passwordHash = await hashPassword(novaSenha);

  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await recordAudit({
    tenantId: stored.tenantId,
    userId: stored.userId,
    action: "PASSWORD_RESET_COMPLETED",
    entity: "User",
    entityId: stored.userId,
  });
}
