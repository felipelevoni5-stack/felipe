import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { recordAudit } from "../../lib/audit.js";
import type { createCustomerSchema, updateCustomerSchema } from "./customers.schemas.js";
import type { z } from "zod";

type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
type Actor = { userId: string; ipAddress?: string | null };

export async function listCustomers(
  tenantId: string,
  filters: { search?: string; status: "ativos" | "inativos" | "todos" },
) {
  const where: Prisma.CustomerWhereInput = { tenantId };
  if (filters.status === "ativos") where.active = true;
  if (filters.status === "inativos") where.active = false;
  if (filters.search) {
    const term = filters.search;
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { document: { contains: term, mode: "insensitive" } },
    ];
  }
  return prisma.customer.findMany({ where, orderBy: { name: "asc" } });
}

export async function getCustomer(tenantId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, tenantId } });
  if (!customer) {
    throw new HttpError(404, "Cliente não encontrado.");
  }
  return customer;
}

export async function createCustomer(tenantId: string, input: CreateCustomerInput, actor: Actor) {
  const customer = await prisma.customer.create({ data: { tenantId, ...input } });
  await recordAudit({
    tenantId,
    userId: actor.userId,
    action: "CUSTOMER_CREATED",
    entity: "Customer",
    entityId: customer.id,
    ipAddress: actor.ipAddress,
  });
  return customer;
}

export async function updateCustomer(
  tenantId: string,
  customerId: string,
  input: UpdateCustomerInput,
  actor: Actor,
) {
  await getCustomer(tenantId, customerId);
  const updated = await prisma.customer.update({ where: { id: customerId }, data: input });
  await recordAudit({
    tenantId,
    userId: actor.userId,
    action: "CUSTOMER_UPDATED",
    entity: "Customer",
    entityId: updated.id,
    ipAddress: actor.ipAddress,
  });
  return updated;
}

// Histórico de compras do cliente — respeitado por permissão na rota (RBAC).
export async function getCustomerPurchaseHistory(tenantId: string, customerId: string) {
  await getCustomer(tenantId, customerId);
  return prisma.sale.findMany({
    where: { tenantId, customerId, status: "CONCLUIDA" },
    orderBy: { createdAt: "desc" },
    select: { id: true, total: true, createdAt: true, items: { select: { productName: true, quantity: true } } },
  });
}
