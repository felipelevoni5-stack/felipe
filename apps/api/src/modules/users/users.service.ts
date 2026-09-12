import { prisma } from "../../lib/prisma.js";
import { hashPassword } from "../../lib/password.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { recordAudit } from "../../lib/audit.js";

type CreateUserInput = {
  name: string;
  email: string;
  senha: string;
  role: "ADMIN" | "GERENTE" | "OPERADOR";
  storeId?: string;
};

type UpdateUserInput = {
  name?: string;
  role?: "ADMIN" | "GERENTE" | "OPERADOR";
  active?: boolean;
  storeId?: string | null;
};

export async function listUsers(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      storeId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createUser(
  tenantId: string,
  input: CreateUserInput,
  actor: { userId: string; ipAddress?: string | null },
) {
  // E-mail é único globalmente (não só nesta empresa) — o login resolve o usuário
  // e a empresa a partir do e-mail sozinho, então isso precisa valer para toda a
  // plataforma, não apenas dentro do tenant atual.
  const existing = await prisma.user.findFirst({ where: { email: input.email } });
  if (existing) {
    throw new HttpError(409, "Já existe uma conta com este e-mail.");
  }

  if (input.storeId) {
    const store = await prisma.store.findFirst({ where: { id: input.storeId, tenantId } });
    if (!store) {
      throw new HttpError(400, "Loja informada não pertence a esta empresa.");
    }
  }

  const passwordHash = await hashPassword(input.senha);
  const user = await prisma.user.create({
    data: {
      tenantId,
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      storeId: input.storeId ?? null,
    },
  });

  await recordAudit({
    tenantId,
    userId: actor.userId,
    action: "USER_CREATED",
    entity: "User",
    entityId: user.id,
    metadata: { role: user.role },
    ipAddress: actor.ipAddress,
  });

  return user;
}

// Busca o usuário SEMPRE filtrando por tenantId — impede que alguém acesse/edite um
// usuário de outra empresa manipulando o :id na URL.
async function findUserOrThrow(tenantId: string, userId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
  if (!user) {
    throw new HttpError(404, "Usuário não encontrado.");
  }
  return user;
}

export async function updateUser(
  tenantId: string,
  userId: string,
  input: UpdateUserInput,
  actor: { userId: string; ipAddress?: string | null },
) {
  const target = await findUserOrThrow(tenantId, userId);

  // Nunca deixar a empresa sem nenhum ADMIN ativo — nem desativando o último admin,
  // nem rebaixando o cargo dele para GERENTE/OPERADOR.
  const willStopBeingActiveAdmin =
    target.role === "ADMIN" &&
    target.active &&
    ((input.active === false) || (input.role !== undefined && input.role !== "ADMIN"));

  if (willStopBeingActiveAdmin) {
    const otherActiveAdmins = await prisma.user.count({
      where: { tenantId, role: "ADMIN", active: true, id: { not: userId } },
    });
    if (otherActiveAdmins === 0) {
      throw new HttpError(400, "A empresa precisa de pelo menos um administrador ativo.");
    }
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: {
      name: input.name,
      role: input.role,
      active: input.active,
      storeId: input.storeId,
    },
  });

  await recordAudit({
    tenantId,
    userId: actor.userId,
    action: "USER_UPDATED",
    entity: "User",
    entityId: updated.id,
    metadata: input,
    ipAddress: actor.ipAddress,
  });

  return updated;
}
