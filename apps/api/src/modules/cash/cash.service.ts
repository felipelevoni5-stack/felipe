import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { recordAudit } from "../../lib/audit.js";

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

type Actor = {
  userId: string;
  role: "ADMIN" | "GERENTE" | "OPERADOR";
  storeId: string | null;
  ipAddress?: string | null;
};

const sessionInclude = {
  cashRegister: true,
  openedBy: { select: { id: true, name: true } },
  closedBy: { select: { id: true, name: true } },
  movements: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.CashSessionInclude;

// Resolve a loja do usuário; se ele não tiver uma loja definida, usa a primeira da
// empresa (cenário comum de empresa com uma única loja).
export async function resolveStoreId(tenantId: string, actorStoreId: string | null) {
  if (actorStoreId) return actorStoreId;
  const store = await prisma.store.findFirst({ where: { tenantId }, orderBy: { createdAt: "asc" } });
  if (!store) {
    throw new HttpError(400, "Nenhuma loja cadastrada para esta empresa.");
  }
  return store.id;
}

async function getOrCreateDefaultCashRegister(tenantId: string, storeId: string) {
  const existing = await prisma.cashRegister.findFirst({
    where: { tenantId, storeId, active: true },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return prisma.cashRegister.create({ data: { tenantId, storeId, name: "Caixa 1" } });
}

export async function getCurrentSession(tenantId: string, actorStoreId: string | null) {
  const storeId = await resolveStoreId(tenantId, actorStoreId);
  const session = await prisma.cashSession.findFirst({
    where: { tenantId, storeId, status: "ABERTO" },
    include: sessionInclude,
  });
  return session;
}

export async function openSession(tenantId: string, actor: Actor, openingAmount: number) {
  const storeId = await resolveStoreId(tenantId, actor.storeId);
  const register = await getOrCreateDefaultCashRegister(tenantId, storeId);

  const existingOpen = await prisma.cashSession.findFirst({
    where: { cashRegisterId: register.id, status: "ABERTO" },
  });
  if (existingOpen) {
    throw new HttpError(409, "Já existe um caixa aberto para esta loja.");
  }

  const session = await prisma.cashSession.create({
    data: {
      tenantId,
      storeId,
      cashRegisterId: register.id,
      openingAmount,
      openedByUserId: actor.userId,
    },
    include: sessionInclude,
  });

  await recordAudit({
    tenantId,
    userId: actor.userId,
    action: "CASH_SESSION_OPENED",
    entity: "CashSession",
    entityId: session.id,
    metadata: { openingAmount },
    ipAddress: actor.ipAddress,
  });

  return session;
}

async function getOpenSessionOrThrow(tenantId: string, sessionId: string) {
  const session = await prisma.cashSession.findFirst({ where: { id: sessionId, tenantId } });
  if (!session) {
    throw new HttpError(404, "Sessão de caixa não encontrada.");
  }
  if (session.status !== "ABERTO") {
    throw new HttpError(400, "Este caixa já está fechado.");
  }
  return session;
}

function assertCanOperateSession(
  session: { openedByUserId: string },
  actor: Actor,
) {
  const isOwner = session.openedByUserId === actor.userId;
  const isSupervisor = actor.role === "ADMIN" || actor.role === "GERENTE";
  if (!isOwner && !isSupervisor) {
    throw new HttpError(403, "Você só pode operar o caixa que você mesmo abriu.");
  }
}

export async function addMovement(
  tenantId: string,
  sessionId: string,
  actor: Actor,
  input: { type: "SANGRIA" | "SUPRIMENTO"; amount: number; reason: string },
) {
  const session = await getOpenSessionOrThrow(tenantId, sessionId);
  assertCanOperateSession(session, actor);

  const movement = await prisma.cashMovement.create({
    data: {
      tenantId,
      cashSessionId: session.id,
      type: input.type,
      amount: input.amount,
      reason: input.reason,
      userId: actor.userId,
    },
  });

  await recordAudit({
    tenantId,
    userId: actor.userId,
    action: input.type === "SANGRIA" ? "CASH_WITHDRAWAL" : "CASH_SUPPLY",
    entity: "CashSession",
    entityId: session.id,
    metadata: { amount: input.amount, reason: input.reason },
    ipAddress: actor.ipAddress,
  });

  return movement;
}

export async function closeSession(
  tenantId: string,
  sessionId: string,
  actor: Actor,
  input: { countedCash: number; justification?: string },
) {
  const session = await getOpenSessionOrThrow(tenantId, sessionId);
  assertCanOperateSession(session, actor);

  const [sales, movements] = await Promise.all([
    prisma.sale.findMany({
      where: { tenantId, cashSessionId: session.id },
      include: { payments: true },
    }),
    prisma.cashMovement.findMany({ where: { cashSessionId: session.id } }),
  ]);

  let totalDinheiro = D(0);
  let totalPix = D(0);
  let totalDebito = D(0);
  let totalCredito = D(0);
  let totalOutro = D(0);
  let totalCancelado = D(0);

  for (const sale of sales) {
    if (sale.status === "CANCELADA") {
      totalCancelado = totalCancelado.plus(sale.total);
      continue;
    }
    for (const payment of sale.payments) {
      if (payment.method === "DINHEIRO") totalDinheiro = totalDinheiro.plus(payment.amount);
      else if (payment.method === "PIX") totalPix = totalPix.plus(payment.amount);
      else if (payment.method === "DEBITO") totalDebito = totalDebito.plus(payment.amount);
      else if (payment.method === "CREDITO") totalCredito = totalCredito.plus(payment.amount);
      else totalOutro = totalOutro.plus(payment.amount);
    }
  }
  const totalTroco = sales
    .filter((s) => s.status === "CONCLUIDA")
    .reduce((acc, s) => acc.plus(s.changeAmount), D(0));

  const totalSangrias = movements
    .filter((m) => m.type === "SANGRIA")
    .reduce((acc, m) => acc.plus(m.amount), D(0));
  const totalSuprimentos = movements
    .filter((m) => m.type === "SUPRIMENTO")
    .reduce((acc, m) => acc.plus(m.amount), D(0));

  const expectedCash = session.openingAmount
    .plus(totalDinheiro)
    .minus(totalTroco)
    .plus(totalSuprimentos)
    .minus(totalSangrias);
  const countedCash = D(input.countedCash);
  const difference = countedCash.minus(expectedCash);

  if (!difference.equals(0) && !input.justification) {
    throw new HttpError(
      400,
      `Há uma diferença de ${difference.toString()} entre o valor esperado e o valor contado. Informe uma justificativa.`,
    );
  }

  const closed = await prisma.cashSession.update({
    where: { id: session.id },
    data: {
      status: "FECHADO",
      closedByUserId: actor.userId,
      closedAt: new Date(),
      countedCash,
      expectedCash,
      difference,
      totalDinheiro,
      totalPix,
      totalDebito,
      totalCredito,
      totalOutro,
      totalSangrias,
      totalSuprimentos,
      totalCancelado,
      closingJustification: input.justification,
    },
    include: sessionInclude,
  });

  await recordAudit({
    tenantId,
    userId: actor.userId,
    action: "CASH_SESSION_CLOSED",
    entity: "CashSession",
    entityId: session.id,
    metadata: {
      expectedCash: expectedCash.toString(),
      countedCash: countedCash.toString(),
      difference: difference.toString(),
    },
    ipAddress: actor.ipAddress,
  });

  return closed;
}

export async function getSession(tenantId: string, sessionId: string) {
  const session = await prisma.cashSession.findFirst({
    where: { id: sessionId, tenantId },
    include: sessionInclude,
  });
  if (!session) {
    throw new HttpError(404, "Sessão de caixa não encontrada.");
  }
  return session;
}

// Usado pelo módulo de vendas: toda venda precisa de um caixa aberto na loja do operador.
export async function requireOpenSessionForSale(tenantId: string, actorStoreId: string | null) {
  const session = await getCurrentSession(tenantId, actorStoreId);
  if (!session) {
    throw new HttpError(
      400,
      "Não há caixa aberto. Abra o caixa antes de iniciar vendas.",
    );
  }
  return session;
}
