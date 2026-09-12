import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export async function listAuditLogs(
  tenantId: string,
  filters: {
    from?: Date;
    to?: Date;
    userId?: string;
    action?: string;
    entity?: string;
    limit: number;
  },
) {
  const where: Prisma.AuditLogWhereInput = { tenantId };
  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = filters.from;
    if (filters.to) where.createdAt.lte = filters.to;
  }
  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.entity) where.entity = filters.entity;

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters.limit,
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}
